"use client";

import { useEffect, useState } from "react";

interface QueueStats {
  soloCount: number;
  teamCount: number;
  matchesToday: number;
}

export default function LiveStats() {
  const [stats, setStats] = useState<QueueStats | null>(null);

  useEffect(() => {
    fetch("/api/queue")
      .then((r) => r.json())
      .then((d: QueueStats) => setStats(d))
      .catch(() => {});
  }, []);

  const items = [
    { value: stats ? stats.soloCount + stats.teamCount : "—", label: "In Queue" },
    { value: stats ? stats.matchesToday : "—", label: "Matches Today" },
  ];

  return (
    <div className="flex items-center gap-6">
      {items.map(({ value, label }) => (
        <div key={label}>
          <div
            className="text-xl font-black tabular-nums text-foreground"
            style={{ textShadow: "0 0 12px rgba(211,162,59,0.25)" }}
          >
            {value}
          </div>
          <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.22em] text-muted-foreground">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
