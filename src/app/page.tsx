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

function CRTScreen({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* ── Mobile: simple CRT-styled container ── */}
      <div className="relative z-10 flex min-h-screen w-full flex-col md:hidden">
        {/* CRT bezel top */}
        <div className="h-3 w-full bg-gradient-to-b from-[#c6c2b4] to-[#b2ae9e]" />
        {/* Screen area */}
        <div
          className="relative flex flex-1 flex-col"
          style={{
            background: "radial-gradient(ellipse 85% 85% at 50% 42%, #1c2c18, #0a120a)",
          }}
        >
          {/* Scanlines */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 3px)",
            }}
          />
          {/* Edge vignette */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 50%, rgba(0,0,0,0.5) 100%)",
            }}
          />
          {/* Content */}
          <div className="relative z-20 flex flex-1 flex-col px-5 py-6 sm:px-8 sm:py-8">
            {children}
          </div>
        </div>
        {/* CRT bezel bottom with brand */}
        <div className="flex h-10 w-full items-center justify-between bg-gradient-to-b from-[#b2ae9e] to-[#a0a090] px-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[#33bb44]" style={{ boxShadow: "0 0 6px #33bb44" }} />
            <span className="font-mono text-[8px] font-bold uppercase tracking-[3px] text-[#565444]">FLUIDRUSH</span>
          </div>
          <div className="flex gap-1.5">
            <div className="h-2.5 w-5 rounded-sm bg-[#bcbaa8]" />
            <div className="h-2.5 w-3 rounded-sm bg-[#bcbaa8]" />
          </div>
        </div>
      </div>

      {/* ── Desktop: full CRT monitor SVG ── */}
      <div
        className="absolute z-10 hidden md:block"
        style={{
          top: 0,
          left: 0,
          width: "100vw",
          height: "calc(100vw * 530 / 920)",
          minHeight: "100vh",
        }}
      >
        <svg
          viewBox="0 0 920 530"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute inset-0 h-full w-full"
          style={{ filter: "drop-shadow(0 4px 24px rgba(0,0,0,0.45))" }}
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
          <rect x="52" y="8"  width="816" height="522" rx="16" fill="#787670" filter="url(#sk)"/>
          <rect x="44" y="0"  width="816" height="522" rx="14" fill="url(#body)" filter="url(#sk)"/>
          <rect x="44" y="0"  width="816" height="9"   rx="12" fill="rgba(255,255,255,0.26)" filter="url(#sk)"/>
          <rect x="846" y="12" width="14" height="498" rx="4"  fill="rgba(0,0,0,0.1)"  filter="url(#sk)"/>
          <rect x="44"  y="514" width="816" height="8"  rx="4"  fill="rgba(0,0,0,0.18)" filter="url(#sk)"/>
          <rect x="44"  y="0"   width="816" height="482" rx="10" fill="#2a2820" filter="url(#skH)"/>
          <rect x="52"  y="8"   width="800" height="466" rx="6"  fill="#1a1810" filter="url(#sk)"/>
          <rect x="60"  y="16"  width="784" height="450" rx="6" fill="url(#screenGrad)"/>
          <rect x="60"  y="16"  width="784" height="450" rx="6" fill="url(#sl)" opacity="0.75"/>
          <rect x="60"  y="16"  width="784" height="450" rx="6" fill="url(#edgeDark)"/>
          <rect x="60"  y="16"  width="784" height="450" rx="6" fill="url(#glare)"/>
          <rect x="60"  y="16"  width="784" height="450" rx="6"
            fill="none" stroke="rgba(50,130,40,0.16)" strokeWidth="2"/>
          <line x1="44"  y1="482" x2="860" y2="482" stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" filter="url(#sk)"/>
          <line x1="44"  y1="484" x2="860" y2="484" stroke="rgba(255,255,255,0.08)" strokeWidth="1"  filter="url(#sk)"/>
          <text x="460" y="507" textAnchor="middle"
            fontFamily="'Arial Narrow',Arial,sans-serif" fontSize="9" fontWeight="bold"
            letterSpacing="4" fill="rgba(86,82,72,0.85)" filter="url(#sk)">
            FLUIDRUSH
          </text>
          <circle cx="792" cy="503" r="5.5" fill="#182216" filter="url(#sk)"/>
          <circle cx="792" cy="503" r="3.5" fill="#33bb44"
            style={{filter:"drop-shadow(0 0 4px rgba(50,180,60,0.9))"}}/>
          <rect x="806" y="497" width="22" height="11" rx="2" fill="#bcbaa8" filter="url(#sk)"/>
          <rect x="832" y="497" width="14" height="11" rx="2" fill="#bcbaa8" filter="url(#sk)"/>
          <circle cx="78"  cy="503" r="13" fill="#a8a694" filter="url(#sk)"/>
          <circle cx="78"  cy="503" r="9"  fill="#969482" filter="url(#sk)"/>
          <circle cx="78"  cy="503" r="2.5" fill="#6a6858" filter="url(#sk)"/>
          <line   x1="78"  y1="496" x2="78" y2="500" stroke="#565444" strokeWidth="1.5"/>
          <rect x="100" y="499" width="84" height="7" rx="2" fill="#a09e8c" filter="url(#sk)"/>
          {[0,11,22,33,44,55,66].map((i) => (
            <rect key={i} x={101+i} y={500} width={9} height={5} rx="1"
              fill={i <= 44 ? "#5a8a56" : "#808070"} filter="url(#sk)"/>
          ))}
          {Array.from({length:14}, (_, i) => (
            <line key={i}
              x1={838 - i*14} y1={20 + i*3}
              x2={850 - i*14} y2={30 + i*3}
              stroke="rgba(0,0,0,0.04)" strokeWidth="0.8"/>
          ))}
        </svg>

        {/* Desktop screen content */}
        <div
          className="absolute flex items-center justify-center overflow-hidden"
          style={{
            left:   "6.5%",
            top:    "3.0%",
            right:  "8.3%",
            bottom: "12.1%",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 z-10"
            style={{
              background:
                "radial-gradient(ellipse 65% 55% at 50% 36%, rgba(40,200,55,0.06) 0%, transparent 65%)",
            }}
          />
          <div className="relative z-20 w-full px-[7%] py-1 text-left">
            {children}
          </div>
        </div>
      </div>
    </>
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
      className="relative min-h-screen w-screen overflow-hidden md:h-screen"
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

      <CRTScreen>
        {errorMsg && (
          <div className="mb-3 border border-red-500/40 bg-red-950/30 px-3 py-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-red-400">⚠ {errorMsg}</p>
          </div>
        )}

        <p className="font-mono text-[0.58rem] uppercase tracking-[0.36em] sm:text-[0.58rem]"
          style={{ color: "#d3a23b", textShadow: "0 0 8px rgba(211,162,59,0.5)" }}>
          Civil Protection Network
        </p>

        <p className="mt-1.5 font-sans text-[0.6rem] font-bold uppercase tracking-[0.24em] sm:text-[0.68rem]"
          style={{ color: "#80aa72" }}>
          Competitive Access Required
        </p>

        <h1
          className="mt-2 font-black uppercase leading-[1.05]"
          style={{
            fontSize: "clamp(1.4rem, 8vw, 2.7rem)",
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
            fontSize: "clamp(0.7rem, 3.5vw, 0.82rem)",
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
            className="flex items-center justify-center gap-2.5 border py-3 font-mono font-black uppercase tracking-[0.2em] transition-all duration-150 hover:brightness-110 active:scale-[0.98]"
            style={{
              fontSize: "clamp(0.6rem, 3vw, 0.72rem)",
              borderColor: "rgba(211,162,59,0.38)",
              background: "linear-gradient(180deg, rgba(211,162,59,0.15), rgba(211,162,59,0.04))",
              color: "#c8bc94",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 0 14px rgba(211,162,59,0.1)",
            }}
          >
            <SteamIcon />
            Initialize Steam Session
          </a>

          <div className="flex flex-col gap-1 font-mono text-[10px] uppercase tracking-[0.15em] sm:flex-row sm:items-center sm:justify-between sm:text-[11px]"
            style={{ color: "#8ec47a", textShadow: "0 0 6px rgba(80,180,60,0.25)" }}>
            <span className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full"
                style={{ background: "#38b848", boxShadow: "0 0 6px #38b848" }}/>
              Servers Online
            </span>
            <span style={{ color: "#d3a23b", textShadow: "0 0 6px rgba(211,162,59,0.3)" }}>128 tick · Mumbai</span>
          </div>
        </div>

        {/* Support links — stack on mobile, inline on desktop */}
        <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] sm:gap-3 sm:text-[11px]">
          <span style={{ color: "#b0a880" }}>Support:</span>
          <a
            href="https://buymeacoffee.com/shreyaspapi"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 transition-colors hover:brightness-125"
            style={{ color: "#d3a23b", textShadow: "0 0 6px rgba(211,162,59,0.25)" }}
          >
            Coffee
          </a>
          <span style={{ color: "#6a7a5a" }}>·</span>
          <a
            href="https://discord.gg/XBVsuFUDDs"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 transition-colors hover:brightness-125"
            style={{ color: "#d3a23b", textShadow: "0 0 6px rgba(211,162,59,0.25)" }}
          >
            Discord
          </a>
          <span style={{ color: "#6a7a5a" }}>·</span>
          <a
            href="https://github.com/shreyaspapi/fluidrush"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 transition-colors hover:brightness-125"
            style={{ color: "#d3a23b", textShadow: "0 0 6px rgba(211,162,59,0.25)" }}
          >
            GitHub
          </a>
        </div>
        <div className="mt-1.5 font-mono text-[8px] tracking-[0.08em] sm:text-[10px]"
          style={{ color: "#8ec47a", textShadow: "0 0 4px rgba(80,180,60,0.15)" }}>
          ETH: 0x2F069F...9f8bB1a
          <span className="ml-2 hidden sm:inline" style={{ color: "#5a7a4a" }}>(0x2F069F429d036aeBD2dC13de8B63C16AE9f8bB1a)</span>
        </div>
      </CRTScreen>

      {/* Build label */}
      <div className="absolute bottom-3 right-5 z-20 font-mono text-[9px] uppercase tracking-[0.18em]"
        style={{ color: "rgba(44,42,36,0.55)" }}>
        Build 1.0.24 · VGUI
      </div>
    </div>
  );
}
