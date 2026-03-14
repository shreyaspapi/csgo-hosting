import { ComputeManagementClient } from "@azure/arm-compute";
import { NetworkManagementClient } from "@azure/arm-network";
import { DefaultAzureCredential, ClientSecretCredential } from "@azure/identity";
import prisma from "@/lib/prisma";
import { ServerStatus } from "@prisma/client";

/**
 * Azure VM provisioning for CS:GO game servers
 *
 * Strategy:
 * 1. Maintain a pool of pre-built VM images with CS:GO + get5 installed
 * 2. When a match needs a server:
 *    a. Check for STOPPED VMs in the pool → start one (fastest, ~1-2 min)
 *    b. If none available, create a new VM from the golden image (~3-5 min)
 * 3. After match ends → stop the VM (deallocate to save cost)
 * 4. Periodically clean up old stopped VMs
 */

function getAzureCredential() {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  if (tenantId && clientId && clientSecret) {
    return new ClientSecretCredential(tenantId, clientId, clientSecret);
  }

  // Fallback to DefaultAzureCredential (works with managed identity, CLI, etc.)
  return new DefaultAzureCredential();
}

function getComputeClient() {
  const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID!;
  return new ComputeManagementClient(getAzureCredential(), subscriptionId);
}

function getNetworkClient() {
  const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID!;
  return new NetworkManagementClient(getAzureCredential(), subscriptionId);
}

const RESOURCE_GROUP = process.env.AZURE_RESOURCE_GROUP || "csgo-servers";
const VM_SIZE = "Standard_D4s_v5"; // 4 vCPU, 16GB RAM
const SERVER_PORT = 27015;

/**
 * Provision a game server for a match.
 * First tries to start a stopped VM, then creates a new one.
 */
export async function provisionServer(
  matchId: string,
  region: string
): Promise<{ serverId: string; ip: string; port: number }> {
  // Step 1: Try to find and start a STOPPED server in the same region
  const stoppedServer = await prisma.gameServer.findFirst({
    where: {
      status: ServerStatus.STOPPED,
      region,
    },
    orderBy: { lastUsedAt: "asc" }, // Use oldest first
  });

  if (stoppedServer) {
    return await startExistingServer(stoppedServer.id, matchId);
  }

  // Step 2: Create a new VM
  return await createNewServer(matchId, region);
}

/**
 * Start a stopped VM and assign it to a match
 */
async function startExistingServer(
  serverId: string,
  matchId: string
): Promise<{ serverId: string; ip: string; port: number }> {
  const computeClient = getComputeClient();

  // Mark server as starting
  const server = await prisma.gameServer.update({
    where: { id: serverId },
    data: {
      status: ServerStatus.STARTING,
      currentMatchId: matchId,
    },
  });

  try {
    // Start the VM
    await computeClient.virtualMachines.beginStartAndWait(
      RESOURCE_GROUP,
      server.azureVmName!
    );

    // Get the public IP
    const ip = await getVmPublicIp(server.azureVmName!);

    // Update server record
    await prisma.gameServer.update({
      where: { id: serverId },
      data: {
        status: ServerStatus.AVAILABLE,
        ip,
        lastUsedAt: new Date(),
      },
    });

    return { serverId, ip: ip!, port: server.port };
  } catch (error) {
    await prisma.gameServer.update({
      where: { id: serverId },
      data: { status: ServerStatus.ERROR },
    });
    throw error;
  }
}

/**
 * Create a brand new VM from the golden image
 */
