import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Suspense } from "react";
import LiveStats from "@/components/landing/LiveStats";

export const dynamic = "force-dynamic";

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const SteamIcon = () => (
  <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.455 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.252 0-2.265-1.014-2.265-2.265z" />
  </svg>
);

// ─── Step Card ─────────────────────────────────────────────────────────────────

function StepCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="vgui-panel relative flex flex-col gap-3 p-5">
      <div
        className="absolute -top-3 left-4 flex h-6 min-w-6 items-center justify-center px-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-primary-foreground"
        style={{
          background: "var(--primary)",
          boxShadow: "0 2px 8px rgba(211,162,59,0.38)",
        }}
      >
        {number}
      </div>
      <div className="mt-2">
        <div className="text-xs font-black uppercase tracking-[0.22em] text-foreground">{title}</div>
        <div className="mt-1.5 text-[11px] font-mono leading-relaxed text-muted-foreground">
          {description}
        </div>
      </div>
    </div>
  );
}

// ─── Feature Card ──────────────────────────────────────────────────────────────

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div
      className="vgui-panel flex flex-col gap-3 p-5 transition-all duration-150 hover:border-primary/30"
      style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 28px rgba(0,0,0,0.32)" }}
    >
      <div
        className="flex h-9 w-9 items-center justify-center text-lg"
        style={{
          background: "linear-gradient(180deg, rgba(211,162,59,0.14), rgba(211,162,59,0.06))",
          border: "1px solid rgba(211,162,59,0.24)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        {icon}
      </div>
      <div>
        <div className="text-[11px] font-black uppercase tracking-[0.2em] text-foreground">
          {title}
        </div>
        <div className="mt-1.5 text-[11px] font-mono leading-relaxed text-muted-foreground">
          {description}
        </div>
      </div>
    </div>
  );
}

// ─── Stat Banner Item ─────────────────────────────────────────────────────────

function BannerStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-6 py-4 text-center">
      <div
        className="text-3xl font-black uppercase tracking-[0.04em] text-primary lg:text-4xl"
        style={{ textShadow: "0 0 24px rgba(211,162,59,0.38)" }}
      >
        {value}
      </div>
      <div className="text-[9px] font-mono uppercase tracking-[0.24em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

// ─── Grid background overlay ──────────────────────────────────────────────────

function GridOverlay() {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage:
          "linear-gradient(rgba(211,162,59,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(211,162,59,0.04) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
        maskImage: "radial-gradient(ellipse 80% 60% at 50% 50%, black 20%, transparent 100%)",
      }}
    />
  );
}

// ─── Error messages for auth failures ────────────────────────────────────────

