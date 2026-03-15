# FluidRush — CS:GO 5v5 Matchmaking

A competitive CS:GO 5v5 matchmaking platform. Players authenticate via Steam, queue solo or with friends (duo/trio/4-stack), and play on auto-provisioned Azure dedicated servers with full ELO rankings and captain draft.

**Live at [fluidrush.com](https://fluidrush.com)** | **Discord:** [discord.gg/XBVsuFUDDs](https://discord.gg/XBVsuFUDDs)

**Stack:** Next.js 15 · Prisma · Neon PostgreSQL · shadcn/ui v4 · Tailwind v4 · Azure VMs · GitHub Actions CI/CD

---

## Limited Experiment: March 19–23, 2026

FluidRush matchmaking is live as a **limited experiment from Thursday, March 19 through Sunday, March 23, 2026**. Dedicated CS:GO servers spin up on-demand across 4 regions. If there's enough interest we'll keep it running.

---

## Features

### Authentication
- [x] Steam OpenID 2.0 sign-in — one click, no registration
- [x] Email + preferred region onboarding on first login
- [x] VAC ban check — blocks players banned within 2 years
- [x] JWT session via NextAuth.js
- [x] Admin role via `ADMIN_STEAM_IDS` environment variable

### Matchmaking
- [x] **Solo queue** — 10 players → auto-match
- [x] **Party queue** — duo, trio, or 4-stack into the solo pool (party members stay on the same team)
- [x] **Team queue** — pre-made 5-stacks vs 5-stacks
- [x] 30-second ready check with accept / decline
- [x] Auto-decline when countdown reaches 0
- [x] Re-queue accepted players on decline / timeout
- [x] **Captain draft** — top 2 ELO players become captains, alternate picking (A→B→B→A→A→B→B→A)
- [x] Map voting — 6 competitive maps (D2, Mirage, Cache, Inferno, Overpass, Office), plurality wins
- [x] ELO-balanced team assignment with party-aware bin-packing
- [x] Region selector: Mumbai, Singapore, Amsterdam, Virginia

### Match Management
- [x] Dynamic Azure VM provisioning from gallery image (TrustedLaunch, Standard_D2s_v5)
- [x] Cloud-init per-match configuration (RCON password, get5 webhook)
- [x] Stopped VM reuse via Azure Run Command (fast restart ~1-2 min)
- [x] RCON integration for server config (get5 plugin)
- [x] get5 webhook: going_live, round_end, player_death, player_hurt, map_result, series_end
- [x] Live scoreboard with K/D/A, HS%, ADR, HLTV 2.0 rating
- [x] `steam://connect` button when server is ready
- [x] Auto-deallocation after match ends
- [x] Periodic cleanup of old stopped VMs (>1 hour)

### Statistics
- [x] ELO ranking system (K=32, expected-outcome formula)
- [x] Per-match stats: kills, deaths, assists, headshots, damage, MVPs, score
- [x] HLTV 2.0 rating approximation
- [x] Career stats on player profiles: avg K/D, avg HS%, avg ADR, avg HLTV
- [x] Leaderboard — top 50 players by ELO with rank medals

### Pages
| Route | Description |
|---|---|
| `/` | Landing page with live stats, how-it-works, support links |
| `/dashboard` | Player hub — stats, active match, recent matches, support banner |
| `/queue` | VGUI-styled server browser + matchmaking + party builder |
| `/match/[id]` | Live match — draft phase, scoreboard, connect button |
| `/matches` | Personal match history with filters |
| `/leaderboard` | Global ELO rankings |
| `/teams` | Create / manage your 5-stack |
| `/players/[id]` | Public player profile + career stats |
| `/admin` | Admin panel — ban players, manage matches/servers, view reports |

### Social / Safety
- [x] Report system — flag players for cheating, toxicity, griefing, AFK
- [x] Admin ban / unban with reason
- [x] Report dashboard in admin panel with dismiss / ban actions
- [x] VAC ban enforcement on Steam callback

### Planned
- [ ] Socket.io real-time (replace polling)
- [ ] Discord bot integration
- [ ] Season / ranking resets
- [ ] Match demo upload
- [ ] Multiple server instances per VM (port 27015–27020)
- [ ] Server warm pool

---

## Local Setup

```bash
git clone https://github.com/shreyaspapi/fluidrush
cd fluidrush
npm install
cp .env.example .env   # fill in values
npx prisma db push
npx prisma generate
npm run dev
```

### Required Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Neon recommended) |
| `NEXTAUTH_URL` | App base URL e.g. `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Random secret — `openssl rand -base64 32` |
| `STEAM_API_KEY` | [steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey) |
| `GET5_WEBHOOK_SECRET` | Shared secret for get5 → app webhook auth |
| `CRON_SECRET` | Secret for `/api/cron/cleanup` endpoint |
| `ADMIN_STEAM_IDS` | Comma-separated Steam64 IDs for admin access |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_CLIENT_ID` | Azure service principal client ID |
| `AZURE_CLIENT_SECRET` | Azure service principal secret |
| `AZURE_RESOURCE_GROUP` | Resource group for game server VMs (default: `csgo-servers`) |
| `AZURE_VM_IMAGE_ID` | Gallery image version ID for the CS:GO golden image |
| `AZURE_SSH_PUBLIC_KEY` | SSH public key for game server VM access |
| `AZURE_REGION` | Default region e.g. `centralindia` |

---

## Game Server Infrastructure

### Golden Image

The CS:GO game servers run on Azure VMs created from a **golden image** stored in an Azure Compute Gallery. The image contains:

- Ubuntu 22.04 LTS (Gen2, TrustedLaunch)
- SteamCMD + CS:GO Dedicated Server (app ID 740, 128-tick)
- MetaMod:Source 1.11 + SourceMod 1.11
- get5 plugin v0.15.0
- Systemd service (`csgo.service`) + per-boot cloud-init configuration script
- Competitive server.cfg (128-tick, GOTV enabled)

### Creating the Golden Image

```bash
# 1. Create a base VM
az vm create --resource-group csgo-servers --name csgo-golden \
  --image Canonical:0001-com-ubuntu-server-jammy:22_04-lts-gen2:latest \
  --size Standard_D2s_v5 --admin-username csgo --generate-ssh-keys \
  --os-disk-size-gb 50 --storage-sku Premium_LRS

# 2. SSH in and run the setup script
scp scripts/setup-csgo-server.sh csgo@<IP>:/home/csgo/
ssh csgo@<IP> "chmod +x setup-csgo-server.sh && sudo ./setup-csgo-server.sh"

# 3. Deprovision, deallocate, generalize
ssh csgo@<IP> "sudo waagent -deprovision+user -force"
az vm deallocate --resource-group csgo-servers --name csgo-golden
az vm generalize --resource-group csgo-servers --name csgo-golden

# 4. Capture to gallery (replicates to all 4 regions)
az sig image-version create --resource-group csgo-servers \
  --gallery-name fluidrushGallery --gallery-image-definition csgo-server \
  --gallery-image-version 1.0.0 --virtual-machine <VM-ID> \
  --target-regions centralindia southeastasia westeurope eastus
```

### Server Lifecycle

```
Match found → CONFIGURING
  ├─ STOPPED VM exists? → Start VM + Run Command (write config, start CS:GO) → ~1-2 min
  └─ No VM? → Create new VM from gallery image + cloud-init → ~3-5 min
                ↓
         VM boots → cloud-init writes match-config.json
                  → per-boot script starts csgo.service
                  → waits for port 27015
                  → calls /api/servers/ready
                ↓
         App configures match via RCON (get5_loadmatch_url)
                ↓
         Match status → WARMUP → KNIFE → LIVE → FINISHED
                ↓
         VM deallocated (saved for reuse, cleaned up after 1 hour)
```

### Network Setup (per region)

Each region has pre-created networking resources in the `csgo-servers` resource group:

| Resource | Naming | Ports |
|---|---|---|
| VNet | `csgo-vnet-{region}` | — |
| Subnet | `default` | — |
| NSG | `csgo-nsg-{region}` | TCP/UDP 27015-27020, SSH 22 |

Regions: `centralindia`, `southeastasia`, `westeurope`, `eastus`

---

## Deployment

Deployed via **GitHub Actions** on push to `main`. The workflow:

1. Builds Next.js in standalone mode (`output: "standalone"`)
2. Copies static assets into the standalone package
3. Deploys to Azure App Service (`fluidrush`, B2 plan, Central US)

Startup command: `node server.js` (port 8080)

---

## Architecture

```
Browser → Next.js 15 (App Router) on Azure App Service
               ↓
          Neon PostgreSQL (Prisma ORM)
               ↓
          Azure VMs (CS:GO + get5) in 4 regions
               ↓
          get5 webhook → /api/get5/webhook → live stats
```

## Captain Draft Flow

```
1. 10 players accept ready check
2. Top 2 ELO → Captains (A and B)
3. Match status = DRAFT
4. Pick order: A B B A A B B A
5. Active captain clicks a player card to pick
6. After 8 picks → CONFIGURING → server provisioned
```

## Match Status Flow

```
READY_CHECK → DRAFT → CONFIGURING → WARMUP → KNIFE → LIVE → FINISHED
                                              ↓
                                          CANCELLED (any time)
```

---

## Azure Cost Estimate (4-day experiment)

| Resource | SKU | ~Cost |
|---|---|---|
| App Service | B2 (2 cores, 3.5GB) | ~$2.40 |
| Neon PostgreSQL | Free tier | $0 |
| Game Server VM (per match) | D2s_v5 (2 cores, 8GB) | ~$0.10/hr |
| Gallery Image Storage | Standard_LRS × 4 regions | ~$1.00 |
| **Total (10 matches)** | | **~$4.40** |

---

## Support

- [Buy Me a Coffee](https://buymeacoffee.com/shreyaspapi)
- ETH: `0x2F069F429d036aeBD2dC13de8B63C16AE9f8bB1a`
- [Discord](https://discord.gg/XBVsuFUDDs)
- [GitHub](https://github.com/shreyaspapi/fluidrush)

---

## License

MIT
