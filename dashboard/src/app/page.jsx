"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Music, Users, Server, Headphones, ArrowRight, Disc3 } from "lucide-react";

export default function Home() {
  const [stats, setStats] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    api.getPublicStats().then(setStats).catch(() => {});
  }, []);

  const handleLogin = async () => {
    try {
      const { url } = await api.getLoginUrl();
      window.location.href = url;
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] bg-primary/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[5%] w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Disc3 className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight">Groove</span>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <a
                href="/dashboard"
                className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium transition-colors"
              >
                Dashboard
                <ArrowRight className="w-4 h-4" />
              </a>
            ) : (
              <button
                onClick={handleLogin}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-medium transition-colors"
              >
                Discord ile Giriş Yap
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="pt-32 pb-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-primary text-sm font-medium mb-8">
            <Music className="w-4 h-4" />
            Discord Müzik Botu
          </div>
          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
            Müziğin Ritmini
            <br />
            <span className="text-primary">Sunucuna Getir</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Spotify, YouTube, SoundCloud ve daha fazlasından yüksek kaliteli müzik.
            Gelişmiş kuyruk yönetimi, DJ sistemi ve özelleştirilebilir kontroller.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleLogin}
              className="flex items-center gap-2 px-8 py-3.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold text-lg transition-colors"
            >
              <Headphones className="w-5 h-5" />
              Başla
            </button>
            <a
              href="https://discord.gg/aerox"
              target="_blank"
              rel="noreferrer"
              className="px-8 py-3.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-xl font-semibold text-lg transition-colors"
            >
              Destek Sunucusu
            </a>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto pb-32">
            <div className="bg-card/50 border border-border/50 rounded-2xl p-6 text-center">
              <Server className="w-8 h-8 text-primary mx-auto mb-3" />
              <div className="text-3xl font-bold">{stats.guilds?.toLocaleString() || "—"}</div>
              <div className="text-sm text-muted-foreground mt-1">Sunucu</div>
            </div>
            <div className="bg-card/50 border border-border/50 rounded-2xl p-6 text-center">
              <Users className="w-8 h-8 text-primary mx-auto mb-3" />
              <div className="text-3xl font-bold">{stats.users?.toLocaleString() || "—"}</div>
              <div className="text-sm text-muted-foreground mt-1">Kullanıcı</div>
            </div>
            <div className="bg-card/50 border border-border/50 rounded-2xl p-6 text-center">
              <Music className="w-8 h-8 text-primary mx-auto mb-3" />
              <div className="text-3xl font-bold">{formatUptime(stats.uptime)}</div>
              <div className="text-sm text-muted-foreground mt-1">Çalışma Süresi</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function formatUptime(ms) {
  if (!ms) return "—";
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}g`;
  return `${hours}s`;
}