async function createNewServer(
  matchId: string,
  region: string
): Promise<{ serverId: string; ip: string; port: number }> {
  const computeClient = getComputeClient();
  const networkClient = getNetworkClient();

  const vmName = `csgo-${region}-${Date.now()}`;
  const rconPassword =
    process.env.DEFAULT_RCON_PASSWORD || generatePassword();

  // Create server record first
  const server = await prisma.gameServer.create({
    data: {
      name: vmName,
      region,
      azureVmName: vmName,
      resourceGroup: RESOURCE_GROUP,
      port: SERVER_PORT,
      rconPassword,
      status: ServerStatus.PROVISIONING,
      currentMatchId: matchId,
    },
  });

  try {
    // Create public IP address
    const publicIpResult = await networkClient.publicIPAddresses.beginCreateOrUpdateAndWait(
      RESOURCE_GROUP,
      `${vmName}-ip`,
      {
        location: region,
        publicIPAllocationMethod: "Static",
        sku: { name: "Standard" },
      }
    );

    // Create network interface
    // NOTE: You must have a pre-existing VNet and Subnet in the resource group
    // The subnet ID should be configured in env or fetched dynamically
    const subnetId = await getSubnetId(region);

    const nicResult = await networkClient.networkInterfaces.beginCreateOrUpdateAndWait(
      RESOURCE_GROUP,
      `${vmName}-nic`,
      {
        location: region,
        ipConfigurations: [
          {
            name: "ipconfig1",
            subnet: { id: subnetId },
            publicIPAddress: { id: publicIpResult.id },
          },
        ],
        networkSecurityGroup: {
          id: await getNsgId(region), // NSG with CS:GO ports open
        },
      }
    );

    // Create VM from golden image
    const imageId = process.env.AZURE_VM_IMAGE_ID!;

    await computeClient.virtualMachines.beginCreateOrUpdateAndWait(
      RESOURCE_GROUP,
      vmName,
      {
        location: region,
        hardwareProfile: { vmSize: VM_SIZE },
        storageProfile: {
          imageReference: { id: imageId },
          osDisk: {
            createOption: "FromImage",
            managedDisk: { storageAccountType: "Premium_LRS" },
          },
        },
        osProfile: {
          computerName: vmName,
          adminUsername: "csgo",
          customData: Buffer.from(
            generateStartupScript(rconPassword, matchId)
          ).toString("base64"),
        },
        networkProfile: {
          networkInterfaces: [{ id: nicResult.id }],
        },
      }
    );

    // Get public IP
    const ip = publicIpResult.ipAddress!;

    // Update server record
    const azureVmId = `/subscriptions/${process.env.AZURE_SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.Compute/virtualMachines/${vmName}`;
    await prisma.gameServer.update({
      where: { id: server.id },
      data: {
        status: ServerStatus.STARTING,
        azureVmId,
        ip,
        lastUsedAt: new Date(),
      },
    });

    // Wait for the CS:GO server to start (poll status)
    // The startup script will update the server status via webhook
    return { serverId: server.id, ip, port: SERVER_PORT };
  } catch (error) {
    console.error("Failed to create VM:", error);
    await prisma.gameServer.update({
      where: { id: server.id },
      data: { status: ServerStatus.ERROR },
    });
    throw error;
  }
}

/**
 * Stop (deallocate) a VM after match ends
 */
export async function deallocateServer(serverId: string): Promise<void> {
  const computeClient = getComputeClient();

  const server = await prisma.gameServer.findUnique({
    where: { id: serverId },
  });

  if (!server?.azureVmName) return;

  try {
    await computeClient.virtualMachines.beginDeallocateAndWait(
      RESOURCE_GROUP,
      server.azureVmName
    );

    await prisma.gameServer.update({
      where: { id: serverId },
      data: {
        status: ServerStatus.STOPPED,
        currentMatchId: null,
      },
    });
  } catch (error) {
    console.error("Failed to deallocate VM:", error);
  }
}

/**
 * Delete a VM and all associated resources
 */
