/**
 * Steam Web API helpers
 * Used to fetch player profiles after OpenID authentication
 */

export interface SteamPlayer {
  steamid: string;
  personaname: string;
  profileurl: string;
  avatar: string;
  avatarmedium: string;
  avatarfull: string;
  personastate: number;
  communityvisibilitystate: number;
  lastlogoff?: number;
  loccountrycode?: string;
}

/**
 * Fetch Steam player summary by Steam ID
 */
export async function getSteamPlayer(steamId: string): Promise<SteamPlayer | null> {
  const apiKey = process.env.STEAM_API_KEY;
  if (!apiKey) throw new Error("STEAM_API_KEY is not set");

  const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId}`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  const players = data?.response?.players;
  return players?.[0] ?? null;
}

/**
 * Extract Steam ID from OpenID claimed_id URL
 * Format: https://steamcommunity.com/openid/id/76561198012345678
 */
export function extractSteamId(claimedId: string): string | null {
  const match = claimedId.match(/\/openid\/id\/(\d+)$/);
  return match?.[1] ?? null;
}

/**
 * Build Steam OpenID authentication URL
 */
export function buildSteamOpenIdUrl(returnUrl: string): string {
  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": returnUrl,
    "openid.realm": new URL(returnUrl).origin,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });

  return `https://steamcommunity.com/openid/login?${params.toString()}`;
}

/**
 * Verify Steam OpenID response
 * Sends verification request back to Steam to confirm authenticity
 */
export async function verifySteamOpenId(
  params: Record<string, string>
): Promise<string | null> {
  // Build verification request
  const verifyParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    verifyParams.append(key, value);
  }

  // Change mode to check_authentication
  verifyParams.set("openid.mode", "check_authentication");

  const res = await fetch("https://steamcommunity.com/openid/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: verifyParams.toString(),
  });

  const text = await res.text();

  if (text.includes("is_valid:true")) {
    const claimedId = params["openid.claimed_id"];
    return extractSteamId(claimedId);
  }

  return null;
}
