"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type QueueState = "idle" | "queuing" | "matched" | "accepted";

interface QueueStats {
  soloCount: number;
  teamCount: number;
  matchesToday: number;
}

const REGIONS = [
  { value: "centralindia", label: "Mumbai", sub: "India", flag: "🇮🇳" },
  { value: "southeastasia", label: "Singapore", sub: "SEA", flag: "🇸🇬" },
  { value: "westeurope", label: "Amsterdam", sub: "EU", flag: "🇪🇺" },
  { value: "eastus", label: "Virginia", sub: "US East", flag: "🇺🇸" },
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
    } catch (_e) {
      // non-critical
    }
  }, [region]);

  // Poll for stats every 3s
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

  // Poll for match every 2s while queuing
  useEffect(() => {
    if (queueState === "queuing") {
      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch("/api/queue/status");
          if (res.ok) {
            const data = await res.json();
            if (data.matchId) {
              setMatchId(data.matchId);
              setQueueState("matched");
              setReadyCheckExpiry(new Date(data.expiresAt).getTime());
            }
          }
        } catch (_e) {
          // non-critical
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
          setMatchId(data.matchId);
          setQueueState("matched");
          setReadyCheckExpiry(Date.now() + 30000);
        }
      } else {
        const error = await res.json();
        alert(error.error || "Failed to join queue");
      }
    } catch (_e) {
      alert("Failed to join queue");
    }
  };

  const leaveQueue = async () => {
    try {
      await fetch("/api/queue", { method: "DELETE" });
      setQueueState("idle");
    } catch (_e) {
      // non-critical
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
          router.push(`/match/${matchId}`);
        } else {
          // Poll match status every 1.5s
          const checkInterval = setInterval(async () => {
            try {
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
            } catch (_e) {
              // non-critical
            }
          }, 1500);

          setTimeout(() => clearInterval(checkInterval), 35000);
        }
      }
    } catch (_e) {
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
    } catch (_e) {
      // non-critical
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const readyCheckRemaining = Math.max(
    0,
    Math.ceil((readyCheckExpiry - Date.now()) / 1000)
  );

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Page Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold tracking-tight">Find a Match</h1>
          <p className="text-muted-foreground mt-2">
            Queue up for a competitive 5v5 match
          </p>
        </div>

        {/* Region Selector */}
        <div className="max-w-md mx-auto mb-8">
          <label className="block text-sm font-medium text-muted-foreground mb-3">
            Server Region
          </label>
          <div className="grid grid-cols-2 gap-2">
            {REGIONS.map((r) => (
              <Button
                key={r.value}
                variant={region === r.value ? "default" : "outline"}
                size="lg"
                disabled={queueState !== "idle"}
                onClick={() => setRegion(r.value)}
                className={cn(
                  "h-auto py-3 justify-start gap-2",
                  region === r.value &&
                    "bg-primary/10 text-primary border-primary/50 hover:bg-primary/20",
                  region !== r.value && "text-muted-foreground"
                )}
              >
                <span className="text-base">{r.flag}</span>
                <span>
                  {r.label}
                  <span className="text-xs opacity-70 ml-1">({r.sub})</span>
                </span>
              </Button>
            ))}
          </div>
        </div>

        {/* Queue Stats */}
        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-10">
          <Card size="sm">
            <CardContent className="text-center pt-1">
              <p className="text-2xl font-bold text-primary">
                {stats.soloCount}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Solo Queue</p>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent className="text-center pt-1">
              <p className="text-2xl font-bold text-primary">
                {stats.teamCount}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Team Queue</p>
            </CardContent>
          </Card>
          <Card size="sm">
            <CardContent className="text-center pt-1">
              <p className="text-2xl font-bold text-foreground">
                {stats.matchesToday}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Matches Today
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Queue Area */}
        <div className="max-w-md mx-auto">
          {/* Idle State */}
          {queueState === "idle" && (
            <Button
              onClick={joinQueue}
              size="lg"
              className="w-full py-7 text-xl font-bold rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all border-none"
            >
              Join Solo Queue
            </Button>
          )}

          {/* Queuing State */}
          {queueState === "queuing" && (
            <div className="flex flex-col items-center gap-4">
              <Card className="w-full border-primary/30">
                <CardContent className="flex flex-col items-center py-4">
                  {/* Bouncing dots animation */}
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-primary animate-bounce" />
                    <div
                      className="w-3 h-3 rounded-full bg-primary animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <div
                      className="w-3 h-3 rounded-full bg-primary animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                  <p className="text-xl font-semibold text-foreground mb-1">
                    Searching for match...
                  </p>
                  <p className="text-3xl font-mono text-primary mb-1">
                    {formatTime(elapsedTime)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {stats.soloCount} players in queue
                  </p>
                </CardContent>
              </Card>
              <Button variant="secondary" onClick={leaveQueue}>
                Cancel
              </Button>
            </div>
          )}

          {/* Matched State */}
          {queueState === "matched" && (
            <Card className="w-full border-2 border-green-500/50 animate-pulse">
              <CardContent className="flex flex-col items-center py-6">
                <Badge
                  variant="default"
                  className="bg-green-500/20 text-green-400 mb-3 text-sm px-3 py-1 h-auto"
                >
                  Match Found!
                </Badge>
                <p className="text-5xl font-mono font-bold text-foreground mb-5">
                  {readyCheckRemaining}s
                </p>
                <div className="flex gap-3">
                  <Button
                    onClick={acceptMatch}
                    size="lg"
                    className="px-8 py-5 text-lg font-bold bg-green-600 hover:bg-green-700 border-none h-auto"
                  >
                    ACCEPT
                  </Button>
                  <Button
                    onClick={declineMatch}
                    variant="destructive"
                    size="lg"
                    className="px-8 py-5 text-lg font-bold bg-red-600 hover:bg-red-700 text-white border-none h-auto"
                  >
                    DECLINE
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Accepted State */}
          {queueState === "accepted" && (
            <Card className="w-full border-green-500/30">
              <CardContent className="flex flex-col items-center py-6">
                <p className="text-xl font-semibold text-green-400 mb-2">
                  Accepted - Waiting for others
                </p>
                <p className="text-4xl font-bold text-foreground mb-4">
                  {acceptedCount}/10
                </p>
                <Progress
                  value={acceptedCount * 10}
                  className="w-full max-w-xs"
                />
                <p className="text-sm text-muted-foreground mt-4">
                  Players accepting...
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <Separator className="max-w-md mx-auto my-10" />

        {/* Info Section */}
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Queue Info</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">-</span>
                  Once 10 players are found, a ready check is sent
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">-</span>
                  You have 30 seconds to accept
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">-</span>
                  Teams are balanced by ELO rating
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">-</span>
                  A dedicated server will be automatically provisioned
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
