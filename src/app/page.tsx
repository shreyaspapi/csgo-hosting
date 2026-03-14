import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { Suspense } from "react";
import LiveStats from "@/components/landing/LiveStats";

export const dynamic = "force-dynamic";

const AUTH_ERRORS: Record<string, string> = {
  vac_banned: "Access denied — active VAC ban on record.",
  steam_auth_failed: "Steam verification failed. Please try again.",
  steam_verify_failed: "Could not verify Steam session. Please try again.",
  steam_profile_error: "Error loading Steam profile.",
  steam_profile_failed: "Steam profile not found.",
  db_error: "Server error. Please try again.",
  token_error: "Session error. Please try again.",
};

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
     * For unauthenticated users, AppShell applies no left padding,
     * so the sidebar (19rem) and this content overlap — we add
     * lg:pl-[19rem] here manually to position content correctly.
     */
    <div className="flex h-screen flex-col overflow-hidden lg:pl-[19rem]">

      {/* ── Full-screen centered card ────────────────────────────────── */}
      <main className="flex flex-1 items-center justify-center px-6 py-8">
        <div className="w-full max-w-lg">

          {/* Error */}
          {errorMsg && (
            <div className="mb-6 border border-destructive/40 bg-destructive/8 px-4 py-2.5">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-destructive">
                ⚠ {errorMsg}
              </p>
            </div>
          )}

          {/* Panel */}
          <div className="vgui-panel px-8 py-10">

            {/* Eyebrow */}
            <div className="menu-title text-[0.62rem] text-primary">
              5v5 Competitive Matchmaking
            </div>

            {/* Headline */}
            <h2 className="mt-4 text-[2.1rem] font-black uppercase leading-[1.12] tracking-[0.06em] text-foreground sm:text-[2.6rem]">
              Dedicated servers.
              <br />
              <span className="text-primary">ELO ranked.</span>
              <br />
              Captain draft.
            </h2>

            {/* Divider */}
            <div
              className="my-6 h-px"
              style={{
                background:
                  "linear-gradient(90deg, rgba(211,162,59,0.45), transparent 70%)",
              }}
            />

            {/* Description */}
            <p className="font-mono text-[0.8rem] leading-relaxed text-muted-foreground">
              128-tick Azure servers · 7-map pool · VAC verified
            </p>

            {/* Live stats */}
            <div className="mt-5">
              <Suspense
                fallback={
                  <div className="flex gap-6">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="space-y-1">
                        <div className="h-4 w-10 animate-pulse bg-white/8" />
                        <div className="h-2.5 w-16 animate-pulse bg-white/5" />
                      </div>
                    ))}
                  </div>
                }
              >
                <LiveStats />
              </Suspense>
            </div>

            {/* CTA */}
            <a
              href="/api/steam"
              className="vgui-button mt-8 flex w-full items-center justify-center gap-3 py-4 text-[0.8rem] font-black uppercase tracking-[0.22em] text-foreground"
              style={{
                background:
                  "linear-gradient(180deg, rgba(211,162,59,0.2) 0%, rgba(211,162,59,0.07) 100%)",
                borderColor: "rgba(211,162,59,0.38)",
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.1), 0 0 20px rgba(211,162,59,0.12)",
              }}
            >
              <SteamIcon />
              Initialize Steam Session
            </a>

            {/* Status bar */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full bg-green-400"
                  style={{ boxShadow: "0 0 5px rgba(74,222,128,0.8)" }}
                />
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
                  Servers Online
                </span>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/40">
                Mumbai · 128-tick
              </span>
            </div>
          </div>

          {/* Below panel */}
          <div className="mt-4 flex items-center justify-between px-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/35">
              Not affiliated with Valve Corporation
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground/35">
              Build 1.0.24
            </span>
          </div>

        </div>
      </main>
    </div>
  );
}

function SteamIcon() {
  return (
    <svg className="size-[1.1rem] shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0z" />
    </svg>
  );
}
