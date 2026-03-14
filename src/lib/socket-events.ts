/**
 * Socket.io event constants - shared between client and server
 */

// Queue events
export const QUEUE_JOIN = "queue:join";
export const QUEUE_LEAVE = "queue:leave";
export const QUEUE_UPDATE = "queue:update"; // Server broadcasts queue state
export const QUEUE_ERROR = "queue:error";

// Match events
export const MATCH_FOUND = "match:found";
export const MATCH_READY_CHECK = "match:readyCheck";
export const MATCH_ACCEPT = "match:accept";
export const MATCH_DECLINE = "match:decline";
export const MATCH_READY_UPDATE = "match:readyUpdate"; // Broadcasts ready status
export const MATCH_CANCELLED = "match:cancelled";
export const MATCH_CONFIRMED = "match:confirmed"; // All players ready
export const MATCH_SERVER_READY = "match:serverReady"; // Server is configured
export const MATCH_STATUS_UPDATE = "match:statusUpdate";

// General events
export const STATS_UPDATE = "stats:update"; // Live stats for landing page

export interface QueueState {
  soloCount: number;
  teamCount: number;
  region: string;
}

export interface MatchFoundPayload {
  matchId: string;
  players: {
    id: string;
    steamId: string;
    displayName: string;
    avatar: string;
    elo: number;
  }[];
  expiresAt: string; // ISO date string
}

export interface ReadyCheckUpdate {
  matchId: string;
  accepted: string[]; // user IDs who accepted
  total: number;
  expiresAt: string;
}

export interface MatchConfirmedPayload {
  matchId: string;
  serverIp: string;
  serverPort: number;
  connectString: string;
  map: string;
  teamA: { id: string; displayName: string; steamId: string }[];
  teamB: { id: string; displayName: string; steamId: string }[];
}
