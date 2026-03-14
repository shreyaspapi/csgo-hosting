"use client";

import { useEffect, useState } from "react";

interface QueueStats {
  soloCount: number;
  teamCount: number;
  matchesToday: number;
}

function StatItem({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-5">
      <div
        className="text-xl font-black tabular-nums tracking-[0.06em] text-foreground"
        style={{ textShadow: "0 0 16px rgba(211,162,59,0.3)" }}
      >
        {value}
      </div>
      <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

export default function LiveStats() {
  const [stats, setStats] = useState<QueueStats | null>(null);

  useEffect(() => {
    fetch("/api/queue")
      .then((r) => r.json())
      .then((data: QueueStats) => setStats(data))
      .catch(() => {/* silently fail – show dashes */});
  }, []);

  const queueCount = stats ? stats.soloCount + stats.teamCount : "—";
  const matchesToday = stats ? stats.matchesToday : "—";

  return (
    <div
      className="flex items-center justify-center divide-x"
      style={{ borderColor: "rgba(255,255,255,0.08)" }}
    >
      <StatItem value={queueCount} label="In Queue" />
      <StatItem value={matchesToday} label="Matches Today" />
      <StatItem value="128" label="Tick Rate" />
    </div>
  );
}
