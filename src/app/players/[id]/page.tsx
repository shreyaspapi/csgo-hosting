import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatMapName } from "@/lib/maps";

export const dynamic = "force-dynamic";

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await getServerSession(authOptions); // keep for auth check / future isMe logic
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    notFound();
  }

  const [rankAbove, recentMatches] = await Promise.all([
    prisma.user.count({
      where: { elo: { gt: user.elo } },
    }),
    prisma.matchPlayer.findMany({
      where: { userId: user.id },
      include: {
        match: {
          select: {
            id: true,
            status: true,
            map: true,
            scoreTeamA: true,
            scoreTeamB: true,
            createdAt: true,
          },
        },
      },
      orderBy: { match: { createdAt: "desc" } },
      take: 10,
    }),
  ]);

  const winRate =
    user.wins + user.losses > 0
      ? Math.round((user.wins / (user.wins + user.losses)) * 100)
      : 0;

  return (
    <div className="flex h-full items-center justify-center p-4">
      <Card className="w-full max-w-4xl shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between border-b border-[#444] bg-[#4c4c4c] p-1.5">
          <CardTitle className="px-2 text-xs font-bold uppercase tracking-widest text-[#e1e1e1]">
            Options
          </CardTitle>
          <div className="flex gap-1 pr-1">
             <div className="h-4 w-4 border border-[#555] bg-[#3a3a3a] text-center text-[10px] leading-3">X</div>
          </div>
        </CardHeader>

        {/* Tabs - Classic Multiplayer style */}
        <div className="flex border-b border-[#444] bg-[#333] px-2 pt-2">
          {["Multiplayer", "Keyboard", "Mouse", "Audio", "Video"].map((tab) => (
            <div
              key={tab}
              className={cn(
                "px-4 py-1.5 text-[11px] font-bold uppercase tracking-tight cursor-default",
                "border-t border-l border-r",
                tab === "Multiplayer" 
                  ? "border-[#444] border-b-[#222] bg-[#222] text-primary" 
                  : "border-transparent border-b-[#444] bg-[#3a3a3a] text-muted-foreground opacity-50"
              )}
            >
              {tab}
            </div>
          ))}
          <div className="flex-1 border-b border-[#444]"></div>
        </div>

        <CardContent className="bg-[#222] p-8 font-sans">
          <div className="grid grid-cols-12 gap-8">
            {/* Left: Player Avatar Area */}
            <div className="col-span-4 flex flex-col items-center gap-4">
              <div className="relative p-1 border-2 border-[#555] bg-[#0d0d0d] shadow-inner">
                <Avatar className="size-48 rounded-none border border-[#333]">
                  <AvatarImage src={user.avatarFull ?? user.avatar} alt={user.displayName} />
                  <AvatarFallback className="rounded-none bg-[#1a1a1a] text-4xl font-black text-primary">
                    {user.displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 -right-2 bg-primary px-2 py-0.5 text-[10px] font-black text-black italic">
                   RANK #{rankAbove + 1}
                </div>
              </div>
              
              <div className="w-full space-y-2 mt-4">
                 <label className="text-[10px] font-bold text-muted-foreground uppercase">Player Model</label>
                 <div className="bg-[#1a1a1a] border border-[#444] p-2 text-center text-xs font-bold text-[#888] italic">
                   GSG-9 / ELITE CREW
                 </div>
                 <Button variant="secondary" className="w-full text-[10px] h-7">ADVANCED...</Button>
              </div>
            </div>

            {/* Right: Stats and Settings */}
            <div className="col-span-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Player Name</label>
                  <div className="vgui-input w-full text-sm font-bold text-primary">{user.displayName}</div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Skill Rating</label>
                  <div className="vgui-input w-full text-sm font-bold text-green-500">{user.elo} ELO</div>
                </div>
              </div>

              <Separator className="bg-[#444]" />

              <div className="space-y-3">
                 <label className="text-[10px] font-bold text-muted-foreground uppercase">Combat Performance</label>
                 <div className="grid grid-cols-4 gap-2">
                    {[
                      { l: "Wins", v: user.wins, c: "text-green-500" },
                      { l: "Losses", v: user.losses, c: "text-red-500" },
                      { l: "Draws", v: user.draws, c: "text-yellow-500" },
                      { l: "Win %", v: `${winRate}%`, c: "text-primary" },
                    ].map(s => (
                      <div key={s.l} className="bg-[#1a1a1a] border border-[#333] p-2 text-center">
                        <div className={cn("text-lg font-black font-mono", s.c)}>{s.v}</div>
                        <div className="text-[9px] uppercase font-bold text-muted-foreground">{s.l}</div>
                      </div>
                    ))}
                 </div>
              </div>

              <div className="space-y-3">
                 <label className="text-[10px] font-bold text-muted-foreground uppercase">Mission History</label>
                 <div className="border border-[#444] bg-[#1a1a1a] max-h-48 overflow-y-auto font-mono text-[10px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>DATE</TableHead>
                          <TableHead>MAP</TableHead>
                          <TableHead>RESULT</TableHead>
                          <TableHead className="text-right">ELO</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentMatches.map((mp) => {
                          const won = (mp.team === "TEAM_A" && mp.match.scoreTeamA > mp.match.scoreTeamB) ||
                                      (mp.team === "TEAM_B" && mp.match.scoreTeamB > mp.match.scoreTeamA);
                          const lost = (mp.team === "TEAM_A" && mp.match.scoreTeamA < mp.match.scoreTeamB) ||
                                       (mp.team === "TEAM_B" && mp.match.scoreTeamB < mp.match.scoreTeamA);
                          return (
                            <TableRow key={mp.id}>
                              <TableCell className="text-muted-foreground">{new Date(mp.match.createdAt).toLocaleDateString()}</TableCell>
                              <TableCell className="font-bold">{formatMapName(mp.match.map)}</TableCell>
                              <TableCell className={cn("font-black", won ? "text-green-500" : lost ? "text-red-500" : "text-yellow-500")}>
                                {won ? "SUCCESS" : lost ? "FAILED" : "DRAW"}
                              </TableCell>
                              <TableCell className={cn("text-right font-bold", mp.eloChange > 0 ? "text-green-500" : "text-red-500")}>
                                {mp.eloChange > 0 ? "+" : ""}{mp.eloChange}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                 </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex justify-end gap-2 border-t border-[#444] pt-4">
             <Button variant="secondary" size="sm" className="w-24 border-[#555]" render={<Link href="/leaderboard" />}>OK</Button>
             <Button variant="secondary" size="sm" className="w-24 border-[#555]" render={<Link href="/dashboard" />}>CANCEL</Button>
             <Button variant="default" size="sm" className="w-24 border-[#555]" render={<a href={user.profileUrl || "#"} target="_blank" rel="noreferrer" />}>APPLY</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
