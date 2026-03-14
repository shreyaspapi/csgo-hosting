"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center font-bold text-sm">
              FR
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
              FluidRush
            </span>
          </Link>

          {/* Nav Links */}
          {session && (
            <div className="hidden md:flex items-center gap-6">
              <Link
                href="/dashboard"
                className="text-gray-300 hover:text-white transition-colors text-sm font-medium"
              >
                Dashboard
              </Link>
              <Link
                href="/queue"
                className="text-gray-300 hover:text-white transition-colors text-sm font-medium"
              >
                Play
              </Link>
              <Link
                href="/leaderboard"
                className="text-gray-300 hover:text-white transition-colors text-sm font-medium"
              >
                Leaderboard
              </Link>
              <Link
                href="/teams"
                className="text-gray-300 hover:text-white transition-colors text-sm font-medium"
              >
                Teams
              </Link>
            </div>
          )}

          {/* User Menu */}
          {session ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-3 bg-gray-800 rounded-lg px-3 py-2 hover:bg-gray-700 transition-colors"
              >
                <Image
                  src={session.user.image}
                  alt={session.user.name}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium">{session.user.name}</p>
                  <p className="text-xs text-orange-400">
                    ELO: {session.user.elo}
                  </p>
                </div>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-1">
                  <Link
                    href="/dashboard"
                    className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                    onClick={() => setMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <a
              href="/api/auth/steam"
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
            >
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5"
                fill="currentColor"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3l-.5 3H13v6.95c5.05-.5 9-4.76 9-9.95 0-5.52-4.48-10-10-10z" />
              </svg>
              Sign in with Steam
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}