export async function deleteServer(serverId: string): Promise<void> {
  const computeClient = getComputeClient();
  const networkClient = getNetworkClient();

  const server = await prisma.gameServer.findUnique({
    where: { id: serverId },
  });

  if (!server?.azureVmName) return;

  const vmName = server.azureVmName;

  try {
    // Delete VM
    await computeClient.virtualMachines.beginDeleteAndWait(
      RESOURCE_GROUP,
      vmName
    );

    // Delete NIC
    await networkClient.networkInterfaces
      .beginDeleteAndWait(RESOURCE_GROUP, `${vmName}-nic`)
      .catch(() => {});

    // Delete Public IP
    await networkClient.publicIPAddresses
      .beginDeleteAndWait(RESOURCE_GROUP, `${vmName}-ip`)
      .catch(() => {});

    // Delete server record
    await prisma.gameServer.delete({ where: { id: serverId } });
  } catch (error) {
    console.error("Failed to delete VM:", error);
  }
}

/**
 * Get public IP of a VM
 */
async function getVmPublicIp(vmName: string): Promise<string | null> {
  const networkClient = getNetworkClient();

  try {
    const ip = await networkClient.publicIPAddresses.get(
      RESOURCE_GROUP,
      `${vmName}-ip`
    );
    return ip.ipAddress || null;
  } catch {
    return null;
  }
}

/**
 * Get subnet ID for a region (assumes pre-existing VNet)
 */
async function getSubnetId(region: string): Promise<string> {
  const networkClient = getNetworkClient();
  const vnetName = `csgo-vnet-${region}`;

  const subnets = networkClient.subnets.list(RESOURCE_GROUP, vnetName);
  for await (const subnet of subnets) {
    return subnet.id!;
  }

  throw new Error(
    `No subnet found in VNet ${vnetName}. Please create VNet and subnet first.`
  );
}

/**
 * Get NSG ID for a region
 */
async function getNsgId(region: string): Promise<string> {
  const networkClient = getNetworkClient();
  const nsgName = `csgo-nsg-${region}`;

  const nsg = await networkClient.networkSecurityGroups.get(
    RESOURCE_GROUP,
    nsgName
  );
  return nsg.id!;
}

/**
 * Generate startup script for the VM
 * This script starts the CS:GO server with proper configuration
 */
function generateStartupScript(
  rconPassword: string,
  matchId: string
): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://fluidrush.com";

  return `#!/bin/bash
# CS:GO Server Startup Script
set -e

# Update RCON password
echo 'rcon_password "${rconPassword}"' > /home/csgo/csgo-server/csgo/cfg/rcon.cfg

# Configure get5 webhook
echo 'get5_remote_log_url "${appUrl}/api/get5/webhook"' > /home/csgo/csgo-server/csgo/cfg/get5_webhook.cfg

# Start CS:GO server
cd /home/csgo/csgo-server
screen -dmS csgo ./srcds_run -game csgo -console -usercon +game_type 0 +game_mode 1 +sv_setsteamaccount "" +mapgroup mg_active +map de_dust2 -port ${SERVER_PORT} +exec rcon.cfg +exec get5_webhook.cfg

# Notify the web app that the server is ready
sleep 30
curl -X POST "${appUrl}/api/servers/ready" \\
  -H "Content-Type: application/json" \\
  -d '{"matchId": "${matchId}", "rconPassword": "${rconPassword}"}'
`;
}

/**
 * Generate a random password
 */
function generatePassword(length: number = 16): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Get all servers and their statuses
 */
export async function listServers() {
  return prisma.gameServer.findMany({
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Cleanup: delete old stopped VMs (older than 1 hour)
 */
export async function cleanupOldServers(): Promise<number> {
  const cutoff = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

  const oldServers = await prisma.gameServer.findMany({
    where: {
      status: ServerStatus.STOPPED,
      lastUsedAt: { lt: cutoff },
    },
  });

  let deleted = 0;
  for (const server of oldServers) {
    try {
      await deleteServer(server.id);
      deleted++;
    } catch (e) {
      console.error(`Failed to cleanup server ${server.id}:`, e);
    }
  }

  return deleted;
}
