"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import Navbar from "@/components/Navbar";

type QueueState = "idle" | "queuing" | "matched" | "accepted";

interface QueueStats {
  soloCount: number;
  teamCount: number;
  matchesToday: number;
}

const REGIONS = [
  { value: "centralindia", label: "Mumbai (India)", flag: "IN" },
  { value: "southeastasia", label: "Singapore (SEA)", flag: "SG" },
  { value: "westeurope", label: "Amsterdam (EU)", flag: "EU" },
  { value: "eastus", label: "Virginia (US East)", flag: "US" },
];

export default function QueuePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [queueState, setQueueState] = useState<QueueState>("idle");
  const [region, setRegion] = useState("centralindia");
  const [stats, setStats] = useState<QueueStats>({
    soloCount: 0,
    teamCount: 0,
    matchesToday: 0,
  });
  const [elapsedTime, setElapsedTime] = useState(0);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [readyCheckExpiry, setReadyCheckExpiry] = useState<number>(0);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Redirect unauthenticated users
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  // Fetch queue stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/queue?region=${region}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      // ignore
    }
  }, [region]);

  // Poll for stats
  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  // Queue timer
  useEffect(() => {
    if (queueState === "queuing") {
      timerRef.current = setInterval(() => {
        setElapsedTime((t) => t + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (queueState === "idle") setElapsedTime(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [queueState]);

  // Ready check countdown
  useEffect(() => {
    if (queueState === "matched" && readyCheckExpiry > 0) {
      const interval = setInterval(() => {
        const remaining = Math.max(
          0,
          Math.ceil((readyCheckExpiry - Date.now()) / 1000)
        );
        if (remaining <= 0) {
          clearInterval(interval);
          setQueueState("idle");
          setMatchId(null);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [queueState, readyCheckExpiry]);

  // Poll for match when queuing
  useEffect(() => {
    if (queueState === "queuing") {
      pollRef.current = setInterval(async () => {
        try {
          // Check if we've been matched
          const res = await fetch(`/api/queue/status`);
          if (res.ok) {
            const data = await res.json();
            if (data.matchId) {
              setMatchId(data.matchId);
              setQueueState("matched");
              setReadyCheckExpiry(new Date(data.expiresAt).getTime());
            }
          }
        } catch (e) {
          // ignore
        }
      }, 2000);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [queueState]);

  const joinQueue = async () => {
    try {
      const res = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "SOLO", region }),
      });

      if (res.ok) {
        const data = await res.json();
        setQueueState("queuing");

        if (data.matchId) {
          // Immediately matched!
          setMatchId(data.matchId);
          setQueueState("matched");
          setReadyCheckExpiry(Date.now() + 30000);
        }
      } else {
        const error = await res.json();
        alert(error.error || "Failed to join queue");
      }
    } catch (e) {
      alert("Failed to join queue");
    }
  };

  const leaveQueue = async () => {
    try {
      await fetch("/api/queue", { method: "DELETE" });
      setQueueState("idle");
    } catch (e) {
      // ignore
    }
  };

  const acceptMatch = async () => {
    if (!matchId) return;
    try {
      const res = await fetch("/api/match/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      });

      if (res.ok) {
        const data = await res.json();
        setQueueState("accepted");
        setAcceptedCount(data.acceptedCount);

        if (data.allReady) {
          // Everyone accepted! Redirect to match page
          router.push(`/match/${matchId}`);
        } else {
          // Poll for others to accept
          const checkInterval = setInterval(async () => {
            const matchRes = await fetch(`/api/match/${matchId}`);
            if (matchRes.ok) {
              const matchData = await matchRes.json();
              const accepted = matchData.readyChecks?.filter(
                (rc: any) => rc.status === "ACCEPTED"
              ).length;
              setAcceptedCount(accepted || 0);

              if (
                matchData.status === "CONFIGURING" ||
                matchData.status === "WARMUP" ||
                matchData.status === "LIVE"
              ) {
                clearInterval(checkInterval);
                router.push(`/match/${matchId}`);
              } else if (matchData.status === "CANCELLED") {
                clearInterval(checkInterval);
                setQueueState("queuing");
                setMatchId(null);
              }
            }
          }, 1500);

          // Cleanup after 35 seconds
          setTimeout(() => clearInterval(checkInterval), 35000);
        }
      }
    } catch (e) {
      alert("Failed to accept match");
    }
  };

  const declineMatch = async () => {
    if (!matchId) return;
    try {
      await fetch("/api/match/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      });
      setQueueState("idle");
      setMatchId(null);
    } catch (e) {
      // ignore
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const readyCheckRemaining = Math.max(
    0,
    Math.ceil((readyCheckExpiry - Date.now()) / 1000)
  );

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-center mb-2">Find a Match</h1>
        <p className="text-gray-400 text-center mb-10">
          Queue up for a competitive 5v5 match
        </p>

        {/* Region Selector */}
        <div className="max-w-md mx-auto mb-8">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Server Region
          </label>
          <div className="grid grid-cols-2 gap-2">
            {REGIONS.map((r) => (
              <button
                key={r.value}
                onClick={() =>
                  queueState === "idle" && setRegion(r.value)
                }
                disabled={queueState !== "idle"}
                className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                  region === r.value
                    ? "bg-orange-500/10 border-orange-500/50 text-orange-400"
                    : "bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600"
                } ${queueState !== "idle" ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span className="mr-2">{r.flag}</span>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Queue Stats */}
        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-10">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-orange-400">
              {stats.soloCount}
            </p>
            <p className="text-xs text-gray-500 mt-1">Solo Queue</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-orange-400">
              {stats.teamCount}
            </p>
            <p className="text-xs text-gray-500 mt-1">Team Queue</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">
              {stats.matchesToday}
            </p>
            <p className="text-xs text-gray-500 mt-1">Matches Today</p>
          </div>
        </div>

        {/* Main Queue Button / Ready Check */}
        <div className="max-w-md mx-auto">
          {queueState === "idle" && (
            <button
              onClick={joinQueue}
              className="w-full py-6 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-2xl text-xl font-bold transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
            >
              Join Solo Queue
            </button>
          )}

          {queueState === "queuing" && (
            <div className="text-center">
              <div className="bg-gray-900 border border-orange-500/30 rounded-2xl p-8 mb-4">
                {/* Animated searching indicator */}
                <div className="flex items-center justify-center gap-2 mb-4">
                  <div className="w-3 h-3 bg-orange-400 rounded-full animate-bounce" />
                  <div
                    className="w-3 h-3 bg-orange-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <div
                    className="w-3 h-3 bg-orange-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                </div>
                <p className="text-xl font-semibold text-white mb-1">
                  Searching for match...
                </p>
                <p className="text-3xl font-mono text-orange-400 mb-1">
                  {formatTime(elapsedTime)}
                </p>
                <p className="text-sm text-gray-500">
                  {stats.soloCount} players in queue
                </p>
              </div>
              <button
                onClick={leaveQueue}
                className="px-8 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {queueState === "matched" && (
            <div className="text-center">
              <div className="bg-gray-900 border-2 border-green-500/50 rounded-2xl p-8 mb-4 animate-pulse">
                <p className="text-2xl font-bold text-green-400 mb-2">
                  Match Found!
                </p>
                <p className="text-5xl font-mono font-bold text-white mb-4">
                  {readyCheckRemaining}s
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={acceptMatch}
                    className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl text-lg font-bold transition-colors"
                  >
                    ACCEPT
                  </button>
                  <button
                    onClick={declineMatch}
                    className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-lg font-bold transition-colors"
                  >
                    DECLINE
                  </button>
                </div>
              </div>
            </div>
          )}

          {queueState === "accepted" && (
            <div className="text-center">
              <div className="bg-gray-900 border border-green-500/30 rounded-2xl p-8">
                <p className="text-xl font-semibold text-green-400 mb-2">
                  Accepted - Waiting for others
                </p>
                <p className="text-4xl font-bold text-white mb-2">
                  {acceptedCount}/10
                </p>
                <div className="flex gap-1 justify-center">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-8 h-2 rounded-full ${
                        i < acceptedCount
                          ? "bg-green-500"
                          : "bg-gray-700"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  Players accepting...
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="max-w-md mx-auto mt-10">
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">
              Queue Info
            </h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-orange-400 mt-0.5">-</span>
                Once 10 players are found, a ready check is sent
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-400 mt-0.5">-</span>
                You have 30 seconds to accept
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-400 mt-0.5">-</span>
                Teams are balanced by ELO rating
              </li>
              <li className="flex items-start gap-2">
                <span className="text-orange-400 mt-0.5">-</span>A
                dedicated server will be automatically provisioned
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
