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

export default function AdminPanelClient() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = async () => {
    const res = await fetch("/api/admin/overview");
    if (!res.ok) throw new Error("Failed to load admin overview");
    const json = await res.json();
    setData(json);
    setLoading(false);
  };

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

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

  if (loading) {
    return <div className="py-20 text-center text-muted-foreground">Loading admin panel...</div>;
  }

  if (!data) {
    return <div className="py-20 text-center text-destructive">Failed to load admin panel.</div>;
  }

  return (
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
  );
}
