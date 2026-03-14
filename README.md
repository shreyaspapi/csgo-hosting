# FluidRush - CS:GO 5v5 Matchmaking

A competitive CS:GO 5v5 matchmaking platform (like FaceIT). Players sign in with Steam, queue up for matches, and play on auto-provisioned dedicated servers with ELO rankings.

**Live at:** [https://fluidrush.com](https://fluidrush.com)

## Tech Stack

- **Frontend/Backend:** Next.js 14 (App Router, TypeScript)
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** Steam OpenID 2.0 via NextAuth.js
- **Game Servers:** CS:GO Dedicated Server (srcds) + get5 plugin
- **Server Provisioning:** Azure VMs (dynamic, on-demand)
- **Styling:** Tailwind CSS

## Features (MVP - Implemented)

- [x] Steam OpenID sign-in (no registration needed)
- [x] Solo queue matchmaking (10 players = 1 match)
- [x] 30-second ready check with accept/decline
- [x] ELO-based team balancing (snake draft algorithm)
- [x] ELO rating system with win/loss tracking
- [x] Leaderboard (ranked by ELO)
- [x] Player dashboard with match history
- [x] Match page with live status, scoreboard, connect button
- [x] Dynamic Azure VM provisioning for game servers
- [x] RCON integration for server configuration
- [x] get5 plugin integration (match management, stats webhook)
- [x] Region selector (Mumbai, Singapore, EU, US East)
- [x] Auto server deallocation after match ends

## Features (Planned / Post-MVP)

- [ ] **Team Queue** - Pre-made teams of 5 queue against each other
- [ ] **Captain Draft** - Top 2 ELO players are captains, take turns picking
- [ ] **Map Voting** - Players vote on map before match starts
- [ ] **Detailed Stats** - Per-match K/D/A, headshot %, ADR, HLTV rating
- [ ] **Discord Bot** - Match notifications, queue status, results in Discord
- [ ] **Anti-Cheat Check** - VAC ban check on signup, game hours verification
- [ ] **Admin Panel** - Ban players, force-end matches, manage servers
- [ ] **Chat System** - In-queue lobby chat
- [ ] **Seasons / Ranking Resets** - Monthly/seasonal ELO resets with rewards
- [ ] **Player Profiles** - Public profiles with detailed stats and graphs
- [ ] **Match Demos** - Auto-upload match demo files
- [ ] **Knife Round** - Side selection via knife round (get5 built-in)
- [ ] **Overtime** - MR3 overtime for tied matches
- [ ] **Report System** - Report toxic/cheating players
- [ ] **Ringer System** - Replace disconnected players mid-match
- [ ] **Socket.io Real-time** - Replace polling with WebSocket for instant updates
- [ ] **Multiple Server Instances Per VM** - Run 2-3 servers on one VM
- [ ] **Server Warm Pool** - Keep 1-2 servers pre-started for instant matches

## Project Structure

```
src/
  app/
    page.tsx                    # Landing page (Sign in with Steam)
    dashboard/page.tsx          # Player dashboard + stats
    queue/page.tsx              # Queue page (join/leave, ready check)
    match/[id]/page.tsx         # Match page (scoreboard, connect)
    leaderboard/page.tsx        # ELO leaderboard
    api/
      auth/[...nextauth]/       # NextAuth.js handler
      auth/steam/               # Steam login redirect
      auth/steam/callback/      # Steam OpenID callback
      queue/                    # Join/leave queue API
      queue/status/             # Check queue/match status
      match/[id]/               # Get match details
      match/accept/             # Accept ready check
      match/decline/            # Decline ready check
      servers/ready/            # Server boot callback
      get5/webhook/             # get5 match events
      get5/match-config/[id]/   # get5 match config
      leaderboard/              # Leaderboard data
  lib/
    auth.ts                     # NextAuth configuration
    prisma.ts                   # Prisma client singleton
    steam.ts                    # Steam Web API helpers
    matchmaking.ts              # Queue + ELO + team balancing
    match-orchestrator.ts       # Match lifecycle management
    rcon.ts                     # RCON client for CS:GO servers
    azure-server.ts             # Azure VM provisioning
    socket-events.ts            # Socket.io event types
  components/
    Navbar.tsx                  # Navigation bar
    Providers.tsx               # NextAuth session provider
prisma/
  schema.prisma                 # Database schema
```

## Getting Started (Local Development)

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Steam Web API key ([get one here](https://steamcommunity.com/dev/apikey))

### Setup

```bash
# Clone the repo
git clone https://github.com/your-user/csgo-hosting.git
cd csgo-hosting

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Fill in your values in .env

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Required Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_URL` | Your app URL (e.g., `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | Random secret (generate with `openssl rand -base64 32`) |
| `STEAM_API_KEY` | Steam Web API key |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription for VM provisioning |
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_CLIENT_ID` | Azure service principal client ID |
| `AZURE_CLIENT_SECRET` | Azure service principal secret |
| `AZURE_RESOURCE_GROUP` | Azure resource group for game servers |
| `AZURE_VM_IMAGE_ID` | Azure VM image with CS:GO pre-installed |
| `AZURE_REGION` | Default Azure region (e.g., `centralindia`) |

## Azure Deployment

### 1. Web App (Azure App Service)

```bash
# Create App Service
az webapp create \
  --resource-group fluidrush \
  --plan fluidrush-plan \
  --name fluidrush \
  --runtime "NODE:18-lts"

# Set environment variables
az webapp config appsettings set \
  --resource-group fluidrush \
  --name fluidrush \
  --settings @env-settings.json

# Deploy from GitHub
az webapp deployment source config \
  --resource-group fluidrush \
  --name fluidrush \
  --repo-url https://github.com/your-user/csgo-hosting \
  --branch main
```

### 2. PostgreSQL (Azure Database for PostgreSQL Flexible Server)

```bash
az postgres flexible-server create \
  --resource-group fluidrush \
  --name fluidrush-db \
  --location centralindia \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --admin-user csgo \
  --admin-password YOUR_PASSWORD

# Create database
az postgres flexible-server db create \
  --resource-group fluidrush \
  --server-name fluidrush-db \
  --database-name csgo_matchmaking
```

### 3. Custom Domain (fluidrush.com)

```bash
az webapp config hostname add \
  --resource-group fluidrush \
  --webapp-name fluidrush \
  --hostname fluidrush.com

# Add SSL certificate
az webapp config ssl bind \
  --resource-group fluidrush \
  --name fluidrush \
  --certificate-thumbprint YOUR_CERT_THUMBPRINT \
  --ssl-type SNI
```

## Game Server Setup Guide

This is a step-by-step guide to create the "golden image" Azure VM with CS:GO + get5 installed.

### Step 1: Create the VM

```bash
# Create resource group and networking
az group create --name csgo-servers --location centralindia

az network vnet create \
  --resource-group csgo-servers \
  --name csgo-vnet-centralindia \
  --address-prefix 10.0.0.0/16 \
  --subnet-name default \
  --subnet-prefix 10.0.0.0/24

az network nsg create \
  --resource-group csgo-servers \
  --name csgo-nsg-centralindia

# Open CS:GO ports
az network nsg rule create \
  --resource-group csgo-servers \
  --nsg-name csgo-nsg-centralindia \
  --name AllowCSGO \
  --priority 100 \
  --destination-port-ranges 27015-27020 \
  --protocol '*' \
  --access Allow

az network nsg rule create \
  --resource-group csgo-servers \
  --nsg-name csgo-nsg-centralindia \
  --name AllowSSH \
  --priority 110 \
  --destination-port-ranges 22 \
  --protocol Tcp \
  --access Allow

# Create the VM
az vm create \
  --resource-group csgo-servers \
  --name csgo-golden \
  --image Ubuntu2204 \
  --size Standard_D4s_v5 \
  --admin-username csgo \
  --generate-ssh-keys \
  --public-ip-sku Standard \
  --nsg csgo-nsg-centralindia \
  --vnet-name csgo-vnet-centralindia \
  --subnet default
```

### Step 2: SSH into the VM and install CS:GO

```bash
ssh csgo@<VM_PUBLIC_IP>

# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y lib32gcc-s1 lib32stdc++6 screen curl wget

# Install SteamCMD
mkdir -p ~/steamcmd && cd ~/steamcmd
wget https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz
tar -xvzf steamcmd_linux.tar.gz

# Install CS:GO dedicated server (App ID 740)
./steamcmd.sh +force_install_dir ~/csgo-server +login anonymous +app_update 740 validate +quit
```

### Step 3: Install SourceMod + MetaMod

```bash
cd ~/csgo-server/csgo

# Install MetaMod:Source (check https://www.metamodsource.net/downloads.php for latest)
wget https://mms.alliedmods.net/mmsdrop/1.11/mmsource-1.11.0-git1148-linux.tar.gz
tar -xvzf mmsource-1.11.0-git1148-linux.tar.gz

# Install SourceMod (check https://www.sourcemod.net/downloads.php for latest)
wget https://sm.alliedmods.net/smdrop/1.11/sourcemod-1.11.0-git6968-linux.tar.gz
tar -xvzf sourcemod-1.11.0-git6968-linux.tar.gz
```

### Step 4: Install get5

```bash
# Download get5 (check https://github.com/splewis/get5/releases for latest)
cd ~/csgo-server/csgo
wget https://github.com/splewis/get5/releases/download/v0.15.0/get5_v0.15.0.zip
unzip get5_v0.15.0.zip

# Verify installation
ls addons/sourcemod/plugins/get5.smx
```

### Step 5: Configure the server

```bash
# Create server.cfg
cat > ~/csgo-server/csgo/cfg/server.cfg << 'EOF'
hostname "FluidRush CS:GO Server"
sv_password ""
rcon_password "CHANGE_THIS"
sv_cheats 0
sv_lan 0
sv_pure 1
sv_minrate 128000
sv_maxrate 0
sv_mincmdrate 128
sv_maxcmdrate 128
sv_minupdaterate 128
sv_maxupdaterate 128
sv_contact "admin@fluidrush.com"

// get5 settings
get5_check_auths 1
get5_kick_when_no_match_loaded 1
EOF

# Create autoexec
cat > ~/csgo-server/csgo/cfg/autoexec.cfg << 'EOF'
exec server.cfg
EOF
```

### Step 6: Test the server

```bash
cd ~/csgo-server
./srcds_run -game csgo -console -usercon \
  +game_type 0 +game_mode 1 \
  +mapgroup mg_active +map de_dust2 \
  -port 27015 \
  +sv_setsteamaccount "YOUR_GSLT_TOKEN"
```

Get a Game Server Login Token (GSLT) at: https://steamcommunity.com/dev/managegameservers (App ID: 730)

### Step 7: Capture the VM image

```bash
# Stop the VM first
az vm deallocate --resource-group csgo-servers --name csgo-golden

# Generalize the VM
az vm generalize --resource-group csgo-servers --name csgo-golden

# Create image
az image create \
  --resource-group csgo-servers \
  --name csgo-golden-image \
  --source csgo-golden

# Get the image ID (save this - you need it in AZURE_VM_IMAGE_ID)
az image show \
  --resource-group csgo-servers \
  --name csgo-golden-image \
  --query id -o tsv
```

## Match Flow (How It Works)

```
1. Player signs in via Steam OpenID
2. Player joins the solo queue (selects region)
3. When 10 players are queued, matchmaking triggers
4. Teams are balanced by ELO (snake draft: 1-2-2-2-1)
5. 30-second ready check sent to all 10 players
6. All accept → Match created → Server provisioned
   - First checks for stopped VMs to restart (~1-2 min)
   - If none, creates new VM from golden image (~3-5 min)
7. Server configured via RCON + get5 match loaded
8. Players connect via steam:// link
9. get5 manages the match (knife round, live, OT)
10. get5 sends events to /api/get5/webhook
    - Player kills/deaths tracked
    - Round scores updated in real-time
11. Match ends → ELO calculated and updated
    - Winners gain ELO, losers lose ELO
    - Amount based on ELO difference (expected outcome)
12. Server deallocated after 1 minute
13. Players can view match results + queue again
```

## Azure Cost Estimate

For running the event from 12pm to midnight (12 hours):

| Resource | SKU | Cost/Day |
|---|---|---|
| App Service | Basic B1 | ~$0.43 |
| PostgreSQL Flexible | Burstable B1ms | ~$0.40 |
| Game Server VM (each) | D4s_v5 (4 vCPU) | ~$2.30 |
| **Total (1 game VM)** | | **~$3.13** |
| **Total (3 game VMs)** | | **~$7.73** |

Stopped VMs cost ~$0.01/hr (disk storage only).

## License

MIT
