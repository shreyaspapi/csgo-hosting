import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const steps = [
  {
    step: "01",
    title: "Sign In",
    desc: "Login with your Steam account. No registration needed.",
  },
  {
    step: "02",
    title: "Queue Up",
    desc: "Join the solo queue or queue with your team of 5.",
  },
  {
    step: "03",
    title: "Accept Match",
    desc: "When 10 players are found, accept the ready check within 30 seconds.",
  },
  {
    step: "04",
    title: "Play",
    desc: "Connect to a dedicated server and play your competitive match.",
  },
];

const features = [
  {
    title: "ELO Ranking",
    desc: "Competitive ELO-based ranking system. Climb the leaderboard.",
  },
  {
    title: "Dedicated Servers",
    desc: "128-tick servers hosted on Azure Mumbai for low latency.",
  },
  {
    title: "Solo & Team Queue",
    desc: "Queue alone or bring your full 5-stack team.",
  },
  {
    title: "Auto Server Provisioning",
    desc: "Servers spin up on demand. No waiting for an admin.",
  },
  {
    title: "Match Stats",
    desc: "Detailed per-match statistics tracked automatically.",
  },
  {
    title: "Steam Integration",
    desc: "One-click sign in with Steam. Auto-link your CS:GO profile.",
  },
];

const stats = [
  { value: "--", label: "Players Online" },
  { value: "--", label: "In Queue" },
  { value: "--", label: "Matches Today" },
];

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />

      <main className="relative overflow-hidden">
        {/* Background gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-900/20 via-gray-950 to-red-900/20" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-3xl" />

        {/* Hero Section */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          <div className="text-center max-w-3xl mx-auto">
            {/* Live Status Badge */}
            <div className="mb-8 flex justify-center">
              <Badge
                variant="outline"
                className="gap-2 border-orange-500/20 bg-orange-500/10 px-4 py-1.5 text-sm text-orange-300"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
                </span>
                Live Now - Sunday Scrims
              </Badge>
            </div>

            {/* Title */}
            <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
              <span className="bg-gradient-to-r from-orange-400 via-red-500 to-orange-400 bg-clip-text text-transparent">
                CS:GO 5v5
              </span>
              <br />
              <span className="text-white">Matchmaking</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-xl text-gray-400">
              Queue up, find competitive 5v5 matches, and play on dedicated
              servers. Solo queue or bring your team. ELO-ranked competitive
              experience.
            </p>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                render={<a href="/api/auth/steam" />}
                className={cn(
                  "h-auto gap-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-orange-500/25",
                  "hover:from-orange-600 hover:to-red-700 hover:shadow-orange-500/40"
                )}
              >
                <svg
                  className="size-6"
                  viewBox="0 0 71.005 71.005"
                  fill="currentColor"
                >
                  <path d="M35.503 0C16.825 0 1.604 14.234.106 32.428L19.084 40.34a10.07 10.07 0 0 1 5.716-1.77c.192 0 .381.008.572.016l8.554-12.392v-.174c0-7.425 6.044-13.47 13.47-13.47 7.428 0 13.47 6.045 13.47 13.474 0 7.428-6.042 13.47-13.47 13.47-.108 0-.213-.004-.32-.006l-12.193 8.698c0 .16.012.32.012.482 0 5.57-4.53 10.1-10.1 10.1-4.96 0-9.09-3.586-9.93-8.31L.372 38.87C4.336 56.81 20.406 70.005 39.503 70.005c19.576 0 31.502-15.85 31.502-35.003C71.005 15.674 55.078 0 35.503 0z" />
                </svg>
                Sign in with Steam
              </Button>

              <Button
                variant="outline"
                size="lg"
                render={<a href="#how-it-works" />}
                className="h-auto rounded-xl border-gray-800 px-8 py-4 text-lg font-medium text-gray-400 hover:border-gray-600 hover:text-white"
              >
                How it works
              </Button>
            </div>

            {/* Stats Row */}
            <div className="mx-auto mt-16 grid max-w-lg grid-cols-3 gap-8">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <p className="text-3xl font-bold text-white">{stat.value}</p>
                  <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Separator className="bg-gray-800/50" />

        {/* How It Works */}
        <section id="how-it-works" className="relative py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-16 text-center text-3xl font-bold text-white">
              How It Works
            </h2>
            <div className="grid gap-8 md:grid-cols-4">
              {steps.map((item) => (
                <Card
                  key={item.step}
                  className="border-0 bg-transparent text-center ring-0 shadow-none"
                >
                  <CardHeader className="items-center">
                    <div className="mb-2 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-orange-500/30 bg-gradient-to-br from-orange-500/20 to-red-600/20">
                      <span className="text-lg font-bold text-orange-400">
                        {item.step}
                      </span>
                    </div>
                    <CardTitle className="text-lg text-white">
                      {item.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-gray-400">
                      {item.desc}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <Separator className="bg-gray-800/50" />

        {/* Features */}
        <section className="relative py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-16 text-center text-3xl font-bold text-white">
              Features
            </h2>
            <div className="grid gap-6 md:grid-cols-3">
              {features.map((feature) => (
                <Card
                  key={feature.title}
                  className="border-0 bg-gray-900/50 ring-1 ring-gray-800 transition-colors hover:ring-orange-500/30"
                >
                  <CardHeader>
                    <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                      <div className="h-5 w-5 rounded-sm bg-orange-400" />
                    </div>
                    <CardTitle className="text-lg text-white">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-gray-400">
                      {feature.desc}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <Separator className="bg-gray-800/50" />

        {/* Footer */}
        <footer className="py-8">
          <div className="mx-auto max-w-5xl px-4 text-center">
            <p className="text-sm text-gray-500">
              FluidRush is not affiliated with Valve Corporation. CS:GO is a
              trademark of Valve Corporation.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
