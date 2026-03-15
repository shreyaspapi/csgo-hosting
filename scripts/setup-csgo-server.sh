#!/bin/bash
###############################################################################
# FluidRush — CS:GO Dedicated Server Golden Image Setup
#
# Run this on a fresh Ubuntu 22.04 VM to install everything needed:
#   - SteamCMD
#   - CS:GO Dedicated Server (app ID 740)
#   - MetaMod:Source
#   - SourceMod
#   - get5 plugin
#   - Server config files
#
# After running this script, capture the VM as an Azure image.
#
# Usage:
#   chmod +x setup-csgo-server.sh
#   sudo ./setup-csgo-server.sh
###############################################################################
set -euo pipefail

CSGO_USER="csgo"
CSGO_DIR="/home/${CSGO_USER}/csgo-server"
CSGO_APP_ID=740

echo "========================================="
echo "FluidRush CS:GO Server Setup"
echo "========================================="

# ── 1. System dependencies ──────────────────────────────────────────
echo "[1/8] Installing system dependencies..."
dpkg --add-architecture i386
apt-get update -y
apt-get install -y \
  lib32gcc-s1 lib32stdc++6 libsdl2-2.0-0:i386 \
  curl wget unzip screen net-tools jq \
  ca-certificates software-properties-common

# ── 2. Create csgo user ─────────────────────────────────────────────
echo "[2/8] Creating csgo user..."
if ! id -u ${CSGO_USER} &>/dev/null; then
  useradd -m -s /bin/bash ${CSGO_USER}
fi

# ── 3. Install SteamCMD ─────────────────────────────────────────────
echo "[3/8] Installing SteamCMD..."
STEAMCMD_DIR="/home/${CSGO_USER}/steamcmd"
mkdir -p "${STEAMCMD_DIR}"
cd "${STEAMCMD_DIR}"

if [ ! -f "${STEAMCMD_DIR}/steamcmd.sh" ]; then
  wget -q "https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz"
  tar -xzf steamcmd_linux.tar.gz
  rm steamcmd_linux.tar.gz
fi

chown -R ${CSGO_USER}:${CSGO_USER} "${STEAMCMD_DIR}"

# ── 4. Install CS:GO Dedicated Server ───────────────────────────────
echo "[4/8] Installing CS:GO Dedicated Server (this takes ~15-20 min)..."
mkdir -p "${CSGO_DIR}"
chown -R ${CSGO_USER}:${CSGO_USER} "${CSGO_DIR}"

sudo -u ${CSGO_USER} "${STEAMCMD_DIR}/steamcmd.sh" \
  +force_install_dir "${CSGO_DIR}" \
  +login anonymous \
  +app_update ${CSGO_APP_ID} validate \
  +quit

echo "CS:GO server installed at ${CSGO_DIR}"

# Fix libgcc_s.so.1 conflict (CS:GO bundles an old one that breaks on Ubuntu 22.04)
if [ -f "${CSGO_DIR}/bin/libgcc_s.so.1" ]; then
  mv "${CSGO_DIR}/bin/libgcc_s.so.1" "${CSGO_DIR}/bin/libgcc_s.so.1.bak"
  echo "Renamed conflicting libgcc_s.so.1 → .bak"
fi

# ── 5. Install MetaMod:Source ────────────────────────────────────────
echo "[5/8] Installing MetaMod:Source..."
METAMOD_URL="https://mms.alliedmods.net/mmsdrop/1.11/mmsource-1.11.0-git1155-linux.tar.gz"
cd /tmp
wget -q "${METAMOD_URL}" -O metamod.tar.gz
tar -xzf metamod.tar.gz -C "${CSGO_DIR}/csgo/"
rm metamod.tar.gz

# Create metamod VDF entry so CS:GO loads it
mkdir -p "${CSGO_DIR}/csgo/addons"
cat > "${CSGO_DIR}/csgo/addons/metamod.vdf" << 'METAMOD_VDF'
"Plugin"
{
  "file"  "../csgo/addons/metamod/bin/server"
}
METAMOD_VDF

