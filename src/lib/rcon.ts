import Rcon from "rcon-srcds";

/**
 * RCON client wrapper for communicating with CS:GO game servers
 */

interface RconConfig {
  host: string;
  port: number;
  password: string;
}

/**
 * Execute an RCON command on a game server
 */
export async function rconExec(
  config: RconConfig,
  command: string
): Promise<string> {
  const rcon = new Rcon({
    host: config.host,
    port: config.port,
    timeout: 5000,
  });

  try {
    await rcon.authenticate(config.password);
    const response = await rcon.execute(command);
    return String(response);
  } finally {
    rcon.disconnect();
  }
}

/**
 * Execute multiple RCON commands sequentially
 */
export async function rconExecMultiple(
  config: RconConfig,
  commands: string[]
): Promise<string[]> {
  const rcon = new Rcon({
    host: config.host,
    port: config.port,
    timeout: 5000,
  });

  try {
    await rcon.authenticate(config.password);
    const results: string[] = [];
    for (const cmd of commands) {
      const response = await rcon.execute(cmd);
      results.push(String(response));
    }
    return results;
  } finally {
    rcon.disconnect();
  }
}

/**
 * Configure a CS:GO server for a match using get5
 * Creates a get5 match config and loads it
 */
export async function configureMatchServer(
  config: RconConfig,
  matchConfig: {
    matchId: string;
    map: string;
    teamAName: string;
    teamBName: string;
    teamASteamIds: string[];
    teamBSteamIds: string[];
    webhookUrl: string;
  }
): Promise<void> {
  const {
    matchId,
    map,
    teamAName,
    teamBName,
    teamASteamIds,
    teamBSteamIds,
    webhookUrl,
  } = matchConfig;

  // Build get5 match config JSON (used by get5_loadmatch_url endpoint)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const get5Config = {
    matchid: matchId,
    num_maps: 1,
    maplist: [map],
    skip_veto: true,
    side_type: "knife",
    players_per_team: 5,
    min_players_to_ready: 1,
    team1: {
      name: teamAName,
      players: Object.fromEntries(
        teamASteamIds.map((id) => [id, ""])
      ),
    },
    team2: {
      name: teamBName,
      players: Object.fromEntries(
        teamBSteamIds.map((id) => [id, ""])
      ),
    },
    cvars: {
      get5_remote_log_url: webhookUrl,
      get5_remote_log_header_key: "Authorization",
      get5_remote_log_header_value: `Bearer ${process.env.NEXTAUTH_SECRET}`,
    },
  };

  const commands = [
    // Set server password for the match
    `sv_password ""`,
    // Change to the correct map
    `changelevel ${map}`,
  ];

  // Execute initial setup
  await rconExecMultiple(config, commands);

  // Wait for map change
  await new Promise((resolve) => setTimeout(resolve, 5000));

  // Load the get5 match config
  // get5 supports loading from a JSON string via RCON
  await rconExec(
    config,
    `get5_loadmatch_url "${webhookUrl.replace("/api/get5/webhook", "/api/get5/match-config/" + matchId)}"`
  );
}

/**
 * Force end a match on the server
 */
export async function forceEndMatch(config: RconConfig): Promise<void> {
  await rconExec(config, "get5_endmatch");
}

/**
 * Get server status
 */
export async function getServerStatus(
  config: RconConfig
): Promise<string> {
  return rconExec(config, "status");
}

/**
 * Send a chat message to the server
 */
export async function sendServerMessage(
  config: RconConfig,
  message: string
): Promise<void> {
  await rconExec(config, `say ${message}`);
}