const AUTH_ERRORS: Record<string, { title: string; body: string }> = {
  vac_banned: {
    title: "Access Denied: VAC Ban",
    body: "Your Steam account has an active VAC ban issued within the last 2 years. You cannot access FluidRush until the ban ages out.",
  },
  steam_auth_failed: {
    title: "Steam Authentication Failed",
    body: "We could not verify your Steam session. Please try again.",
  },
  steam_verify_failed: {
    title: "Steam Verification Error",
    body: "An error occurred while verifying your Steam identity. Please try again.",
  },
  steam_profile_error: {
    title: "Steam Profile Error",
    body: "Could not load your Steam profile. Please try again.",
  },
  steam_profile_failed: {
    title: "Steam Profile Not Found",
    body: "No Steam profile was found for your account.",
  },
  db_error: {
    title: "Database Error",
    body: "A server error occurred. Please try again later.",
  },
  token_error: {
    title: "Session Error",
    body: "Could not create your session. Please try again.",
  },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  const { error } = await searchParams;
  const errorInfo = error ? (AUTH_ERRORS[error] ?? { title: "Error", body: "An unknown error occurred." }) : null;

  return (
    /*
     * The layout adds lg:pl-[19rem] for the sidebar.
     * Unauthenticated users have no sidebar, so we pull back
     * the padding with a negative margin and set explicit full width.
     */
    <div className="relative lg:-ml-[19rem] lg:w-[calc(100%+19rem)]">

      {/* ── 1. HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-24">
        <GridOverlay />

        {/* Glow orbs */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: "640px",
            height: "320px",
            background: "radial-gradient(ellipse, rgba(211,162,59,0.09) 0%, transparent 70%)",
          }}
        />
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-48"
          style={{
            background: "linear-gradient(to bottom, transparent, var(--background))",
          }}
        />

        <div className="relative z-10 flex w-full max-w-3xl flex-col items-center text-center">
          {/* Eyebrow */}
          <div className="mb-6 flex items-center gap-3">
            <div
              className="h-px w-12"
              style={{ background: "linear-gradient(90deg, transparent, rgba(211,162,59,0.6))" }}
            />
            <span className="menu-title text-[0.62rem] text-primary">
              Matchmaking Interface v1.0
            </span>
            <div
              className="h-px w-12"
              style={{ background: "linear-gradient(90deg, rgba(211,162,59,0.6), transparent)" }}
            />
          </div>

          {/* Main title */}
          <h1
            className="text-[clamp(3.6rem,12vw,8.5rem)] font-black uppercase leading-none tracking-[0.28em] text-foreground"
            style={{ textShadow: "0 2px 0 rgba(0,0,0,0.7), 0 0 60px rgba(211,162,59,0.12)" }}
          >
            FLUIDRUSH
          </h1>
          <div
            className="mt-2 text-[clamp(0.9rem,2.5vw,1.4rem)] font-bold uppercase tracking-[0.72em] text-primary"
            style={{ textShadow: "0 0 20px rgba(211,162,59,0.5)" }}
          >
            SOURCE
          </div>

          {/* Divider */}
          <div
            className="my-7 h-px w-48"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(211,162,59,0.5) 40%, rgba(211,162,59,0.5) 60%, transparent)",
            }}
          />

          {/* Subtitle */}
          <p className="max-w-md text-[0.95rem] leading-relaxed tracking-wide text-[#c8c4b6]">
            Competitive 5v5 CS:GO Matchmaking.{" "}
            <span className="text-primary/80">128-tick dedicated servers.</span>{" "}
            Old-school presentation, modern orchestration.
          </p>

          {/* Live stats */}
          <div className="mt-8 w-full max-w-sm">
            <Suspense
              fallback={
                <div className="flex justify-center gap-8">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div className="h-6 w-16 animate-pulse rounded-sm bg-white/8" />
                      <div className="h-2.5 w-20 animate-pulse rounded-sm bg-white/5" />
                    </div>
                  ))}
                </div>
              }
            >
              <LiveStats />
            </Suspense>
          </div>

          {/* Error banner */}
          {errorInfo && (
            <div className="mt-8 w-full max-w-sm rounded border border-destructive/40 bg-destructive/10 px-4 py-3 text-left">
              <p className="text-xs font-black uppercase tracking-wider text-destructive">
                {errorInfo.title}
              </p>
              <p className="mt-1 text-xs text-destructive/80">{errorInfo.body}</p>
            </div>
          )}

          {/* CTA */}
          <div className="mt-10 flex w-full flex-col items-center gap-4">
            <a
              href="/api/steam"
              className="vgui-button group flex w-full max-w-xs items-center justify-center gap-3 px-6 py-4 text-sm font-black uppercase tracking-[0.22em] text-foreground"
              style={{
                background:
                  "linear-gradient(180deg, rgba(211,162,59,0.22) 0%, rgba(211,162,59,0.08) 100%)",
                borderColor: "rgba(211,162,59,0.4)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.5), 0 0 24px rgba(211,162,59,0.18)",
              }}
            >
              <SteamIcon />
              Initialize Steam Session
            </a>

            {/* Status indicators */}
            <div className="flex items-center divide-x divide-white/10">
              {[
                { label: "Tickrate", value: "128" },
                { label: "Region", value: "Mumbai" },
                { label: "Status", value: "Online" },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="flex items-center gap-1.5 px-4 first:pl-0 last:pr-0"
                >
                  {label === "Status" && (
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full bg-green-400"
                      style={{ boxShadow: "0 0 6px rgba(74,222,128,0.8)" }}
                    />
                  )}
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {label}:{" "}
                    <span
                      className={
                        label === "Status" ? "text-green-400" : "text-foreground/70"
                      }
                    >
                      {value}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 flex flex-col items-center gap-2 opacity-40">
          <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-muted-foreground">
            Scroll
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <div className="h-0.5 w-px bg-muted-foreground" />
            <div className="h-1 w-px bg-muted-foreground" />
            <div className="h-2 w-px bg-muted-foreground" />
          </div>
        </div>
      </section>

      {/* ── 2. STATS BANNER ─────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, rgba(12,13,14,0.95) 0%, rgba(18,20,22,0.98) 100%)",
          borderTop: "1px solid rgba(211,162,59,0.18)",
          borderBottom: "1px solid rgba(211,162,59,0.18)",
        }}
      >
        {/* Scanline accent */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.012) 2px, rgba(255,255,255,0.012) 4px)",
          }}
        />
        <div className="relative mx-auto flex max-w-4xl flex-wrap items-center justify-center divide-y divide-white/6 lg:divide-x lg:divide-y-0">
          <BannerStat value="1000" label="Starting ELO" />
          <BannerStat value="128" label="Tick Rate" />
          <BannerStat value="30s" label="Ready Check" />
          <BannerStat value="7" label="Active Maps" />
        </div>
      </section>

      {/* ── 3. HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 py-20 lg:px-8">
        <div className="mb-10 text-center">
          <div className="menu-title mb-3 text-[0.62rem] text-primary">Protocol</div>
          <h2
            className="text-2xl font-black uppercase tracking-[0.28em] text-foreground lg:text-3xl"
            style={{ textShadow: "0 1px 0 rgba(0,0,0,0.6)" }}
          >
            How It Works
          </h2>
          <div
            className="mx-auto mt-4 h-px w-24"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(211,162,59,0.5), transparent)",
            }}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StepCard
            number="01"
            title="Steam Auth"
            description="Authenticate via Steam OpenID. Your identity and inventory are verified instantly."
          />
          <StepCard
            number="02"
            title="Queue Up"
            description="Enter solo or team queue. ELO-based matchmaking pairs you against equal opponents."
          />
          <StepCard
            number="03"
            title="Ready Check"
            description="30-second window to confirm readiness. All 10 players must accept or match cancels."
          />
          <StepCard
            number="04"
            title="Play"
            description="Dedicated Azure VM spins up with your config. Connect token delivered in dashboard."
          />
        </div>

        {/* Connector line (desktop) */}
        <div className="relative mt-[-2.5rem] hidden lg:block">
          <div
            className="mx-auto h-px"
            style={{
              width: "calc(100% - 8rem)",
              background:
                "linear-gradient(90deg, transparent, rgba(211,162,59,0.22) 15%, rgba(211,162,59,0.22) 85%, transparent)",
            }}
          />
        </div>
      </section>

      {/* ── 4. FEATURES GRID ────────────────────────────────────────────────── */}
      <section
        className="relative py-20"
        style={{
          background:
            "linear-gradient(180deg, transparent, rgba(12,13,14,0.7) 20%, rgba(12,13,14,0.7) 80%, transparent)",
        }}
      >
        <div className="mx-auto max-w-5xl px-4 lg:px-8">
          <div className="mb-10 text-center">
            <div className="menu-title mb-3 text-[0.62rem] text-primary">Capabilities</div>
            <h2
              className="text-2xl font-black uppercase tracking-[0.28em] text-foreground lg:text-3xl"
              style={{ textShadow: "0 1px 0 rgba(0,0,0,0.6)" }}
            >
              Platform Features
            </h2>
            <div
              className="mx-auto mt-4 h-px w-24"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(211,162,59,0.5), transparent)",
              }}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon="◈"
              title="ELO Ranking"
              description="Glicko-style rating system. Win to climb, lose to drop — every match matters."
            />
            <FeatureCard
              icon="☁"
              title="Dedicated Servers"
              description="Azure-hosted VMs per match. Full 128-tick, low-latency, Mumbai region."
            />
            <FeatureCard
              icon="⊞"
              title="Team Queue"
              description="Pre-form a 5-stack and queue as a unit. Captain controls queue entry."
            />
            <FeatureCard
              icon="⊟"
              title="Map Voting"
              description="Pre-match map vote from the active 7-map pool. Majority wins, ties broken randomly."
            />
            <FeatureCard
              icon="⚙"
              title="Admin Panel"
              description="Privileged controls: ban management, match override, server diagnostics."
            />
            <FeatureCard
              icon="⊘"
              title="VAC Verification"
              description="Steam VAC and game-ban check on queue entry. Banned accounts cannot compete."
            />
          </div>
        </div>
      </section>

      {/* ── 5. RECENT MATCHES STRIP ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 py-16 lg:px-8">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full bg-green-400"
              style={{ boxShadow: "0 0 8px rgba(74,222,128,0.9)" }}
            />
            <span className="menu-title text-[0.62rem] text-green-400">Live Matches</span>
          </div>
          <div
            className="h-px flex-1"
            style={{
              background: "linear-gradient(90deg, rgba(74,222,128,0.2), transparent)",
            }}
          />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Mumbai · 128-tick
          </span>
        </div>

        <div className="space-y-2">
          {[
            { map: "de_dust2", score: "8 — 6", phase: "LIVE · 2nd Half", time: "38:12" },
            { map: "de_mirage", score: "11 — 4", phase: "LIVE · 1st Half", time: "22:47" },
            { map: "de_inferno", score: "16 — 9", phase: "COMPLETED", time: "55:03" },
          ].map((match, i) => (
            <div
              key={i}
              className="vgui-panel flex items-center justify-between gap-4 px-5 py-3"
              style={{
                background:
                  match.phase === "COMPLETED"
                    ? "linear-gradient(180deg, rgba(45,47,43,0.6), rgba(32,34,31,0.7))"
                    : "linear-gradient(180deg, rgba(55,58,52,0.7), rgba(42,45,40,0.8))",
              }}
            >
              <div className="flex items-center gap-3">
                {match.phase !== "COMPLETED" && (
                  <span
                    className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-green-400"
                    style={{ boxShadow: "0 0 6px rgba(74,222,128,0.9)" }}
                  />
                )}
                {match.phase === "COMPLETED" && (
                  <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-white/20" />
                )}
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
                  {match.map}
                </span>
              </div>
              <div className="font-black tracking-[0.12em] text-foreground">
                {match.score}
              </div>
              <div className="flex items-center gap-4">
                <span
                  className={`font-mono text-[10px] uppercase tracking-[0.14em] ${
                    match.phase === "COMPLETED" ? "text-muted-foreground" : "text-green-400"
                  }`}
                >
                  {match.phase}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground/60">
                  {match.time}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA REPEAT ──────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden py-20 text-center"
        style={{
          background:
            "linear-gradient(180deg, transparent, rgba(12,13,14,0.9) 30%, rgba(12,13,14,0.9) 70%, transparent)",
        }}
      >
        <GridOverlay />
        <div className="relative z-10 mx-auto max-w-lg px-4">
          <div className="menu-title mb-4 text-[0.62rem] text-primary">Ready to Compete?</div>
          <h2
            className="text-2xl font-black uppercase tracking-[0.28em] text-foreground lg:text-3xl"
            style={{ textShadow: "0 0 40px rgba(211,162,59,0.14)" }}
          >
            Enter the Queue
          </h2>
          <p className="mx-auto mt-4 max-w-xs text-[0.85rem] leading-relaxed text-muted-foreground">
            Connect your Steam account to access matchmaking, leaderboards, and team management.
          </p>
          <a
            href="/api/steam"
            className="vgui-button mt-8 inline-flex items-center gap-3 px-8 py-4 text-sm font-black uppercase tracking-[0.22em] text-foreground"
            style={{
              background:
                "linear-gradient(180deg, rgba(211,162,59,0.22) 0%, rgba(211,162,59,0.08) 100%)",
              borderColor: "rgba(211,162,59,0.4)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.5), 0 0 32px rgba(211,162,59,0.18)",
            }}
          >
            <SteamIcon />
            Initialize Steam Session
          </a>
        </div>
      </section>

      {/* ── 6. FOOTER ───────────────────────────────────────────────────────── */}
      <footer
        className="relative px-4 py-8"
        style={{
          borderTop: "1px solid rgba(199,194,173,0.1)",
          background: "rgba(10,11,12,0.9)",
        }}
      >
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="font-black uppercase tracking-[0.32em] text-foreground/60 text-xs">
              FLUIDRUSH
            </span>
            <span className="text-muted-foreground/40 text-xs">·</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/50">
              Build 1.0.24
            </span>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/40 text-center">
            Not affiliated with Valve Corporation
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/40">
            Legacy UI Layer · VGUI Inspired
          </div>
        </div>
      </footer>
    </div>
  );
}
