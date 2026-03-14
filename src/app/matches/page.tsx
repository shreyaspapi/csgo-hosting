"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMapName } from "@/lib/maps";
import { cn } from "@/lib/utils";

interface MatchHistoryEntry {
  matchId: string;
  status: string;
  map: string;
  region: string;
  scoreTeamA: number;
  scoreTeamB: number;
  team: "TEAM_A" | "TEAM_B";
  kills: number;
  deaths: number;
  assists: number;
  eloChange: number;
  result: "win" | "loss" | "draw" | "unknown";
  duration: number | null;
  createdAt: string;
  finishedAt: string | null;
}

const STATUS_OPTIONS = ["All", "FINISHED", "LIVE", "CANCELLED"] as const;

const RESULT_STYLE: Record<string, string> = {
  win: "border-green-500/30 bg-green-500/10 text-green-400",
  loss: "border-destructive/30 bg-destructive/10 text-destructive",
  draw: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
  unknown: "border-border bg-muted text-muted-foreground",
};

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function MatchHistoryPage() {
  const { status: authStatus } = useSession();
  const router = useRouter();

  const [matches, setMatches] = useState<MatchHistoryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [regionFilter, setRegionFilter] = useState<string>("");

  const LIMIT = 20;

  const fetchMatches = useCallback(
    async (offset: number, append: boolean) => {
      if (offset === 0) setLoading(true);
      else setLoadingMore(true);

      try {
        const params = new URLSearchParams({
          limit: String(LIMIT),
          offset: String(offset),
        });
        if (statusFilter !== "All") params.set("status", statusFilter);
        if (regionFilter) params.set("region", regionFilter);

        const res = await fetch(`/api/matches?${params.toString()}`);
        if (!res.ok) return;
        const data = await res.json();
        setMatches((prev) => (append ? [...prev, ...data.matches] : data.matches));
        setTotal(data.total);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [statusFilter, regionFilter]
  );

  // Refetch when filters change
  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/");
      return;
    }
    if (authStatus === "authenticated") {
      fetchMatches(0, false);
    }
  }, [authStatus, fetchMatches, router]);

  const loadMore = () => {
    fetchMatches(matches.length, true);
  };

  if (authStatus === "loading" || loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-10">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold uppercase tracking-wide">Match History</h1>
        <p className="mt-1 text-sm text-muted-foreground">{total} matches found</p>
      </div>

      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors",
                statusFilter === s
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/20 hover:text-foreground"
              )}
            >
              {s === "All" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Region filter..."
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
          className="rounded border border-border bg-background px-3 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
      </div>

      {/* Table */}
      {matches.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">No matches found.</div>
      ) : (
        <div className="space-y-2">
          {/* Header row */}
          <div className="hidden grid-cols-[1.5fr_1fr_0.7fr_0.7fr_1fr_0.8fr_0.7fr] gap-3 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground md:grid">
            <span>Date / Map</span>
            <span>Result</span>
            <span>Score</span>
            <span>K/D/A</span>
            <span>ELO</span>
            <span>Duration</span>
            <span></span>
          </div>

          {matches.map((m) => (
            <div
              key={m.matchId}
              className={cn(
                "grid grid-cols-1 gap-2 rounded-lg border bg-card p-4 transition-colors hover:border-primary/30 md:grid-cols-[1.5fr_1fr_0.7fr_0.7fr_1fr_0.8fr_0.7fr] md:items-center md:gap-3"
              )}
            >
              {/* Date / Map */}
              <div>
                <p className="text-sm font-semibold">{formatMapName(m.map)}</p>
                <p className="text-xs text-muted-foreground">{formatDate(m.createdAt)}</p>
                <p className="text-[10px] text-muted-foreground">{m.region}</p>
              </div>

              {/* Result */}
              <div>
                <Badge
                  variant="outline"
                  className={cn("capitalize", RESULT_STYLE[m.result])}
                >
                  {m.result === "unknown" ? m.status.toLowerCase() : m.result}
                </Badge>
              </div>

              {/* Score */}
              <div className="text-sm font-bold tabular-nums">
                {m.scoreTeamA}–{m.scoreTeamB}
              </div>

              {/* K/D/A */}
              <div className="text-sm tabular-nums">
                <span className="font-semibold">{m.kills}</span>
                <span className="text-muted-foreground">/</span>
                <span className="font-semibold">{m.deaths}</span>
                <span className="text-muted-foreground">/</span>
                <span className="font-semibold">{m.assists}</span>
              </div>

              {/* ELO change */}
              <div>
                {m.eloChange !== 0 ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs tabular-nums",
                      m.eloChange > 0
                        ? "border-green-500/30 text-green-400"
                        : "border-destructive/30 text-destructive"
                    )}
                  >
                    {m.eloChange > 0 ? "+" : ""}
                    {m.eloChange}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>

              {/* Duration */}
              <div className="text-xs text-muted-foreground">
                {m.duration != null ? formatDuration(m.duration) : "—"}
              </div>

              {/* Link */}
              <div>
                <Link
                  href={`/match/${m.matchId}`}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  View
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {matches.length < total && (
        <div className="mt-6 text-center">
          <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Loading..." : `Load More (${total - matches.length} remaining)`}
          </Button>
        </div>
      )}
    </div>
  );
}
