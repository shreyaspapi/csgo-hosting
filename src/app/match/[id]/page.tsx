"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
import Navbar from "@/components/Navbar";

interface MatchPlayer {
  id: string;
  team: "TEAM_A" | "TEAM_B";
  isCaptain: boolean;
  kills: number;
  deaths: number;
  assists: number;
  eloChange: number;
  user: {
    id: string;
    steamId: string;
    displayName: string;
    avatar: string;
    elo: number;
  };
}

interface MatchData {
  id: string;
  status: string;
  map: string;
  region: string;
  serverIp: string | null;
  serverPort: number | null;
  connectString: string | null;
  scoreTeamA: number;
  scoreTeamB: number;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  players: MatchPlayer[];
  server: {
    ip: string;
    port: number;
    status: string;
  } | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  READY_CHECK: { label: "Ready Check", color: "text-yellow-400" },
  CONFIGURING: { label: "Setting Up Server", color: "text-blue-400" },
  WARMUP: { label: "Warmup", color: "text-cyan-400" },
  KNIFE: { label: "Knife Round", color: "text-purple-400" },
  LIVE: { label: "LIVE", color: "text-green-400" },
  FINISHED: { label: "Finished", color: "text-gray-400" },
  CANCELLED: { label: "Cancelled", color: "text-red-400" },
};

export default function MatchPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const matchId = params.id as string;

  const [match, setMatch] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch match data
  useEffect(() => {
    const fetchMatch = async () => {
      try {
        const res = await fetch(`/api/match/${matchId}`);
        if (res.ok) {
          const data = await res.json();
          setMatch(data);
        } else {
          setError("Match not found");
        }
      } catch {
        setError("Failed to load match");
      } finally {
        setLoading(false);
      }
    };

    fetchMatch();

    // Poll for updates
    const interval = setInterval(fetchMatch, 5000);
    return () => clearInterval(interval);
  }, [matchId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-gray-400">Loading match...</div>
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-gray-950">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <p className="text-red-400 text-xl mb-4">{error}</p>
            <button
              onClick={() => router.push("/queue")}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Back to Queue
            </button>
          </div>
        </div>
      </div>
    );
  }

  const teamA = match.players.filter((p) => p.team === "TEAM_A");
  const teamB = match.players.filter((p) => p.team === "TEAM_B");
  const statusInfo = STATUS_LABELS[match.status] || {
    label: match.status,
    color: "text-gray-400",
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Match Header */}
        <div className="text-center mb-8">
          <div
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-4 ${
              match.status === "LIVE"
                ? "bg-green-500/10 border-green-500/30"
                : "bg-gray-800 border-gray-700"
            }`}
          >
            {match.status === "LIVE" && (
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            )}
            <span className={`text-sm font-semibold ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>

          <h1 className="text-3xl font-bold mb-2">Match #{matchId.slice(0, 8)}</h1>
          <p className="text-gray-400">
            Map: <span className="text-white font-medium">{match.map}</span>
            {" | "}
            Region: <span className="text-white font-medium">{match.region}</span>
          </p>
        </div>

        {/* Connect Button */}
        {match.connectString &&
          ["WARMUP", "KNIFE", "LIVE"].includes(match.status) && (
            <div className="max-w-md mx-auto mb-8">
              <a
                href={match.connectString}
                className="block w-full py-4 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white rounded-xl text-center text-lg font-bold transition-all shadow-lg"
              >
                Connect to Server
              </a>
              <p className="text-center text-sm text-gray-500 mt-2">
                {match.serverIp}:{match.serverPort}
              </p>
            </div>
          )}

        {/* Configuring Status */}
        {match.status === "CONFIGURING" && (
          <div className="max-w-md mx-auto mb-8 bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" />
              <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
              <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
            </div>
            <p className="text-blue-400 font-semibold">
              Provisioning game server...
            </p>
            <p className="text-sm text-gray-400 mt-1">
              This may take 1-3 minutes
            </p>
          </div>
        )}

        {/* Scoreboard */}
        <div className="grid md:grid-cols-[1fr_auto_1fr] gap-6 items-start">
          {/* Team A */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-orange-400">Team A</h2>
              {match.status === "LIVE" || match.status === "FINISHED" ? (
                <span className="text-3xl font-bold text-white">
                  {match.scoreTeamA}
                </span>
              ) : null}
            </div>
            <div className="space-y-2">
              {teamA.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  isCurrentUser={session?.user?.id === player.user.id}
                  showStats={
                    match.status === "LIVE" || match.status === "FINISHED"
                  }
                />
              ))}
            </div>
          </div>

          {/* VS divider */}
          <div className="hidden md:flex items-center justify-center pt-12">
            <div className="bg-gray-800 border border-gray-700 rounded-xl px-6 py-4">
              <p className="text-2xl font-bold text-gray-500">VS</p>
            </div>
          </div>

          {/* Team B */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-blue-400">Team B</h2>
              {match.status === "LIVE" || match.status === "FINISHED" ? (
                <span className="text-3xl font-bold text-white">
                  {match.scoreTeamB}
                </span>
              ) : null}
            </div>
            <div className="space-y-2">
              {teamB.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  isCurrentUser={session?.user?.id === player.user.id}
                  showStats={
                    match.status === "LIVE" || match.status === "FINISHED"
                  }
                />
              ))}
            </div>
          </div>
        </div>

        {/* Match Actions */}
        <div className="flex justify-center gap-4 mt-10">
          <button
            onClick={() => router.push("/queue")}
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors"
          >
            Back to Queue
          </button>
        </div>
      </div>
    </div>
  );
}

function PlayerCard({
  player,
  isCurrentUser,
  showStats,
}: {
  player: MatchPlayer;
  isCurrentUser: boolean;
  showStats: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 bg-gray-900 border rounded-lg p-3 ${
        isCurrentUser ? "border-orange-500/50" : "border-gray-800"
      }`}
    >
      <Image
        src={player.user.avatar}
        alt={player.user.displayName}
        width={40}
        height={40}
        className="rounded-full"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">
            {player.user.displayName}
          </p>
          {player.isCaptain && (
            <span className="text-xs bg-yellow-500/10 text-yellow-400 px-1.5 py-0.5 rounded">
              C
            </span>
          )}
          {isCurrentUser && (
            <span className="text-xs bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded">
              You
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500">ELO: {player.user.elo}</p>
      </div>
      {showStats && (
        <div className="flex gap-4 text-sm text-gray-400">
          <div className="text-center">
            <p className="font-medium text-white">{player.kills}</p>
            <p className="text-xs">K</p>
          </div>
          <div className="text-center">
            <p className="font-medium text-white">{player.deaths}</p>
            <p className="text-xs">D</p>
          </div>
          <div className="text-center">
            <p className="font-medium text-white">{player.assists}</p>
            <p className="text-xs">A</p>
          </div>
          {player.eloChange !== 0 && (
            <div className="text-center">
              <p
                className={`font-medium ${
                  player.eloChange > 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {player.eloChange > 0 ? "+" : ""}
                {player.eloChange}
              </p>
              <p className="text-xs">ELO</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
