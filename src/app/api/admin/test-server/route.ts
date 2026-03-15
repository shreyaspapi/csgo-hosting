import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";
import { provisionServer, deallocateServer, deleteServer, listServers } from "@/lib/azure-server";
import prisma from "@/lib/prisma";

/**
 * POST /api/admin/test-server
 * Provisions a test game server VM in a given region.
 * Body: { "region": "centralindia", "action": "provision" | "deallocate" | "delete" | "status" }
 *
 * The VM will be created from the golden image, cloud-init will write a
 * dummy match config, start CS:GO, and call back to /api/servers/ready.
 *
 * Admin-only endpoint.
 */
export async function POST(req: NextRequest) {
  // Allow auth via either admin session OR CRON_SECRET bearer token
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  const isCronAuth = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isCronAuth) {
    const session = await getServerSession(authOptions);
    const forbidden = requireAdmin(session);
    if (forbidden) return forbidden;
  }

  const { region = "centralindia", action = "provision", serverId } = await req.json();

  try {
    switch (action) {
      case "provision": {
        // Create a dummy match to associate with the server
        const testMatch = await prisma.match.create({
          data: {
            status: "CONFIGURING",
            region,
            map: "de_dust2",
          },
        });

        console.log(`[test-server] Provisioning test server in ${region} for match ${testMatch.id}`);

        const result = await provisionServer(testMatch.id, region);

        return NextResponse.json({
          success: true,
          message: `Server provisioning started in ${region}. The VM will call /api/servers/ready when CS:GO is up (~3-5 min for new VM, ~1-2 min for restarted VM).`,
          serverId: result.serverId,
          ip: result.ip,
          port: result.port,
          matchId: testMatch.id,
          connectString: `steam://connect/${result.ip}:${result.port}`,
        });
      }

      case "deallocate": {
        if (!serverId) {
          return NextResponse.json({ error: "serverId required" }, { status: 400 });
        }
        await deallocateServer(serverId);
        return NextResponse.json({ success: true, message: "Server deallocated" });
      }

      case "delete": {
        if (!serverId) {
          return NextResponse.json({ error: "serverId required" }, { status: 400 });
        }
        await deleteServer(serverId);
        return NextResponse.json({ success: true, message: "Server deleted" });
      }

      case "status": {
        const servers = await listServers();
        return NextResponse.json({ servers });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action. Use: provision, deallocate, delete, status" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[test-server] Error:", error);
    return NextResponse.json(
      {
        error: "Server operation failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
