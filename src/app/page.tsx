import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Suspense } from "react";
import LiveStats from "@/components/landing/LiveStats";

export const dynamic = "force-dynamic";

const AUTH_ERRORS: Record<string, string> = {
  vac_banned:           "Access denied — VAC ban on record (< 2 years).",
  steam_auth_failed:    "Steam verification failed. Please try again.",
  steam_verify_failed:  "Could not verify Steam session. Try again.",
  steam_profile_error:  "Error loading Steam profile.",
  steam_profile_failed: "Steam profile not found.",
  db_error:             "Server error. Please try again.",
  token_error:          "Session error. Please try again.",
};

// ─── Steam Icon ───────────────────────────────────────────────────────────────
function SteamIcon() {
  return (
    <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0z" />
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  const { error } = await searchParams;
  const errorMsg = error ? (AUTH_ERRORS[error] ?? "An error occurred.") : null;

  return (
    /*
     * Navbar returns null on "/" for unauthenticated users, so there's
     * no sidebar. AppShell also skips the padding offset for unauth users.
     * This div therefore gets the full viewport canvas.
     */
    <div className="relative flex h-screen w-screen items-center overflow-hidden">

      {/* ── Background accent — subtle left-side glow matching VGUI mood ── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 70% at 18% 52%, rgba(20,45,24,0.45) 0%, transparent 60%), " +
            "radial-gradient(ellipse 35% 45% at 80% 80%, rgba(211,162,59,0.04) 0%, transparent 55%)",
        }}
      />

      {/* ── Content — left-aligned, matching the original VGUI panel feel ── */}
      <div className="relative z-10 px-8 sm:px-14 lg:px-20">
        <div className="w-full max-w-xl">

          {/* Error banner */}
          {errorMsg && (
            <div className="mb-6 border border-destructive/40 bg-destructive/8 px-4 py-2.5">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-destructive">
                ⚠ {errorMsg}
              </p>
            </div>
          )}

          {/* The VGUI panel */}
          <div className="vgui-panel p-8 lg:p-10">

            {/* Eyebrow */}
            <div className="menu-title text-[0.68rem] text-primary">
              Civil Protection Network
            </div>

            {/* Sub-label */}
            <h2 className="mt-3 text-sm font-bold uppercase tracking-[0.28em] text-[#d9d4c6]">
              Competitive Access Required
            </h2>

            {/* Main title — the original VGUI typography */}
            <h1 className="mt-4 text-4xl font-black uppercase tracking-[0.26em] text-white lg:text-6xl">
              FLUIDRUSH{" "}
              <span className="text-lg text-primary lg:text-2xl">SOURCE</span>
            </h1>

            {/* Divider */}
            <div className="menu-divider mt-4 w-36" />

            {/* Description */}
            <p className="mt-6 border-l-2 border-primary/50 pl-4 text-base leading-relaxed text-[#d2cdbf] lg:text-lg">
              Competitive 5v5 Matchmaking.
              <br />
              Dedicated server deployment.
              <br />
              Old-school presentation, modern orchestration.
            </p>

            {/* Live stats */}
            <div className="mt-6">
              <Suspense
                fallback={
                  <div className="flex gap-6">
                    {[0, 1].map((i) => (
                      <div key={i} className="space-y-1">
                        <div className="h-4 w-8 animate-pulse bg-white/8" />
                        <div className="h-2 w-16 animate-pulse bg-white/5" />
                      </div>
                    ))}
                  </div>
                }
              >
                <LiveStats />
              </Suspense>
            </div>

            {/* CTA */}
            <div className="mt-8 flex flex-col gap-3">
              <a
                href="/api/steam"
                className="vgui-button flex w-full items-center justify-center gap-3 py-3.5 text-sm font-black uppercase tracking-[0.2em] text-foreground"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(211,162,59,0.18) 0%, rgba(211,162,59,0.06) 100%)",
                  borderColor: "rgba(211,162,59,0.35)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.1), 0 0 18px rgba(211,162,59,0.1)",
                }}
              >
                <SteamIcon />
                Initialize Steam Session
              </a>

              {/* Status line */}
              <div className="flex items-center justify-between px-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-1.5 w-1.5 rounded-full bg-green-400"
                    style={{ boxShadow: "0 0 5px rgba(74,222,128,0.7)" }}
                  />
                  Status: Online
                </span>
                <span>Tickrate: 128</span>
              </div>
            </div>

          </div>

          {/* Below panel — build label */}
          <div className="mt-3 px-1 text-right font-mono text-[10px] uppercase tracking-[0.18em] text-white/20">
            FluidRush Build 1.0.24 · VGUI Layer
          </div>

        </div>
      </div>

    </div>
  );
}
