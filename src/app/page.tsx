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

function SteamIcon() {
  return (
    <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0z" />
    </svg>
  );
}

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
    <div
      className="relative flex h-screen w-screen items-center justify-center overflow-hidden"
      style={{
        background: "linear-gradient(158deg, #72746e 0%, #4e5049 35%, #3d3f3a 65%, #585a52 100%)",
      }}
    >
      {/* Film grain */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: "160px 160px",
        }}
      />
      {/* Room vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 85% 85% at 50% 48%, transparent 45%, rgba(0,0,0,0.62) 100%)",
        }}
      />
      {/* Desk shadow */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-28"
        style={{ background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.32))" }}
      />

      {/* ── Giant CRT monitor ── */}
      <div
        className="relative z-10"
        style={{ width: "min(90vw, 960px)", aspectRatio: "920 / 665" }}
      >
        {/* SVG monitor body */}
        <svg
          viewBox="0 0 920 665"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute inset-0 h-full w-full"
          style={{ filter: "drop-shadow(0 32px 64px rgba(0,0,0,0.65))" }}
        >
          <defs>
            <filter id="sk" x="-2%" y="-2%" width="104%" height="104%">
              <feTurbulence type="fractalNoise" baseFrequency="0.032 0.042" numOctaves="3" seed="5" result="n"/>
              <feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G"/>
            </filter>
            <filter id="skH" x="-3%" y="-3%" width="106%" height="106%">
              <feTurbulence type="fractalNoise" baseFrequency="0.028 0.05" numOctaves="3" seed="11" result="n"/>
              <feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="R" yChannelSelector="G"/>
            </filter>
            <linearGradient id="body" x1="0%" y1="0%" x2="3%" y2="100%">
              <stop offset="0%"   stopColor="#d8d4c6"/>
              <stop offset="30%"  stopColor="#c6c2b4"/>
              <stop offset="65%"  stopColor="#b2ae9e"/>
              <stop offset="100%" stopColor="#a0a090"/>
            </linearGradient>
            <radialGradient id="screenGrad" cx="50%" cy="42%" r="56%">
              <stop offset="0%"   stopColor="#1c2c18"/>
              <stop offset="50%"  stopColor="#121c10"/>
              <stop offset="100%" stopColor="#0a120a"/>
            </radialGradient>
            <pattern id="sl" x="0" y="0" width="1" height="3" patternUnits="userSpaceOnUse">
              <rect width="1" height="1" fill="rgba(0,0,0,0.2)"/>
            </pattern>
            <radialGradient id="edgeDark" cx="50%" cy="50%" r="52%">
              <stop offset="55%" stopColor="rgba(0,0,0,0)"/>
              <stop offset="100%" stopColor="rgba(0,0,0,0.48)"/>
            </radialGradient>
            <linearGradient id="glare" x1="0%" y1="0%" x2="7%" y2="100%">
              <stop offset="0%"   stopColor="rgba(255,255,255,0.06)"/>
              <stop offset="30%"  stopColor="rgba(255,255,255,0.02)"/>
              <stop offset="100%" stopColor="rgba(0,0,0,0)"/>
            </linearGradient>
          </defs>

          {/* Body depth */}
          <rect x="52" y="24" width="800" height="496" rx="16" fill="#787670" filter="url(#sk)"/>
          {/* Main body */}
          <rect x="44" y="16" width="800" height="496" rx="14" fill="url(#body)" filter="url(#sk)"/>
          {/* Top highlight */}
          <rect x="44" y="16" width="800" height="9" rx="12" fill="rgba(255,255,255,0.26)" filter="url(#sk)"/>
          {/* Right shade */}
          <rect x="830" y="28" width="14" height="470" rx="4" fill="rgba(0,0,0,0.1)" filter="url(#sk)"/>
          {/* Bottom shade */}
          <rect x="44" y="498" width="800" height="14" rx="4" fill="rgba(0,0,0,0.14)" filter="url(#sk)"/>

          {/* Bezel */}
          <rect x="108" y="46" width="682" height="430" rx="10" fill="#2a2820" filter="url(#skH)"/>
          <rect x="116" y="54" width="666" height="416" rx="6"  fill="#1a1810" filter="url(#sk)"/>

          {/* Screen */}
          <rect x="122" y="60" width="654" height="404" rx="4" fill="url(#screenGrad)"/>
          <rect x="122" y="60" width="654" height="404" rx="4" fill="url(#sl)" opacity="0.75"/>
          <rect x="122" y="60" width="654" height="404" rx="4" fill="url(#edgeDark)"/>
          <rect x="122" y="60" width="654" height="404" rx="4" fill="url(#glare)"/>
          <rect x="122" y="60" width="654" height="404" rx="4"
            fill="none" stroke="rgba(50,130,40,0.18)" strokeWidth="2.5"/>

          {/* Control strip */}
          <line x1="108" y1="476" x2="790" y2="476" stroke="rgba(0,0,0,0.16)" strokeWidth="1.5" filter="url(#sk)"/>
          <line x1="108" y1="478" x2="790" y2="478" stroke="rgba(255,255,255,0.09)" strokeWidth="1" filter="url(#sk)"/>

          {/* Brand */}
          <text x="449" y="493" textAnchor="middle"
            fontFamily="'Arial Narrow',Arial,sans-serif" fontSize="8.5" fontWeight="bold"
            letterSpacing="3.5" fill="rgba(86,82,72,0.9)" filter="url(#sk)">
            FLUIDRUSH
          </text>

          {/* Power LED */}
          <circle cx="748" cy="490" r="5.5" fill="#182216" filter="url(#sk)"/>
          <circle cx="748" cy="490" r="3.5" fill="#33bb44"
            style={{filter:"drop-shadow(0 0 4px rgba(50,180,60,0.9))"}}/>

          {/* Buttons */}
          <rect x="762" y="484" width="22" height="11" rx="2" fill="#bcbaa8" filter="url(#sk)"/>
          <rect x="789" y="484" width="14" height="11" rx="2" fill="#bcbaa8" filter="url(#sk)"/>

          {/* Dial */}
          <circle cx="130" cy="490" r="13" fill="#a8a694" filter="url(#sk)"/>
          <circle cx="130" cy="490" r="9"  fill="#969482" filter="url(#sk)"/>
          <circle cx="130" cy="490" r="2.5" fill="#6a6858" filter="url(#sk)"/>
          <line x1="130" y1="483" x2="130" y2="487" stroke="#565444" strokeWidth="1.5"/>

          {/* Volume bar */}
          <rect x="152" y="486" width="84" height="7" rx="2" fill="#a09e8c" filter="url(#sk)"/>
          {[0,11,22,33,44,55,66].map((i) => (
            <rect key={i} x={153+i} y={487} width={9} height={5} rx="1"
              fill={i <= 44 ? "#5a8a56" : "#808070"} filter="url(#sk)"/>
          ))}

          {/* Neck */}
          <path d="M366 514 C354 526 336 542 328 560 L580 560 C570 542 554 526 542 514 Z"
            fill="#a8a694" filter="url(#skH)"/>
          <path d="M382 514 L370 560" stroke="rgba(0,0,0,0.12)" strokeWidth="2.5" fill="none"/>
          <path d="M526 514 L536 560" stroke="rgba(0,0,0,0.12)" strokeWidth="2.5" fill="none"/>

          {/* Base */}
          <ellipse cx="454" cy="564" rx="164" ry="18" fill="#a0a090" filter="url(#skH)"/>
          <ellipse cx="454" cy="574" rx="182" ry="15" fill="#909082" filter="url(#skH)"/>
          <ellipse cx="454" cy="582" rx="194" ry="11" fill="#808072" filter="url(#skH)"/>
          <ellipse cx="454" cy="588" rx="202" ry="8"  fill="#706e60" filter="url(#skH)"/>

          {/* Cables */}
          <path d="M168 514 Q152 560 146 594 Q140 618 150 634"
            stroke="#4a4840" strokeWidth="6" strokeLinecap="round" fill="none" filter="url(#skH)"/>
          <path d="M746 514 Q762 556 768 584 Q774 608 762 628"
            stroke="#4a4840" strokeWidth="4" strokeLinecap="round" fill="none" filter="url(#skH)"/>
          <path d="M454 596 Q457 630 462 656 Q465 664 476 668"
            stroke="#38362e" strokeWidth="7" strokeLinecap="round" fill="none" filter="url(#skH)"/>

          {/* Sketch hatching on body side */}
          {Array.from({length:14}, (_, i) => (
            <line key={i}
              x1={838 - i*14} y1={20 + i*3}
              x2={850 - i*14} y2={30 + i*3}
              stroke="rgba(0,0,0,0.04)" strokeWidth="0.8"/>
          ))}
        </svg>

        {/* ── Content inside screen ──────────────────────────────────────────
            Screen SVG rect: x=122, y=60, w=654, h=404 inside 920×665 viewBox
            As % of container: left=13.3%, top=9.0%, right=14.9%, bottom=30.1%
        ── */}
        <div
          className="absolute flex items-center justify-center overflow-hidden"
          style={{
            left:   "13.3%",
            top:    "9.0%",
            right:  "14.9%",
            bottom: "30.1%",
          }}
        >
          {/* Phosphor bloom */}
          <div
            className="pointer-events-none absolute inset-0 z-10"
            style={{
              background:
                "radial-gradient(ellipse 65% 55% at 50% 36%, rgba(40,200,55,0.06) 0%, transparent 65%)",
            }}
          />

          {/* UI */}
          <div className="relative z-20 w-full max-w-[470px] px-8 py-1 text-left">

            {errorMsg && (
              <div className="mb-3 border border-red-500/40 bg-red-950/30 px-3 py-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-red-400">⚠ {errorMsg}</p>
              </div>
            )}

            <p className="font-mono text-[0.58rem] uppercase tracking-[0.36em]"
              style={{ color: "#d3a23b", textShadow: "0 0 8px rgba(211,162,59,0.5)" }}>
              Civil Protection Network
            </p>

            <p className="mt-1.5 font-sans text-[0.68rem] font-bold uppercase tracking-[0.24em]"
              style={{ color: "#80aa72" }}>
              Competitive Access Required
            </p>

            <h1
              className="mt-2 font-black uppercase leading-[1.05]"
              style={{
                fontSize: "clamp(1.5rem, 3.8vw, 2.7rem)",
                letterSpacing: "0.2em",
                color: "#d8e8c8",
                textShadow:
                  "0 0 24px rgba(70,190,60,0.3), 0 0 8px rgba(70,190,60,0.12), 0 2px 0 rgba(0,0,0,0.95)",
              }}
            >
              FLUIDRUSH{" "}
              <span style={{
                fontSize: "0.36em",
                color: "#d3a23b",
                textShadow: "0 0 10px rgba(211,162,59,0.65)",
                letterSpacing: "0.18em",
              }}>
                SOURCE
              </span>
            </h1>

            <div className="my-3 h-px" style={{
              background: "linear-gradient(90deg, rgba(211,162,59,0.55), rgba(211,162,59,0.08) 55%, transparent)",
            }}/>

            <p className="border-l-2 pl-3 font-sans leading-relaxed"
              style={{
                fontSize: "clamp(0.7rem, 1.4vw, 0.82rem)",
                borderColor: "rgba(211,162,59,0.38)",
                color: "#78a068",
                textShadow: "0 0 6px rgba(50,150,40,0.15)",
              }}>
              Competitive 5v5 Matchmaking.
              <br/>
              Dedicated server deployment.
              <br/>
              Old-school presentation, modern orchestration.
            </p>

            <div className="mt-3">
              <Suspense fallback={
                <div className="flex gap-5">
                  {[0,1].map(i => (
                    <div key={i} className="space-y-1">
                      <div className="h-3 w-6 animate-pulse rounded-sm bg-green-900/50"/>
                      <div className="h-2 w-14 animate-pulse rounded-sm bg-green-900/25"/>
                    </div>
                  ))}
                </div>
              }>
                <LiveStats />
              </Suspense>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <a
                href="/api/steam"
                className="flex items-center justify-center gap-2.5 border py-3 font-mono font-black uppercase tracking-[0.2em] transition-all duration-150 hover:brightness-110"
                style={{
                  fontSize: "clamp(0.62rem, 1.2vw, 0.72rem)",
                  borderColor: "rgba(211,162,59,0.38)",
                  background: "linear-gradient(180deg, rgba(211,162,59,0.15), rgba(211,162,59,0.04))",
                  color: "#c8bc94",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 0 14px rgba(211,162,59,0.1)",
                }}
              >
                <SteamIcon />
                Initialize Steam Session
              </a>

              <div className="flex items-center justify-between font-mono text-[9px] uppercase tracking-[0.15em]"
                style={{ color: "rgba(72,130,54,0.65)" }}>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-1.5 w-1.5 rounded-full"
                    style={{ background: "#38b848", boxShadow: "0 0 5px #38b848" }}/>
                  Servers Online
                </span>
                <span style={{ color: "rgba(211,162,59,0.42)" }}>128 tick · Mumbai</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Build label */}
      <div className="absolute bottom-3 right-5 font-mono text-[9px] uppercase tracking-[0.18em]"
        style={{ color: "rgba(44,42,36,0.55)" }}>
        Build 1.0.24 · VGUI
      </div>
    </div>
  );
}