# Also need gameinfo.txt patch — add metamod to search paths
# Back up original
cp "${CSGO_DIR}/csgo/gameinfo.txt" "${CSGO_DIR}/csgo/gameinfo.txt.bak"

# Inject metamod into gameinfo.txt SearchPaths
if ! grep -q "metamod" "${CSGO_DIR}/csgo/gameinfo.txt"; then
  sed -i '/GameBin.*csgo\/bin/a\\t\t\tGame\tcsgo/addons/metamod' "${CSGO_DIR}/csgo/gameinfo.txt"
fi

# ── 6. Install SourceMod ────────────────────────────────────────────
echo "[6/8] Installing SourceMod..."
SOURCEMOD_URL="https://sm.alliedmods.net/smdrop/1.11/sourcemod-1.11.0-git6968-linux.tar.gz"
cd /tmp
wget -q "${SOURCEMOD_URL}" -O sourcemod.tar.gz
tar -xzf sourcemod.tar.gz -C "${CSGO_DIR}/csgo/"
rm sourcemod.tar.gz

# ── 7. Install get5 ─────────────────────────────────────────────────
echo "[7/8] Installing get5..."
GET5_URL="https://github.com/splewis/get5/releases/download/v0.15.0/get5-v0.15.0.tar.gz"
cd /tmp
wget -qL "${GET5_URL}" -O get5.tar.gz
tar -xzf get5.tar.gz -C "${CSGO_DIR}/csgo/"
rm get5.tar.gz

echo "get5 installed"

# ── 8. Server configuration ─────────────────────────────────────────
echo "[8/8] Writing server configuration..."

# server.cfg — base config for competitive 5v5
cat > "${CSGO_DIR}/csgo/cfg/server.cfg" << 'SERVER_CFG'
// FluidRush CS:GO Competitive Server Config
hostname "FluidRush 5v5"
sv_cheats 0
sv_lan 0

// Rates / Performance (128-tick)
sv_minrate 786432
sv_mincmdrate 128
sv_minupdaterate 128

// Competitive settings
mp_autoteambalance 0
mp_limitteams 0
mp_friendlyfire 1
mp_halftime 1
mp_maxmoney 16000
mp_startmoney 800
mp_buytime 20
mp_freezetime 10
mp_roundtime 1.92
mp_roundtime_defuse 1.92
mp_warmuptime 60
mp_warmup_pausetimer 1

// Anti-cheat
sv_pure 1
sv_allow_votes 0

// Logging
log on
sv_logbans 1
sv_logecho 1
sv_logfile 1

// GOTV
tv_enable 1
tv_delay 90
tv_delaymapchange 1
tv_title "FluidRush GOTV"

// Execute RCON and get5 webhook configs (written at boot by cloud-init)
exec rcon.cfg
exec get5_webhook.cfg
SERVER_CFG

# autoexec.cfg — runs on server start
cat > "${CSGO_DIR}/csgo/cfg/autoexec.cfg" << 'AUTOEXEC_CFG'
// Auto-exec — load server.cfg
exec server.cfg
AUTOEXEC_CFG

# Placeholder configs that get overwritten per-match by cloud-init
cat > "${CSGO_DIR}/csgo/cfg/rcon.cfg" << 'RCON_CFG'
// Overwritten at boot
rcon_password "changeme"
RCON_CFG

cat > "${CSGO_DIR}/csgo/cfg/get5_webhook.cfg" << 'WEBHOOK_CFG'
// Overwritten at boot
get5_remote_log_url ""
get5_remote_log_header_key "Authorization"
get5_remote_log_header_value ""
WEBHOOK_CFG

# Create a systemd service for CS:GO server
cat > /etc/systemd/system/csgo.service << SYSTEMD_UNIT
[Unit]
Description=CS:GO Dedicated Server
After=network.target

