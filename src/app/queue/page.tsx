"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  { value: "centralindia", label: "Mumbai", sub: "India — ~10ms" },
  { value: "southeastasia", label: "Singapore", sub: "SEA — ~40ms" },
  { value: "westeurope", label: "Amsterdam", sub: "EU — ~100ms" },
  { value: "eastus", label: "Virginia", sub: "US East — ~140ms" },
];

export default function QueuePage() {
  const { status } = useSession();
  const router = useRouter();

  const [queueState, setQueueState] = useState<QueueState>("idle");
  const [region, setRegion] = useState("centralindia");
  const [stats, setStats] = useState<QueueStats>({ soloCount: 0, teamCount: 0, matchesToday: 0 });
  const [elapsed, setElapsed] = useState(0);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [readyExpiry, setReadyExpiry] = useState(0);
  const [acceptedCount, setAcceptedCount] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/queue?region=${region}`);
      if (res.ok) setStats(await res.json());
    } catch { /* silent */ }
  }, [region]);

  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, 3000);
    return () => clearInterval(id);
  }, [fetchStats]);

  // Queue elapsed timer
  useEffect(() => {
    if (queueState === "queuing") {
      timerRef.current = setInterval(() => setElapsed(t => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (queueState === "idle") setElapsed(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [queueState]);

  // Poll for match
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
              setReadyExpiry(new Date(data.expiresAt).getTime());
            }
          }
        } catch { /* silent */ }
      }, 2000);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
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
          setReadyExpiry(Date.now() + 30000);
        }
      } else {
        const err = await res.json();
        alert(err.error || "Failed to join queue");
      }
    } catch { alert("Failed to join queue"); }
  };

  const leaveQueue = async () => {
    try { await fetch("/api/queue", { method: "DELETE" }); } catch { /* silent */ }
    setQueueState("idle");
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
        if (data.allReady) { router.push(`/match/${matchId}`); return; }
        const checkId = setInterval(async () => {
          try {
            const mRes = await fetch(`/api/match/${matchId}`);
            if (mRes.ok) {
              const m = await mRes.json();
              const acc = m.readyChecks?.filter((rc: { status: string }) => rc.status === "ACCEPTED").length ?? 0;
              setAcceptedCount(acc);
              if (["CONFIGURING","WARMUP","LIVE"].includes(m.status)) { clearInterval(checkId); router.push(`/match/${matchId}`); }
              else if (m.status === "CANCELLED") { clearInterval(checkId); setQueueState("queuing"); setMatchId(null); }
            }
          } catch { /* silent */ }
        }, 1500);
        setTimeout(() => clearInterval(checkId), 35000);
      }
    } catch { alert("Failed to accept match"); }
  };

  const declineMatch = async () => {
    if (!matchId) return;
    try {
      await fetch("/api/match/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      });
    } catch { /* silent */ }
    setQueueState("idle");
    setMatchId(null);
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const readyRemaining = Math.max(0, Math.ceil((readyExpiry - Date.now()) / 1000));

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex h-64 items-center justify-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold">Find a Match</h1>
          <p className="mt-1 text-muted-foreground">Queue up for a competitive 5v5 match</p>
        </div>

        {/* Region selector */}
        <div className="mb-8">
          <p className="mb-3 text-sm font-medium text-muted-foreground">Server Region</p>
          <div className="grid grid-cols-2 gap-2">
            {REGIONS.map((r) => (
              <button
                key={r.value}
                disabled={queueState !== "idle"}
                onClick={() => setRegion(r.value)}
                className={cn(
                  "flex flex-col rounded-lg border px-4 py-3 text-left text-sm transition-all",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  region === r.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card hover:border-primary/40 hover:bg-muted"
                )}
              >
                <span className="font-medium">{r.label}</span>
                <span className="text-xs text-muted-foreground">{r.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-3 gap-3">
          {[
            { label: "Solo Queue", value: stats.soloCount, color: "text-primary" },
            { label: "Team Queue", value: stats.teamCount, color: "text-primary" },
            { label: "Matches Today", value: stats.matchesToday, color: "text-foreground" },
          ].map((s) => (
            <Card key={s.label} size="sm">
              <CardContent className="pt-4 text-center">
                <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main action area */}
        <div className="mb-8">
          {queueState === "idle" && (
            <Button size="lg" className="w-full py-6 text-lg shadow-lg shadow-primary/20" onClick={joinQueue}>
              Join Solo Queue
            </Button>
          )}

          {queueState === "queuing" && (
            <Card className="text-center">
              <CardContent className="py-8">
                <div className="mb-4 flex items-center justify-center gap-1.5">
                  {[0, 0.15, 0.3].map((d, i) => (
                    <span
                      key={i}
                      className="size-2.5 animate-bounce rounded-full bg-primary"
                      style={{ animationDelay: `${d}s` }}
                    />
                  ))}
                </div>
                <p className="text-lg font-semibold">Searching for match...</p>
                <p className="mt-1 font-mono text-3xl font-bold text-primary">{fmt(elapsed)}</p>
                <p className="mt-1 text-sm text-muted-foreground">{stats.soloCount} player{stats.soloCount !== 1 ? "s" : ""} in queue</p>
                <Button variant="outline" size="sm" className="mt-6" onClick={leaveQueue}>
                  Cancel
                </Button>
              </CardContent>
            </Card>
          )}

          {queueState === "matched" && (
            <Card className="border-green-500/40 bg-green-500/5 text-center">
              <CardContent className="py-8">
                <Badge className="mb-3 animate-pulse bg-green-500/20 text-green-400 border-green-500/30">
                  Match Found!
                </Badge>
                <p className="font-mono text-6xl font-bold">{readyRemaining}s</p>
                <p className="mt-2 mb-6 text-sm text-muted-foreground">Accept to confirm your spot</p>
                <div className="flex justify-center gap-3">
                  <Button
                    size="lg"
                    className="bg-green-600 text-white hover:bg-green-700 px-10"
                    onClick={acceptMatch}
                  >
                    ACCEPT
                  </Button>
                  <Button variant="destructive" size="lg" className="px-10" onClick={declineMatch}>
                    DECLINE
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {queueState === "accepted" && (
            <Card className="border-primary/30 text-center">
              <CardContent className="py-8">
                <p className="text-lg font-semibold text-primary">Accepted — waiting for others</p>
                <p className="mt-1 font-mono text-4xl font-bold">{acceptedCount}/10</p>
                <Progress value={acceptedCount * 10} className="mx-auto mt-4 max-w-xs" />
                <p className="mt-3 text-sm text-muted-foreground">Players accepting...</p>
              </CardContent>
            </Card>
          )}
        </div>

        <Separator className="mb-8" />

        {/* Info */}
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Queue Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              <li>— 10 players needed to start a match</li>
              <li>— 30 seconds to accept the ready check</li>
              <li>— Teams balanced by ELO rating</li>
              <li>— A dedicated server is provisioned automatically</li>
              <li>— Declining forfeits your queue position</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
