"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Server, Music, Settings, LogOut, Disc3, ChevronRight } from "lucide-react";

export default function DashboardPage() {
  const [user, setUser] = useState(null);
  const [guilds, setGuilds] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("user");
    const storedGuilds = localStorage.getItem("guilds");
    if (!stored) {
      router.push("/");
      return;
    }
    try {
      setUser(JSON.parse(stored));
      setGuilds(JSON.parse(storedGuilds || "[]"));
    } catch {
      router.push("/");
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("guilds");
    router.push("/");
  };

  const getAvatarUrl = (user) => {
    if (!user?.avatar) return null;
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp?size=128`;
  };

  const getGuildIcon = (guild) => {
    if (!guild.icon) return null;
    return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp?size=128`;
  };

  if (!user) return null;

  return (
    <div className="min-h-screen">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-[264px] bg-card border-r border-border flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Disc3 className="w-6 h-6 text-primary" />
            </div>
            <span className="text-lg font-bold tracking-tight">Groove</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Genel
          </div>
          <a href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-primary/10 text-primary font-medium">
            <Server className="w-5 h-5" />
            Sunucularım
          </a>
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2">
            {getAvatarUrl(user) ? (
              <img
                src={getAvatarUrl(user)}
                alt=""
                className="w-9 h-9 rounded-full"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-medium">
                {user.username?.[0]?.toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user.globalName || user.username}</div>
              <div className="text-xs text-muted-foreground truncate">@{user.username}</div>
            </div>
            <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-[264px] p-8">
        <div className="max-w-5xl">
          <h1 className="text-2xl font-bold mb-2">Sunucularım</h1>
          <p className="text-muted-foreground mb-8">Yönetim yetkisine sahip olduğun sunucuları seç.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {guilds.map((guild) => (
              <button
                key={guild.id}
                onClick={() => router.push(`/dashboard/${guild.id}`)}
                className="group bg-card hover:bg-card/80 border border-border hover:border-primary/30 rounded-2xl p-5 text-left transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  {getGuildIcon(guild) ? (
                    <img
                      src={getGuildIcon(guild)}
                      alt=""
                      className="w-12 h-12 rounded-xl"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-lg font-bold text-muted-foreground">
                      {guild.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{guild.name}</div>
                    <div className="text-sm text-muted-foreground">ID: {guild.id}</div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </button>
            ))}
          </div>

          {guilds.length === 0 && (
            <div className="bg-card border border-border rounded-2xl p-12 text-center">
              <Server className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Yönetim yetkisine sahip olduğun sunucu bulunamadı.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