[Service]
Type=simple
User=${CSGO_USER}
WorkingDirectory=${CSGO_DIR}
ExecStart=${CSGO_DIR}/srcds_run -game csgo -console -usercon \\
  +game_type 0 +game_mode 1 \\
  -tickrate 128 \\
  -port 27015 \\
  +mapgroup mg_active +map de_dust2 \\
  +exec server.cfg \\
  -maxplayers_override 12 \\
  +sv_setsteamaccount ""
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
SYSTEMD_UNIT

systemctl daemon-reload
# Don't enable on boot — cloud-init will start it after writing configs
systemctl disable csgo.service

# Fix permissions
chown -R ${CSGO_USER}:${CSGO_USER} "${CSGO_DIR}"
chown -R ${CSGO_USER}:${CSGO_USER} "/home/${CSGO_USER}"

# ── Cloud-init boot script ──────────────────────────────────────────
# This script runs on every boot to configure the server for a specific match
cat > /var/lib/cloud/scripts/per-boot/configure-csgo.sh << 'CLOUD_INIT'
#!/bin/bash
# This script is called by cloud-init custom data on each VM start.
# It reads /var/lib/fluidrush/match-config.json and configures the server.
#
# The JSON is written by the Azure VM's customData (base64-encoded cloud-init).
# Format:
# {
#   "rcon_password": "...",
#   "webhook_url": "https://fluidrush.com/api/get5/webhook",
#   "webhook_secret": "...",
#   "match_id": "...",
#   "ready_url": "https://fluidrush.com/api/servers/ready"
# }

CONFIG_FILE="/var/lib/fluidrush/match-config.json"
CSGO_DIR="/home/csgo/csgo-server"

if [ ! -f "$CONFIG_FILE" ]; then
  echo "No match config found, skipping server start"
  exit 0
fi

RCON_PASS=$(jq -r '.rcon_password' "$CONFIG_FILE")
WEBHOOK_URL=$(jq -r '.webhook_url' "$CONFIG_FILE")
WEBHOOK_SECRET=$(jq -r '.webhook_secret' "$CONFIG_FILE")
MATCH_ID=$(jq -r '.match_id' "$CONFIG_FILE")
READY_URL=$(jq -r '.ready_url' "$CONFIG_FILE")

# Write per-match configs
echo "rcon_password \"${RCON_PASS}\"" > "${CSGO_DIR}/csgo/cfg/rcon.cfg"

cat > "${CSGO_DIR}/csgo/cfg/get5_webhook.cfg" << EOF
get5_remote_log_url "${WEBHOOK_URL}"
get5_remote_log_header_key "Authorization"
get5_remote_log_header_value "Bearer ${WEBHOOK_SECRET}"
EOF

# Start the CS:GO server
systemctl start csgo.service

# Wait for server to be responsive (check if port 27015 is listening)
echo "Waiting for CS:GO server to start..."
for i in $(seq 1 60); do
  if ss -tuln | grep -q ":27015 "; then
    echo "CS:GO server is listening on port 27015"
    break
  fi
  sleep 5
done

# Notify FluidRush app that the server is ready
if [ -n "$READY_URL" ] && [ -n "$MATCH_ID" ]; then
  curl -s -X POST "$READY_URL" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${WEBHOOK_SECRET}" \
    -d "{\"matchId\": \"${MATCH_ID}\", \"rconPassword\": \"${RCON_PASS}\"}"
  echo "Notified FluidRush: server ready for match ${MATCH_ID}"
fi
CLOUD_INIT

chmod +x /var/lib/cloud/scripts/per-boot/configure-csgo.sh
mkdir -p /var/lib/fluidrush

echo ""
echo "========================================="
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Verify: ls -la ${CSGO_DIR}"
echo "  2. Test manually: sudo systemctl start csgo"
echo "  3. Check: sudo systemctl status csgo"
echo "  4. Deprovision: sudo waagent -deprovision+user -force"
echo "  5. Capture VM image in Azure portal or CLI"
echo "========================================="
