"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { COMPETITIVE_MAPS, formatMapName } from "@/lib/maps";

type QueueState = "idle" | "queuing" | "matched" | "accepted";

interface QueueStats {
  soloCount: number;
  teamCount: number;
  matchesToday: number;
}

interface MapVoteCount {
  map: string;
  votes: number;
}

interface MatchVoteState {
  selectedMap: string;
  mapVotes: Array<{ userId: string; map: string }>;
  voteCounts: MapVoteCount[];
}

interface CurrentTeam {
  id: string;
  name: string;
  tag: string | null;
  captainId: string;
  members: Array<{
    id: string;
    user: {
      id: string;
      displayName: string;
      steamId: string;
      elo: number;
    };
  }>;
  queueEntry?: {
    status: string;
    region: string;
  } | null;
}

interface PartyMember {
  id: string;
  displayName: string;
  avatar: string;
  steamId: string;
  elo: number;
}

interface SearchResult {
  id: string;
  displayName: string;
  avatar: string;
  steamId: string;
  elo: number;
}

const REGIONS = [
  { value: "centralindia", label: "Mumbai", sub: "India — ~10ms" },
  { value: "southeastasia", label: "Singapore", sub: "SEA — ~40ms" },
  { value: "westeurope", label: "Amsterdam", sub: "EU — ~100ms" },
  { value: "eastus", label: "Virginia", sub: "US East — ~140ms" },
];

