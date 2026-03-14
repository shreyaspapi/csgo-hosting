"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatMapName } from "@/lib/maps";

interface AdminOverview {
  users: Array<{
    id: string;
    displayName: string;
    steamId: string;
    avatar: string;
    elo: number;
    wins: number;
    losses: number;
    draws: number;
    isBanned: boolean;
    banReason: string | null;
    updatedAt: string;
  }>;
  matches: Array<{
    id: string;
    status: string;
    map: string;
    region: string;
    scoreTeamA: number;
    scoreTeamB: number;
    createdAt: string;
    queueEntries: Array<{ team: { name: string } | null }>;
  }>;
  servers: Array<{
    id: string;
    name: string;
    region: string;
    status: string;
    ip: string | null;
    port: number;
    currentMatchId: string | null;
    lastUsedAt: string | null;
  }>;
  queues: Array<{
    id: string;
    type: string;
    status: string;
    region: string;
    joinedAt: string;
    user: { id: string; displayName: string } | null;
    team: { id: string; name: string } | null;
  }>;
}

interface AdminReport {
  id: string;
  reason: string;
  description: string | null;
  status: string;
  createdAt: string;
  matchId: string | null;
  reporter: { id: string; displayName: string; avatar: string; steamId: string };
  reported: { id: string; displayName: string; avatar: string; steamId: string; isBanned: boolean };
}

type AdminTab = "overview" | "reports";

