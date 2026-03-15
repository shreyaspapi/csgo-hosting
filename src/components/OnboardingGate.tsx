"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const REGIONS = [
  { value: "centralindia", label: "Mumbai", desc: "India / South Asia" },
  { value: "southeastasia", label: "Singapore", desc: "Southeast Asia" },
  { value: "westeurope", label: "Amsterdam", desc: "Europe" },
  { value: "eastus", label: "Virginia", desc: "North America East" },
];

/**
 * Blocks the entire app with a modal until the user has provided
 * their email address and preferred region. Only renders for
 * authenticated users who haven't completed onboarding.
 */
export default function OnboardingGate() {
  const { status } = useSession();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [checked, setChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [region, setRegion] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;

    const check = async () => {
      try {
        const res = await fetch("/api/onboarding");
        if (res.ok) {
          const data = await res.json();
          setNeedsOnboarding(data.needsOnboarding);
        }
      } catch {
        /* silent */
      } finally {
        setChecked(true);
      }
    };
    check();
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Email is required to continue.");
      return;
    }
    if (!region) {
      setError("Please select which region you plan to play in.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), preferredRegion: region }),
      });

      if (res.ok) {
        setNeedsOnboarding(false);
      } else {
        const data = await res.json();
        setError(data.error || "Something went wrong. Try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Don't show anything while checking, or if user is not authenticated
  if (!checked || status !== "authenticated" || !needsOnboarding) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <Card className="w-full max-w-md border-2 border-primary shadow-[0_0_30px_rgba(255,157,0,0.2)]">
        <CardHeader className="bg-[#4c4c4c] border-b border-[#555] p-2">
          <CardTitle className="px-2 text-xs font-bold uppercase tracking-widest text-[#e1e1e1]">
            Welcome to FluidRush — Complete Setup
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-5 bg-[#222] p-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-primary">One more step</h2>
            <p className="text-sm text-muted-foreground">
              We need your email and preferred server region before you can start
              playing. This helps us plan server capacity for launch.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-[#1a1a1a] border border-[#444] text-sm text-[#e1e1e1] p-2.5 font-mono outline-none focus:border-primary placeholder:text-[#555]"
              />
              <p className="text-[10px] text-muted-foreground">
                We will only use this for important match notifications. No spam.
              </p>
            </div>

            {/* Region */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                Which region will you play in?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {REGIONS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRegion(r.value)}
                    className={`border p-2.5 text-left transition-all ${
                      region === r.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-[#444] bg-[#1a1a1a] text-[#e1e1e1] hover:border-[#666]"
                    }`}
                  >
                    <div className="text-sm font-bold">{r.label}</div>
                    <div className="text-[10px] text-muted-foreground">{r.desc}</div>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                This helps us know how many servers to spin up per region. You can
                still queue for any region later.
              </p>
            </div>

            {error && (
              <p className="text-xs text-red-500 font-mono">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full h-11 text-sm font-bold uppercase"
              disabled={saving}
            >
              {saving ? "Saving..." : "Continue to FluidRush"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