export default function QueuePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [queueState, setQueueState] = useState<QueueState>("idle");
  const [activeTab, setActiveTab] = useState<"INTERNET" | "TEAM" | "MAPS">("INTERNET");
  const [queueMode, setQueueMode] = useState<"SOLO" | "TEAM">("SOLO");
  const [region, setRegion] = useState("centralindia");
  const [stats, setStats] = useState<QueueStats>({ soloCount: 0, teamCount: 0, matchesToday: 0 });
  const [elapsed, setElapsed] = useState(0);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [readyExpiry, setReadyExpiry] = useState(0);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [matchVoteState, setMatchVoteState] = useState<MatchVoteState | null>(null);
  const [, setIsVoting] = useState(false);
  const [team, setTeam] = useState<CurrentTeam | null>(null);
  const [logs, setLogs] = useState<string[]>(["FluidRush VGUI Initialized..."]);

  // Party state
  const [partyMembers, setPartyMembers] = useState<PartyMember[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev.slice(-10), `> ${msg}`]);
  };

  // Party search with debounce
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          // Filter out users already in party
          const partyIds = new Set(partyMembers.map((m) => m.id));
          setSearchResults(data.users.filter((u: SearchResult) => !partyIds.has(u.id)));
        }
      } catch { /* silent */ }
      setIsSearching(false);
    }, 300);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [searchQuery, partyMembers]);

  const addToParty = (user: SearchResult) => {
    if (partyMembers.length >= 3) {
      addLog("ERROR: Party is full (max 4 including you)");
      return;
    }
    setPartyMembers((prev) => [...prev, user]);
    setSearchQuery("");
    setSearchResults([]);
    addLog(`${user.displayName} added to party`);
  };

  const removeFromParty = (userId: string) => {
    setPartyMembers((prev) => {
      const removed = prev.find((m) => m.id === userId);
      if (removed) addLog(`${removed.displayName} removed from party`);
      return prev.filter((m) => m.id !== userId);
    });
  };

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
    const id = setInterval(fetchStats, 5000);
    return () => clearInterval(id);
  }, [fetchStats]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const loadTeam = async () => {
      try {
        const res = await fetch("/api/teams");
        if (!res.ok) return;
        const data = await res.json();
        setTeam(data.team ?? null);
      } catch { /* silent */ }
    };

    const loadQueueState = async () => {
      try {
        const res = await fetch("/api/queue/status");
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === "waiting") {
          setQueueState("queuing");
          setQueueMode(data.type ?? "SOLO");
          addLog(`Re-joined existing ${data.type} queue...`);
        } else if (data.status === "matched") {
          setQueueState("matched");
          setQueueMode(data.type ?? "SOLO");
          setMatchId(data.matchId);
          setReadyExpiry(new Date(data.expiresAt).getTime());
          addLog("Match found! Ready check pending...");
        }
      } catch { /* silent */ }
    };

    loadTeam();
    loadQueueState();
  }, [status]);

  useEffect(() => {
    if (queueState === "queuing") {
      timerRef.current = setInterval(() => setElapsed(t => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (queueState === "idle") setElapsed(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [queueState]);

  useEffect(() => {
    if (!matchId || !["matched", "accepted"].includes(queueState)) return;
    const loadMatchVoteState = async () => {
      try {
        const res = await fetch(`/api/match/${matchId}`);
        if (!res.ok) return;
        const data = await res.json();
        setMatchVoteState({
          selectedMap: data.selectedMap ?? data.map,
          mapVotes: data.mapVotes ?? [],
          voteCounts: data.voteCounts ?? [],
        });
      } catch { /* silent */ }
    };
    loadMatchVoteState();
    const id = setInterval(loadMatchVoteState, 2000);
    return () => clearInterval(id);
  }, [matchId, queueState]);

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
              setQueueMode(data.type ?? queueMode);
              setReadyExpiry(new Date(data.expiresAt).getTime());
              addLog("MATCH READY: Incoming 5v5 Scrim!");
            }
          }
        } catch { /* silent */ }
      }, 2000);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [queueMode, queueState]);

  const joinQueue = async () => {
    const isParty = queueMode === "SOLO" && partyMembers.length > 0;
    addLog(`Initiating ${isParty ? `party (${partyMembers.length + 1})` : queueMode} matchmaking request...`);
    try {
      const payload = queueMode === "TEAM"
        ? { type: "TEAM", region, teamId: team?.id }
        : {
            type: "SOLO",
            region,
            ...(partyMembers.length > 0 ? { partyMemberIds: partyMembers.map((m) => m.id) } : {}),
          };
      const res = await fetch("/api/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        setQueueState("queuing");
        addLog(`Searching ${region} servers for suitable opponents...`);
        if (data.matchId) {
          setMatchId(data.matchId);
          setQueueState("matched");
          setReadyExpiry(Date.now() + 30000);
        }
      } else {
        const err = await res.json();
        addLog(`ERROR: ${err.error || "Queue entry failed"}`);
      }
    } catch { addLog("CRITICAL: Network failure during queue request"); }
  };

  const leaveQueue = async () => {
    addLog("Aborting matchmaking process...");
    try { await fetch("/api/queue", { method: "DELETE" }); } catch { /* silent */ }
    setQueueState("idle");
    setMatchId(null);
    setMatchVoteState(null);
  };

  const acceptMatch = async () => {
    if (!matchId) return;
    addLog("Ready check ACCEPTED. Waiting for other players...");
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
      }
    } catch { addLog("ERROR: Acceptance failed"); }
  };

  const declineMatch = async () => {
    if (!matchId) return;
    addLog("Ready check DECLINED. Returning to menu...");
    try {
      await fetch("/api/match/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      });
    } catch { /* silent */ }
    setQueueState("idle");
    setMatchId(null);
    setMatchVoteState(null);
  };

  const voteForMap = async (map: string) => {
    if (!matchId) return;
    setIsVoting(true);
    try {
      const res = await fetch(`/api/match/${matchId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ map }),
      });
      if (res.ok) addLog(`Vote cast for ${formatMapName(map)}`);
    } catch { /* silent */ } finally { setIsVoting(false); }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
  const [readyRemaining, setReadyRemaining] = useState(0);

  // Tick readyRemaining every second while in matched/accepted state
  useEffect(() => {
    if (!readyExpiry || !["matched", "accepted"].includes(queueState)) return;
    const tick = () => setReadyRemaining(Math.max(0, Math.ceil((readyExpiry - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [readyExpiry, queueState]);

  // Auto-decline when ready check timer expires
  const hasAutoDeclinedRef = useRef(false);
  useEffect(() => {
    if (queueState === "matched" && readyRemaining <= 0 && readyExpiry > 0 && !hasAutoDeclinedRef.current) {
      hasAutoDeclinedRef.current = true;
      addLog("Ready check EXPIRED — auto-declining...");
      declineMatch();
    }
    if (queueState !== "matched") {
      hasAutoDeclinedRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueState, readyRemaining, readyExpiry]);
  const isCaptain = team?.captainId === session?.user?.id;
  const teamReady = (team?.members.length ?? 0) === 5;
  const teamCanQueue = Boolean(team && isCaptain && teamReady);

  return (
    <div className="flex h-full items-center justify-center p-4">
      <Card className="w-full max-w-4xl shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between border-b border-[#444] bg-[#4c4c4c] p-1.5">
          <CardTitle className="px-2 text-xs font-bold uppercase tracking-widest text-[#e1e1e1]">
            Find Servers
          </CardTitle>
          <div className="flex gap-1 pr-1">
             <div className="h-4 w-4 border border-[#555] bg-[#3a3a3a] text-center text-[10px] leading-3">_</div>
             <div className="h-4 w-4 border border-[#555] bg-[#3a3a3a] text-center text-[10px] leading-3">X</div>
          </div>
        </CardHeader>

        {/* Tabs */}
        <div className="flex border-b border-[#444] bg-[#333] px-2 pt-2">
          {["INTERNET", "TEAM", "MAPS"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as "INTERNET" | "TEAM" | "MAPS")}
              className={cn(
                "px-4 py-1.5 text-[11px] font-bold uppercase tracking-tight transition-all",
                "border-t border-l border-r",
                activeTab === tab 
                  ? "border-[#444] border-b-[#222] bg-[#222] text-primary" 
                  : "border-transparent border-b-[#444] bg-[#3a3a3a] text-muted-foreground hover:bg-[#444]"
              )}
            >
              {tab}
            </button>
          ))}
          <div className="flex-1 border-b border-[#444]"></div>
        </div>

        <CardContent className="space-y-4 bg-[#222] p-4 font-sans">
          {/* Experiment Banner */}
          <div className="border border-primary/40 bg-primary/5 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse" style={{boxShadow:"0 0 6px rgba(255,157,0,0.6)"}} />
              <span className="text-xs font-black uppercase tracking-wide text-primary">Limited Experiment — March 19 - 23, 2026</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              FluidRush matchmaking is live as a <span className="text-[#e1e1e1] font-semibold">limited experiment from Thursday, March 19 through Sunday, March 23</span>.
              Dedicated CS:GO servers are expensive, so we are testing the waters to see if there is enough interest to keep this running.
              If matchmaking does not start outside these dates, that is expected — hang tight for the next window.
            </p>
            <div className="flex flex-wrap gap-3 mt-1">
              <span className="text-[10px] font-mono uppercase bg-[#1a1a1a] border border-[#444] px-2 py-0.5 text-[#e1e1e1]">Mumbai — India</span>
              <span className="text-[10px] font-mono uppercase bg-[#1a1a1a] border border-[#444] px-2 py-0.5 text-[#e1e1e1]">Singapore — SEA</span>
              <span className="text-[10px] font-mono uppercase bg-[#1a1a1a] border border-[#444] px-2 py-0.5 text-[#e1e1e1]">Amsterdam — EU</span>
              <span className="text-[10px] font-mono uppercase bg-[#1a1a1a] border border-[#444] px-2 py-0.5 text-[#e1e1e1]">Virginia — NA East</span>
            </div>
          </div>

          {/* Main List Area */}
          <div className="min-h-[300px] border border-[#444] bg-[#1a1a1a]">
            {activeTab === "INTERNET" && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>QUEUE</TableHead>
                    <TableHead className="w-28 text-center">SEARCHING</TableHead>
                    <TableHead className="w-28">REGION</TableHead>
                    <TableHead className="w-20 text-right">MODE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Solo Queue row */}
                  <TableRow
                    data-state={queueMode === "SOLO" ? "selected" : ""}
                    onClick={() => setQueueMode("SOLO")}
                    className="cursor-pointer"
                  >
                    <TableCell className="text-center text-[11px]">
                      {stats.soloCount > 0
                        ? <span className="inline-block h-2 w-2 rounded-full bg-green-400 animate-pulse" style={{boxShadow:"0 0 5px #4ade80"}} />
                        : <span className="inline-block h-2 w-2 rounded-full bg-[#444]" />
                      }
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-primary">Solo Matchmaking</div>
                      <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wide">
                        ELO-balanced · Captain draft · 128-tick
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn("font-mono font-bold text-sm tabular-nums", stats.soloCount > 0 ? "text-green-400" : "text-muted-foreground")}>
                        {stats.soloCount}
                      </span>
                      <span className="text-muted-foreground text-xs font-mono">
                        /{process.env.NEXT_PUBLIC_MATCH_THRESHOLD ?? "10"}
                      </span>
                      <div className="text-[9px] text-muted-foreground font-mono uppercase mt-0.5">
                        {stats.soloCount === 0 ? "no one searching" : stats.soloCount === 1 ? "1 player searching" : `${stats.soloCount} players searching`}
                      </div>
                    </TableCell>
                    <TableCell className="uppercase text-[11px] font-mono text-muted-foreground">{region}</TableCell>
                    <TableCell className="text-right text-[11px] font-mono text-muted-foreground">SOLO</TableCell>
                  </TableRow>

                  {/* Team Queue row */}
                  <TableRow
                    data-state={queueMode === "TEAM" ? "selected" : ""}
                    onClick={() => setQueueMode("TEAM")}
                    className="cursor-pointer"
                  >
                    <TableCell className="text-center text-[11px]">
                      {stats.teamCount > 0
                        ? <span className="inline-block h-2 w-2 rounded-full bg-green-400 animate-pulse" style={{boxShadow:"0 0 5px #4ade80"}} />
                        : <span className="inline-block h-2 w-2 rounded-full bg-[#444]" />
                      }
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-primary">Team Scrim</div>
                      <div className="text-[10px] text-muted-foreground font-mono uppercase tracking-wide">
                        5v5 pre-made teams · Requires full roster
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn("font-mono font-bold text-sm tabular-nums", stats.teamCount > 0 ? "text-green-400" : "text-muted-foreground")}>
                        {stats.teamCount}
                      </span>
                      <span className="text-muted-foreground text-xs font-mono">/2</span>
                      <div className="text-[9px] text-muted-foreground font-mono uppercase mt-0.5">
                        {stats.teamCount === 0 ? "no teams searching" : `${stats.teamCount} team${stats.teamCount > 1 ? "s" : ""} searching`}
                      </div>
                    </TableCell>
                    <TableCell className="uppercase text-[11px] font-mono text-muted-foreground">{region}</TableCell>
                    <TableCell className="text-right text-[11px] font-mono text-muted-foreground">5V5</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}

            {/* Party Builder (shown when SOLO mode is selected in INTERNET tab) */}
            {activeTab === "INTERNET" && queueMode === "SOLO" && queueState === "idle" && (
              <div className="border-t border-[#444] bg-[#1a1a1a] p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                    Party ({partyMembers.length + 1}/4)
                  </span>
                  {partyMembers.length > 0 && (
                    <button
                      onClick={() => { setPartyMembers([]); addLog("Party cleared"); }}
                      className="text-[9px] text-red-400 hover:text-red-300 uppercase font-mono"
                    >
                      Clear Party
                    </button>
                  )}
                </div>

                {/* Current party members */}
                {partyMembers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {partyMembers.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-1.5 bg-[#2a2a2a] border border-[#444] px-2 py-1 group"
                      >
                        <img src={m.avatar} alt="" className="w-4 h-4 rounded-sm" />
                        <span className="text-[10px] text-[#e1e1e1] font-mono">{m.displayName}</span>
                        <span className="text-[9px] text-muted-foreground font-mono">({m.elo})</span>
                        <button
                          onClick={() => removeFromParty(m.id)}
                          className="text-[10px] text-red-500 hover:text-red-400 ml-1 opacity-50 group-hover:opacity-100"
                        >
                          X
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Search to add */}
                {partyMembers.length < 3 && (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search players to add..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#0d0d0d] border border-[#444] text-[11px] text-[#e1e1e1] p-1.5 font-mono outline-none focus:border-primary placeholder:text-[#555]"
                    />
                    {isSearching && (
                      <span className="absolute right-2 top-1.5 text-[9px] text-muted-foreground animate-pulse">...</span>
                    )}
                    {searchResults.length > 0 && (
                      <div className="absolute z-20 w-full mt-0.5 bg-[#1a1a1a] border border-[#444] max-h-40 overflow-y-auto">
                        {searchResults.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => addToParty(u)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-[#333] border-b border-[#333] last:border-0"
                          >
                            <img src={u.avatar} alt="" className="w-5 h-5 rounded-sm" />
                            <span className="text-[10px] text-[#e1e1e1] font-mono flex-1">{u.displayName}</span>
                            <span className="text-[9px] text-muted-foreground font-mono">ELO {u.elo}</span>
                            <span className="text-[9px] text-primary font-bold">+ ADD</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {partyMembers.length === 0 && (
                  <p className="text-[9px] text-[#555] font-mono">
                    Queue solo or add up to 3 friends. Party members stay on the same team.
                  </p>
                )}
              </div>
            )}

            {activeTab === "TEAM" && (
              <div className="p-4 space-y-4">
                {!team ? (
                  <div className="text-center py-10">
                    <p className="text-sm text-muted-foreground uppercase font-mono mb-4">NO ACTIVE TEAM MEMBERSHIP DETECTED</p>
                    <Button variant="default" size="sm" render={<Link href="/teams" />}>CREATE TEAM</Button>
                  </div>
                ) : (
                  <>
                    <div className="bg-[#2a2a2a] p-3 border border-[#444] flex justify-between items-center">
                      <div>
                        <h3 className="text-primary font-bold uppercase">{team.name} [{team.tag}]</h3>
                        <p className="text-[10px] text-muted-foreground uppercase">Captain: {team.members.find(m => m.user.id === team.captainId)?.user.displayName}</p>
                      </div>
                      <Badge variant="outline" className={cn(teamReady ? "border-green-500 text-green-500" : "border-yellow-500 text-yellow-500")}>
                        {team.members.length}/5 PLAYERS
                      </Badge>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>MEMBER</TableHead>
                          <TableHead className="text-right">ELO</TableHead>
                          <TableHead className="text-right">STATUS</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {team.members.map((m) => (
                          <TableRow key={m.id}>
                            <TableCell className="font-bold">{m.user.displayName}</TableCell>
                            <TableCell className="text-right font-mono">{m.user.elo}</TableCell>
                            <TableCell className="text-right text-green-500 text-[10px] font-bold">READY</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </div>
            )}

            {activeTab === "MAPS" && (
              <div className="grid grid-cols-3 gap-2 p-4">
                 {COMPETITIVE_MAPS.map(map => {
                   const count = matchVoteState?.voteCounts.find(v => v.map === map)?.votes ?? 0;
                   return (
                     <div key={map} className="border border-[#444] bg-[#2a2a2a] p-2 flex flex-col items-center group cursor-pointer hover:border-primary" onClick={() => voteForMap(map)}>
                        <div className="text-[10px] font-bold text-muted-foreground mb-1">{formatMapName(map)}</div>
                        <div className="text-lg font-black text-white group-hover:text-primary">{count}</div>
                        <div className="text-[9px] uppercase tracking-tighter text-muted-foreground">Votes</div>
                     </div>
                   );
                 })}
              </div>
            )}
          </div>

          {/* Bottom Control Area */}
          <div className="grid grid-cols-12 gap-4">
             {/* Logs / Console */}
             <div className="col-span-8 border border-[#444] bg-[#0d0d0d] p-2 font-mono text-[10px] text-muted-foreground">
                {logs.map((log, i) => (
                  <div key={i} className={cn(log.includes("ERROR") ? "text-red-500" : log.includes("READY") ? "text-green-500" : "")}>
                    {log}
                  </div>
                ))}
                   {queueState === "queuing" && (
                    <div className="text-primary animate-pulse mt-1">
                      [SEARCHING] {stats.soloCount} / {process.env.NEXT_PUBLIC_MATCH_THRESHOLD ?? "10"} players · ELAPSED: {fmt(elapsed)}{partyMembers.length > 0 ? ` · PARTY(${partyMembers.length + 1})` : ""} ...
                    </div>
                  )}
             </div>

             {/* Region Selector */}
             <div className="col-span-4 space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">Region Selector</label>
                <select 
                  value={region} 
                  onChange={(e) => setRegion(e.target.value)}
                  disabled={queueState !== "idle"}
                  className="w-full bg-[#1a1a1a] border border-[#444] text-[11px] text-[#e1e1e1] p-1 font-mono outline-none focus:border-primary"
                >
                  {REGIONS.map(r => <option key={r.value} value={r.value}>{r.label.toUpperCase()}</option>)}
                </select>
                
                <div className="grid grid-cols-2 gap-2 mt-4">
                   {queueState === "idle" ? (
                       <Button className="w-full h-10 col-span-2" onClick={joinQueue} disabled={queueMode === "TEAM" && !teamCanQueue}>
                         {partyMembers.length > 0 ? `FIND MATCH (PARTY OF ${partyMembers.length + 1})` : "FIND MATCH"}
                       </Button>
                     ) : (
                       <Button variant="destructive" className="w-full h-10 col-span-2" onClick={leaveQueue}>
                         CANCEL SEARCH
                       </Button>
                     )}
                </div>
             </div>
          </div>
        </CardContent>

        {/* Modal Overlays for Matchmaking States */}
        {queueState === "matched" && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
             <Card className="w-80 border-2 border-primary shadow-[0_0_20px_rgba(255,157,0,0.3)]">
                <CardHeader className="bg-primary text-black py-1">
                  <CardTitle className="text-[10px] font-black italic">! EMERGENCY BROADCAST !</CardTitle>
                </CardHeader>
                <CardContent className="p-6 text-center space-y-4">
                   <div className="text-4xl font-black text-white font-mono tracking-tighter">
                     {readyRemaining}s
                   </div>
                   <p className="text-xs uppercase font-bold text-primary">Match Ready. Deploying soon.</p>
                   <div className="flex gap-2">
                     <Button className="flex-1 bg-green-600 border-green-700 hover:bg-green-500 text-white" onClick={acceptMatch}>ACCEPT</Button>
                     <Button variant="destructive" className="flex-1" onClick={declineMatch}>QUIT</Button>
                   </div>
                </CardContent>
             </Card>
          </div>
        )}

        {queueState === "accepted" && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
             <Card className="w-80 border border-[#444]">
                <CardHeader className="bg-[#4c4c4c] py-1">
                  <CardTitle className="text-[10px]">AUTHENTICATING PLAYERS</CardTitle>
                </CardHeader>
                <CardContent className="p-6 text-center space-y-4">
                    <div className="text-2xl font-black text-primary font-mono">
                      {acceptedCount} / {process.env.NEXT_PUBLIC_MATCH_THRESHOLD ?? "10"}
                    </div>
                    <Progress
                      value={(acceptedCount / parseInt(process.env.NEXT_PUBLIC_MATCH_THRESHOLD ?? "10")) * 100}
                      className="h-2 border border-[#444] bg-black/40 [&>div]:bg-primary"
                    />
                   <p className="text-[10px] uppercase text-muted-foreground animate-pulse">Waiting for server response...</p>
                </CardContent>
             </Card>
          </div>
        )}
      </Card>
    </div>
  );
}
