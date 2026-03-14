"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Image from "next/image";
import Navbar from "@/components/Navbar";

interface LeaderboardPlayer {
  id: string;
  steamId: string;
  displayName: string;
  avatar: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  rank: number;
  totalMatches: number;
  winRate: number;
}

export default function LeaderboardPage() {
  const { data: session } = useSession();
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/leaderboard?limit=50")
      .then((res) => res.json())
      .then((data) => {
        setPlayers(data.players);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getRankStyle = (rank: number) => {
    if (rank === 1)
      return "bg-yellow-500/10 border-yellow-500/30 text-yellow-400";
    if (rank === 2)
      return "bg-gray-400/10 border-gray-400/30 text-gray-300";
    if (rank === 3)
      return "bg-orange-700/10 border-orange-700/30 text-orange-400";
    return "bg-gray-900 border-gray-800 text-gray-400";
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-center mb-2">Leaderboard</h1>
        <p className="text-gray-400 text-center mb-10">
          Top players ranked by ELO
        </p>

        {loading ? (
          <div className="text-center text-gray-400 py-12">
            Loading leaderboard...
          </div>
        ) : players.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <p className="text-lg mb-2">No players yet</p>
            <p className="text-sm">
              Be the first to play a match and appear on the leaderboard!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Header */}
            <div className="grid grid-cols-[60px_1fr_80px_80px_80px_80px] gap-4 px-4 py-2 text-xs text-gray-500 font-medium uppercase">
              <div>Rank</div>
              <div>Player</div>
              <div className="text-center">ELO</div>
              <div className="text-center">W</div>
              <div className="text-center">L</div>
              <div className="text-center">Win %</div>
            </div>

            {/* Players */}
            {players.map((player) => (
              <div
                key={player.id}
                className={`grid grid-cols-[60px_1fr_80px_80px_80px_80px] gap-4 items-center px-4 py-3 rounded-lg border transition-colors ${getRankStyle(player.rank)} ${
                  session?.user?.id === player.id
                    ? "ring-1 ring-orange-500/50"
                    : ""
                }`}
              >
                <div className="font-bold text-lg">#{player.rank}</div>
                <div className="flex items-center gap-3 min-w-0">
                  <Image
                    src={player.avatar}
                    alt={player.displayName}
                    width={36}
                    height={36}
                    className="rounded-full"
                  />
                  <span className="font-medium truncate text-white">
                    {player.displayName}
                  </span>
                  {session?.user?.id === player.id && (
                    <span className="text-xs bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded shrink-0">
                      You
                    </span>
                  )}
                </div>
                <div className="text-center font-bold text-orange-400">
                  {player.elo}
                </div>
                <div className="text-center text-green-400">
                  {player.wins}
                </div>
                <div className="text-center text-red-400">
                  {player.losses}
                </div>
                <div className="text-center text-white">
                  {player.winRate}%
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
