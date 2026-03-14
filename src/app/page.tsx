import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent">
      <Navbar />

      <div className="flex min-h-[calc(100vh-4.5rem)] items-center justify-center px-4 pt-24 lg:justify-start lg:px-12 lg:pt-0">
        <div className="max-w-2xl p-4 lg:p-8">
          <div className="vgui-panel max-w-xl p-6 lg:p-8">
            <div className="menu-title text-[0.68rem] text-primary">Civil Protection Network</div>
            <h2 className="mt-3 text-sm font-bold uppercase tracking-[0.28em] text-[#d9d4c6]">
              Competitive Access Required
            </h2>
            <h1 className="mt-4 text-4xl font-black uppercase tracking-[0.26em] text-white lg:text-6xl">
              FLUIDRUSH <span className="ml-2 text-lg text-primary lg:text-2xl">SOURCE</span>
            </h1>

            <p className="mt-6 border-l-2 border-primary/50 pl-4 text-base leading-relaxed text-[#d2cdbf] lg:text-lg">
              Competitive 5v5 Matchmaking.
              <br />
              Dedicated server deployment.
              <br />
              Old-school presentation, modern orchestration.
            </p>

            <div className="mt-8 flex flex-col gap-3">
              <Button size="lg" className="w-full text-sm lg:text-base" render={<a href="/api/steam" />}>
                Initialize Steam Session
              </Button>
              <div className="flex justify-between px-1 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                <span>Status: Standby</span>
                <span>Tickrate: 128</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 right-6 text-right lg:bottom-12 lg:right-12">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/28">
          FluidRush Build 1.0.24
          <br />
          Legacy UI Layer: VGUI Inspired
        </div>
      </div>
    </div>
  );
}
