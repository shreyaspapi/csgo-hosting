import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

const steps = [
  { step: "01", title: "Sign In", desc: "Login with your Steam account. No registration needed." },
  { step: "02", title: "Queue Up", desc: "Join solo queue or queue with your team of 5." },
  { step: "03", title: "Accept Match", desc: "When 10 players are found, accept within 30 seconds." },
  { step: "04", title: "Play", desc: "Connect to a dedicated server and play your match." },
];

const features = [
  { title: "ELO Ranking", desc: "Competitive ELO-based ranking system. Climb the leaderboard.", icon: "🏆" },
  { title: "Dedicated Servers", desc: "128-tick servers on Azure Mumbai for low latency.", icon: "🖥️" },
  { title: "Solo & Team Queue", desc: "Queue alone or bring your full 5-stack team.", icon: "👥" },
  { title: "Auto Provisioning", desc: "Servers spin up on demand. No waiting for an admin.", icon: "⚡" },
  { title: "Match Stats", desc: "Detailed per-match statistics tracked automatically.", icon: "📊" },
  { title: "Steam Integration", desc: "One-click sign in with Steam. Auto-link your profile.", icon: "🎮" },
];

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden py-24 text-center">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 size-[600px] rounded-full bg-primary/5 blur-3xl" />

        <div className="relative mx-auto max-w-3xl px-4">
          <Badge variant="outline" className="mb-6 gap-1.5 border-primary/30 bg-primary/10 text-primary">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-green-400" />
            </span>
            Live Now — Sunday Scrims
          </Badge>

          <h1 className="mb-4 text-6xl font-bold tracking-tight sm:text-7xl">
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
              CS:GO 5v5
            </span>
            <br />
            <span className="text-foreground">Matchmaking</span>
          </h1>

          <p className="mx-auto mb-10 max-w-xl text-lg text-muted-foreground">
            Queue up, find competitive 5v5 matches, and play on dedicated servers.
            Solo queue or bring your team. ELO-ranked.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              className="gap-2 px-8 shadow-lg shadow-primary/25"
              render={<a href="/api/auth/steam" />}
            >
              <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0z" />
              </svg>
              Sign in with Steam
            </Button>
            <Button variant="outline" size="lg" className="px-8" render={<a href="#how-it-works" />}>
              How it works
            </Button>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-16 grid max-w-sm grid-cols-3 gap-6">
            {[
              { value: "--", label: "Players Online" },
              { value: "--", label: "In Queue" },
              { value: "--", label: "Matches Today" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-3xl font-bold">{s.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      {/* How it works */}
      <section id="how-it-works" className="py-20">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="mb-12 text-center text-3xl font-bold">How It Works</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((item) => (
              <Card key={item.step} className="text-center">
                <CardHeader>
                  <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary ring-1 ring-primary/20">
                    {item.step}
                  </div>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{item.desc}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Separator />

      {/* Features */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="mb-12 text-center text-3xl font-bold">Features</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title} className="transition-colors hover:ring-primary/30">
                <CardHeader>
                  <span className="text-2xl">{f.icon}</span>
                  <CardTitle className="mt-2">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{f.desc}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
        FluidRush is not affiliated with Valve Corporation. CS:GO is a trademark of Valve.
      </footer>
    </div>
  );
}
