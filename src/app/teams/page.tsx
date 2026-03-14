"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface TeamMemberView {
  id: string;
  joinedAt: string;
  user: {
    id: string;
    displayName: string;
    avatar: string;
    steamId: string;
    elo: number;
  };
}

interface TeamView {
  id: string;
  name: string;
  tag: string | null;
  captainId: string;
  members: TeamMemberView[];
  queueEntry?: {
    id: string;
    status: string;
    region: string;
    joinedAt: string;
    matchId: string | null;
  } | null;
}

export default function TeamsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [team, setTeam] = useState<TeamView | null>(null);
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState("");
  const [teamTag, setTeamTag] = useState("");
  const [memberSteamId, setMemberSteamId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTeam = async () => {
    const res = await fetch("/api/teams");
    const data = await res.json();
    setTeam(data.team ?? null);
    setLoading(false);
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      loadTeam().catch(() => {
        setError("Failed to load team");
        setLoading(false);
      });
    }
  }, [status]);

  const isCaptain = team?.captainId === session?.user?.id;
  const teamFull = (team?.members.length ?? 0) === 5;

  const createTeam = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName, tag: teamTag }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create team");
        return;
      }
      setTeam(data.team);
      setTeamName("");
      setTeamTag("");
    } catch {
      setError("Failed to create team");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addMember = async () => {
    if (!team) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${team.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steamId: memberSteamId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add player");
        return;
      }
      setTeam(data.team);
      setMemberSteamId("");
    } catch {
      setError("Failed to add player");
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!team) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${team.id}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to remove player");
        return;
      }
      setTeam(data.team);
    } catch {
      setError("Failed to remove player");
    } finally {
      setIsSubmitting(false);
    }
  };

  const leaveTeam = async () => {
    if (!team) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/teams/${team.id}/leave`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update team");
        return;
      }
      setTeam(null);
    } catch {
      setError("Failed to update team");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex h-64 items-center justify-center text-muted-foreground">Loading team...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold">Teams</h1>
          <p className="mt-1 text-muted-foreground">Create a 5-stack and queue together</p>
        </div>

        {error && (
          <Card className="mb-6 border-destructive/30 bg-destructive/5">
            <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
          </Card>
        )}

        {!team ? (
          <Card className="mx-auto max-w-xl">
            <CardHeader>
              <CardTitle>Create Your Team</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Team Name</label>
                <input
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
                  placeholder="FluidRush Five"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tag</label>
                <input
                  value={teamTag}
                  onChange={(e) => setTeamTag(e.target.value.toUpperCase().slice(0, 6))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
                  placeholder="FR"
                />
              </div>
              <Button className="w-full" onClick={createTeam} disabled={isSubmitting}>
                Create Team
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardContent className="flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold">{team.name}</h2>
                    {team.tag && <Badge variant="outline">{team.tag}</Badge>}
                    {teamFull && <Badge className="bg-primary/15 text-primary">Ready to Queue</Badge>}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {team.members.length}/5 players {team.queueEntry?.status === "WAITING" ? `- In queue for ${team.queueEntry.region}` : ""}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button render={<Link href="/queue" />}>
                    Open Queue
                  </Button>
                  <Button variant="outline" onClick={leaveTeam} disabled={isSubmitting}>
                    {isCaptain ? "Disband Team" : "Leave Team"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Roster</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {team.members.map((member) => {
                  const memberIsCaptain = member.user.id === team.captainId;
                  return (
                    <div
                      key={member.id}
                      className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar size="default">
                          <AvatarImage src={member.user.avatar} alt={member.user.displayName} />
                          <AvatarFallback>{member.user.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <Link href={`/players/${member.user.id}`} className="font-medium transition-colors hover:text-primary">
                              {member.user.displayName}
                            </Link>
                            {memberIsCaptain && <Badge variant="outline" className="border-yellow-500/30 text-yellow-400">Captain</Badge>}
                            {member.user.id === session?.user?.id && <Badge variant="outline" className="border-primary/30 text-primary">You</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">{member.user.steamId} - {member.user.elo} ELO</p>
                        </div>
                      </div>
                      {isCaptain && !memberIsCaptain && (
                        <Button variant="outline" size="sm" onClick={() => removeMember(member.user.id)} disabled={isSubmitting || team.queueEntry?.status === "WAITING"}>
                          Remove
                        </Button>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {isCaptain && (
              <Card>
                <CardHeader>
                  <CardTitle>Add Player</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Add a teammate by Steam64 ID. They need to have signed into FluidRush once so we can find them.
                  </p>
                  <div className="flex flex-col gap-3 md:flex-row">
                    <input
                      value={memberSteamId}
                      onChange={(e) => setMemberSteamId(e.target.value)}
                      className={cn(
                        "flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none",
                        team.queueEntry?.status === "WAITING" && "opacity-60"
                      )}
                      placeholder="7656119..."
                      disabled={isSubmitting || team.queueEntry?.status === "WAITING"}
                    />
                    <Button onClick={addMember} disabled={isSubmitting || team.queueEntry?.status === "WAITING"}>
                      Add Player
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