export default function AdminPanelClient() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [reportsTotal, setReportsTotal] = useState(0);
  const [reportsLoading, setReportsLoading] = useState(false);

  const load = async () => {
    const res = await fetch("/api/admin/overview");
    if (!res.ok) throw new Error("Failed to load admin overview");
    const json = await res.json();
    setData(json);
    setLoading(false);
  };

  const loadReports = async () => {
    setReportsLoading(true);
    try {
      const res = await fetch("/api/admin/reports?limit=50&offset=0");
      if (res.ok) {
        const json = await res.json();
        setReports(json.reports);
        setReportsTotal(json.total);
      }
    } finally {
      setReportsLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeTab === "reports") {
      loadReports();
    }
  }, [activeTab]);

  const runAction = async (url: string, body: object, key: string) => {
    setBusyKey(key);
    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      await load();
    } finally {
      setBusyKey(null);
    }
  };

  const runReportAction = async (reportId: string, action: "dismiss" | "ban", key: string) => {
    setBusyKey(key);
    try {
      await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, action }),
      });
      await loadReports();
    } finally {
      setBusyKey(null);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-muted-foreground">Loading admin panel...</div>;
  }

  if (!data) {
    return <div className="py-20 text-center text-destructive">Failed to load admin panel.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-2 border-b border-border pb-2">
        {(["overview", "reports"] as AdminTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-semibold capitalize transition-colors",
              activeTab === tab
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab}
            {tab === "reports" && reportsTotal > 0 && (
              <Badge variant="outline" className="ml-2 border-destructive/30 px-1.5 py-0 text-[10px] text-destructive">
                {reportsTotal}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {activeTab === "reports" && (
        <div className="space-y-4">
          {reportsLoading ? (
            <p className="py-8 text-center text-muted-foreground">Loading reports...</p>
          ) : reports.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No pending reports.</p>
          ) : (
            reports.map((report) => (
              <div key={report.id} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-start md:justify-between">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Reporter:</span>
                    <Avatar size="sm">
                      <AvatarImage src={report.reporter.avatar} />
                      <AvatarFallback>{report.reporter.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <Link href={`/players/${report.reporter.id}`} className="font-medium transition-colors hover:text-primary">
                      {report.reporter.displayName}
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Reported:</span>
                    <Avatar size="sm">
                      <AvatarImage src={report.reported.avatar} />
                      <AvatarFallback>{report.reported.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <Link href={`/players/${report.reported.id}`} className="font-medium transition-colors hover:text-primary">
                      {report.reported.displayName}
                    </Link>
                    {report.reported.isBanned && (
                      <Badge variant="outline" className="border-destructive/30 text-destructive">Already Banned</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="capitalize">{report.reason}</Badge>
                    {report.matchId && <span>Match: {report.matchId.slice(0, 8)}</span>}
                    {report.description && <span className="italic">&ldquo;{report.description}&rdquo;</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(report.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busyKey === `report-dismiss-${report.id}`}
                    onClick={() => runReportAction(report.id, "dismiss", `report-dismiss-${report.id}`)}
                  >
                    Dismiss
                  </Button>
                  {!report.reported.isBanned && (
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={busyKey === `report-ban-${report.id}`}
                      onClick={() => runReportAction(report.id, "ban", `report-ban-${report.id}`)}
                    >
                      Ban User
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-3 md:grid-cols-4">
            {[
              { label: "Tracked Users", value: data.users.length },
              { label: "Recent Matches", value: data.matches.length },
              { label: "Servers", value: data.servers.length },
              { label: "Queue Entries", value: data.queues.length },
            ].map((stat) => (
              <Card key={stat.label} size="sm">
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-primary">{stat.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Players</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.users.map((user) => (
                <div key={user.id} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar size="default">
                      <AvatarImage src={user.avatar} alt={user.displayName} />
                      <AvatarFallback>{user.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link href={`/players/${user.id}`} className="font-medium transition-colors hover:text-primary">
                          {user.displayName}
                        </Link>
                        {user.isBanned && <Badge variant="outline" className="border-destructive/30 text-destructive">Banned</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{user.steamId}</p>
                      {user.banReason && <p className="text-xs text-destructive">{user.banReason}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">{user.elo} ELO</span>
                    <Button
                      variant={user.isBanned ? "outline" : "destructive"}
                      size="sm"
                      disabled={busyKey === `user-${user.id}`}
                      onClick={() =>
                        runAction(
                          `/api/admin/users/${user.id}`,
                          user.isBanned
                            ? { action: "unban" }
                            : { action: "ban", reason: "Banned from admin panel" },
                          `user-${user.id}`
                        )
                      }
                    >
                      {user.isBanned ? "Unban" : "Ban"}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Matches</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.matches.map((match) => {
                const teamNames = match.queueEntries.map((entry) => entry.team?.name).filter(Boolean);
                return (
                  <div key={match.id} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link href={`/match/${match.id}`} className="font-medium transition-colors hover:text-primary">
                          Match #{match.id.slice(0, 8)}
                        </Link>
                        <Badge variant="outline">{match.status}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {teamNames.length === 2 ? `${teamNames[0]} vs ${teamNames[1]}` : "Solo lobby"} - {formatMapName(match.map)} - {match.region}
                      </p>
                      <p className="text-sm text-muted-foreground">{match.scoreTeamA} - {match.scoreTeamB}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busyKey === `match-cancel-${match.id}`}
                        onClick={() => runAction(`/api/admin/matches/${match.id}`, { action: "cancel" }, `match-cancel-${match.id}`)}
                      >
                        Cancel
                      </Button>
                      {["WARMUP", "KNIFE", "LIVE"].includes(match.status) && (
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={busyKey === `match-force-${match.id}`}
                          onClick={() => runAction(`/api/admin/matches/${match.id}`, { action: "force_end" }, `match-force-${match.id}`)}
                        >
                          Force End
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Servers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.servers.map((server) => (
                <div key={server.id} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{server.name}</span>
                      <Badge variant="outline" className={cn(server.status === "ERROR" && "border-destructive/30 text-destructive")}>
                        {server.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {server.region} - {server.ip ?? "No IP"}:{server.port}
                    </p>
                    {server.currentMatchId && (
                      <p className="text-sm text-muted-foreground">Current match: {server.currentMatchId.slice(0, 8)}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {["IN_USE", "AVAILABLE", "STARTING", "STOPPED"].includes(server.status) && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busyKey === `server-deallocate-${server.id}`}
                        onClick={() => runAction(`/api/admin/servers/${server.id}`, { action: "deallocate" }, `server-deallocate-${server.id}`)}
                      >
                        Deallocate
                      </Button>
                    )}
                    {["STOPPED", "ERROR"].includes(server.status) && (
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={busyKey === `server-delete-${server.id}`}
                        onClick={() => runAction(`/api/admin/servers/${server.id}`, { action: "delete" }, `server-delete-${server.id}`)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Queue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.queues.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">
                      {entry.type === "TEAM" ? entry.team?.name ?? "Unnamed Team" : entry.user?.displayName ?? "Unknown Player"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {entry.type} - {entry.status} - {entry.region}
                    </p>
                  </div>
                  <Badge variant="outline">{entry.type}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
