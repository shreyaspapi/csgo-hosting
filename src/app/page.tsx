import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Navbar from "@/components/Navbar";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />

      {/* Hero Section */}
      <main className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-900/20 via-gray-950 to-red-900/20" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-orange-500/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          <div className="text-center max-w-3xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-1.5 mb-8">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm text-orange-300">
                Live Now - Sunday Scrims
              </span>
            </div>

            <h1 className="text-5xl sm:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-orange-400 via-red-500 to-orange-400 bg-clip-text text-transparent">
                CS:GO 5v5
              </span>
              <br />
              <span className="text-white">Matchmaking</span>
            </h1>

            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
              Queue up, find competitive 5v5 matches, and play on dedicated
              servers. Solo queue or bring your team. ELO-ranked competitive
              experience.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="/api/auth/steam"
                className="flex items-center gap-3 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white px-8 py-4 rounded-xl transition-all text-lg font-semibold shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
              >
                <svg
                  className="w-6 h-6"
                  viewBox="0 0 71.005 71.005"
                  fill="currentColor"
                >
                  <path d="M35.503 0C16.825 0 1.604 14.234.106 32.428L19.084 40.34a10.07 10.07 0 0 1 5.716-1.77c.192 0 .381.008.572.016l8.554-12.392v-.174c0-7.425 6.044-13.47 13.47-13.47 7.428 0 13.47 6.045 13.47 13.474 0 7.428-6.042 13.47-13.47 13.47-.108 0-.213-.004-.32-.006l-12.193 8.698c0 .16.012.32.012.482 0 5.57-4.53 10.1-10.1 10.1-4.96 0-9.09-3.586-9.93-8.31L.372 38.87C4.336 56.81 20.406 70.005 39.503 70.005c19.576 0 31.502-15.85 31.502-35.003C71.005 15.674 55.078 0 35.503 0z" />
                </svg>
                Sign in with Steam
              </a>
              <a
                href="#how-it-works"
                className="text-gray-400 hover:text-white px-8 py-4 rounded-xl border border-gray-800 hover:border-gray-600 transition-all text-lg font-medium"
              >
                How it works
              </a>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 mt-16 max-w-lg mx-auto">
              <div>
                <p className="text-3xl font-bold text-white">--</p>
                <p className="text-sm text-gray-500 mt-1">Players Online</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">--</p>
                <p className="text-sm text-gray-500 mt-1">In Queue</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">--</p>
                <p className="text-sm text-gray-500 mt-1">Matches Today</p>
              </div>
            </div>
          </div>
        </div>

        {/* How it works */}
        <section id="how-it-works" className="relative py-20 border-t border-gray-800/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-16">
              How It Works
            </h2>
            <div className="grid md:grid-cols-4 gap-8">
              {[
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
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-orange-500/20 to-red-600/20 border border-orange-500/30 rounded-2xl mb-4">
                    <span className="text-orange-400 font-bold text-lg">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-400">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="relative py-20 border-t border-gray-800/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-center mb-16">Features</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  title: "ELO Ranking",
                  desc: "Competitive ELO-based ranking system. Climb the leaderboard.",
                  icon: "trophy",
                },
                {
                  title: "Dedicated Servers",
                  desc: "128-tick servers hosted on Azure Mumbai for low latency.",
                  icon: "server",
                },
                {
                  title: "Solo & Team Queue",
                  desc: "Queue alone or bring your full 5-stack team.",
                  icon: "users",
                },
                {
                  title: "Auto Server Provisioning",
                  desc: "Servers spin up on demand. No waiting for an admin.",
                  icon: "bolt",
                },
                {
                  title: "Match Stats",
                  desc: "Detailed per-match statistics tracked automatically.",
                  icon: "chart",
                },
                {
                  title: "Steam Integration",
                  desc: "One-click sign in with Steam. Auto-link your CS:GO profile.",
                  icon: "steam",
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-orange-500/30 transition-colors"
                >
                  <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center mb-3">
                    <div className="w-5 h-5 bg-orange-400 rounded-sm" />
                  </div>
                  <h3 className="text-lg font-semibold mt-3 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-400">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-800/50 py-8">
          <div className="max-w-5xl mx-auto px-4 text-center">
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
