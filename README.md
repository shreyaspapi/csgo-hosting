# FluidRush — CS:GO 5v5 Matchmaking

A competitive CS:GO 5v5 matchmaking platform inspired by FaceIT. Players authenticate via Steam, queue for matches, and play on auto-provisioned Azure dedicated servers with full ELO rankings.

**Stack:** Next.js 15 · Prisma · Neon PostgreSQL · shadcn/ui v4 · Tailwind v4 · Azure VMs

---

## Features

### Authentication
- [x] Steam OpenID 2.0 sign-in — no registration, one click
- [x] VAC ban check on login — blocks players banned within 2 years
- [x] JWT session via NextAuth.js
- [x] Admin role via `ADMIN_STEAM_IDS` environment variable

### Matchmaking
- [x] Solo queue — 10 players → auto-match
- [x] Team queue — pre-made 5-stacks vs 5-stacks
- [x] 30-second ready check with accept / decline
- [x] Auto-decline when countdown reaches 0
- [x] Re-queue accepted players on decline / timeout
- [x] **Captain draft** — top 2 ELO players become captains, alternate picking (A→B→B→A→A→B→B→A)
- [x] Map voting — 7 competitive maps, plurality wins
- [x] ELO-balanced team assignment (fallback when draft is skipped)
- [x] Region selector: Mumbai, Singapore, Amsterdam, Virginia

### Match Management
- [x] Dynamic Azure VM provisioning from golden image
- [x] RCON integration for server config (get5 plugin)
- [x] get5 webhook: going_live, round_end, player_death, player_hurt, map_result, series_end
- [x] Live scoreboard with K/D/A, HS%, ADR, HLTV 2.0 rating
- [x] `steam://connect` button when server is ready
- [x] Auto-deallocation after match ends

### Statistics
- [x] ELO ranking system (K=32, expected-outcome formula)
- [x] Per-match stats: kills, deaths, assists, headshots, damage, MVPs, score
- [x] HLTV 2.0 rating approximation
- [x] Career stats on player profiles: avg K/D, avg HS%, avg ADR, avg HLTV
- [x] Leaderboard — top 50 players by ELO with rank medals

### Pages
| Route | Description |
|---|---|
| `/` | Landing page with live stats, how-it-works, feature grid |
| `/dashboard` | Player hub — stats, active match, recent matches |
| `/queue` | VGUI-styled server browser + matchmaking |
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
git clone https://github.com/your-user/csgo-hosting
cd csgo-hosting
npm install
cp .env.example .env   # fill in values
npx prisma migrate deploy
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
| `AZURE_RESOURCE_GROUP` | Resource group for game server VMs |
| `AZURE_VM_IMAGE_ID` | Resource ID of golden CS:GO VM image |
| `AZURE_REGION` | Default region e.g. `centralindia` |

---

## Game Server Setup (Golden Image)

Full step-by-step in the original README section. Summary:

1. Create Ubuntu 22.04 VM (Standard_D4s_v5) in Azure
2. Install SteamCMD + CS:GO dedicated server (app ID 740)
3. Install MetaMod:Source + SourceMod
4. Install get5 plugin
5. Configure `server.cfg` with RCON password
6. Set `get5_remote_log_url` to `https://your-domain.com/api/get5/webhook`
7. Capture VM image → set `AZURE_VM_IMAGE_ID`

---

## Architecture

```
Browser → Next.js 15 (App Router)
              ↓
         Neon PostgreSQL (Prisma)
              ↓
         Azure VMs (CS:GO + get5)
              ↓
         get5 webhook → /api/get5/webhook
```

## Captain Draft Flow

```
1. 10 players accept ready check
2. Top 2 ELO → Captains (A and B)
3. Match status = DRAFT
4. Pick order: A B B A A B B A
5. Active captain clicks a player card to pick
6. After 8 picks, teams finalised → CONFIGURING → server provisioned
```

## Match Status Flow

```
READY_CHECK → DRAFT → CONFIGURING → WARMUP → KNIFE → LIVE → FINISHED
                                              ↓
                                          CANCELLED (any time)
```

---

## Azure Cost (12-hour event)

| Resource | SKU | ~Cost |
|---|---|---|
| App Service | Basic B1 | $0.43 |
| Neon PostgreSQL | Free tier | $0 |
| Game Server VM | D4s_v5 | $2.30 each |
| **Total (1 VM)** | | **~$2.73** |

---

## License

MIT
