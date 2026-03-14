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
    <div className="relative h-screen w-screen overflow-hidden bg-transparent">
      {/* 
        The Navbar component is already fixed to the left as a vertical 
        Source-style menu. We just need to ensure the rest of the landing 
        page content feels like the HL2/CS:S background.
      */}
      <Navbar />

      {/* Hero Content Area - Floating VGUI style */}
      <div className="flex h-full items-center justify-center pl-64 lg:pl-80">
        <div className="max-w-xl p-8">
          <div className="vgui-panel p-8 bg-background/40 backdrop-blur-sm border border-white/5 shadow-2xl">
            <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-primary mb-2 italic">
              Authenticated Session Required
            </h2>
            <h1 className="text-6xl font-black uppercase tracking-tighter text-white drop-shadow-2xl mb-6">
              FLUIDRUSH <span className="text-primary text-2xl">BETA</span>
            </h1>
            
            <p className="text-lg font-medium text-[#ccc] leading-relaxed mb-8 border-l-2 border-primary/50 pl-4 italic">
              Competitive 5v5 Matchmaking. 
              <br />
              128-Tick Dedicated Infrastructure.
              <br />
              Automated Skill Calibration.
            </p>

            <div className="flex flex-col gap-3">
              <Button 
                size="lg" 
                className="w-full text-lg h-14 bg-gradient-to-r from-primary to-orange-600 border-none text-black hover:scale-[1.02]"
                render={<a href="/api/steam" />}
              >
                INITIALIZE CONNECTION (STEAM)
              </Button>
              <div className="flex justify-between px-1 text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                <span>Status: SYSTEM_READY</span>
                <span>Latency: 12ms</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Right Attribution */}
      <div className="absolute bottom-12 right-12 text-right">
        <div className="text-[10px] font-mono text-white/20 uppercase tracking-[0.2em]">
          &copy; 2026 FLUIDRUSH NETWORKS
          <br />
          POWERED BY SOURCE ENGINE (VGUI 2.0)
        </div>
      </div>
    </div>
  );
}
