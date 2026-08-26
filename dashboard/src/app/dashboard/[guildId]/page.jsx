"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  ArrowLeft, Disc3, Play, Pause, SkipForward, Shuffle, Repeat, Repeat1,
  Volume2, VolumeX, Music, Settings, Hash, Shield, MessageSquare,
  Server, LogOut, Trash2, ChevronRight
} from "lucide-react";

export default function GuildDashboard() {
  const { guildId } = useParams();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [guild, setGuild] = useState(null);
  const [music, setMusic] = useState(null);
  const [activeTab, setActiveTab] = useState("music");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { router.push("/"); return; }
    try { setUser(JSON.parse(stored)); } catch { router.push("/"); }
  }, [router]);

  const fetchData = useCallback(async () => {
    try {
      const [guildData, musicData] = await Promise.all([
        api.getGuild(guildId),
        api.getMusic(guildId)
      ]);
      setGuild(guildData);
      setMusic(musicData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [guildId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      api.getMusic(guildId).then(setMusic).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchData, guildId]);

  const handleSaveSettings = async (data) => {
    setSaving(true);
    try {
      await api.updateSettings(guildId, data);
      const updated = await api.getGuild(guildId);
      setGuild(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const getAvatarUrl = (u) => u?.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.webp?size=128` : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Disc3 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!guild) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Sunucu bulunamadı veya bot bu sunucuda değil.</p>
          <button onClick={() => router.push("/dashboard")} className="text-primary hover:underline">Geri dön</button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "music", label: "Müzik", icon: Music },
    { id: "settings", label: "Ayarlar", icon: Settings },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-[264px] bg-card border-r border-border flex flex-col z-20">
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Disc3 className="w-6 h-6 text-primary" />
            </div>
            <span className="text-lg font-bold tracking-tight">Groove</span>
          </div>
        </div>

        <div className="px-3 py-3 border-b border-border">
          <button onClick={() => router.push("/dashboard")} className="flex items-center gap-2 px-3 py-2 w-full rounded-xl hover:bg-secondary text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Sunucularım
          </button>
        </div>

        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            {guild.icon ? (
              <img src={guild.icon} alt="" className="w-10 h-10 rounded-xl" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center font-bold text-muted-foreground">
                {guild.name?.[0]}
              </div>
            )}
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">{guild.name}</div>
              <div className="text-xs text-muted-foreground">{guild.memberCount} üye</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </nav>

        {user && (
          <div className="px-3 py-4 border-t border-border">
            <div className="flex items-center gap-3 px-3 py-2">
              {getAvatarUrl(user) ? (
                <img src={getAvatarUrl(user)} alt="" className="w-8 h-8 rounded-full" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-medium">{user.username?.[0]?.toUpperCase()}</div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{user.globalName || user.username}</div>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="ml-[264px] flex-1 p-8">
        {activeTab === "music" && (
          <MusicPanel music={music} guildId={guildId} onRefresh={() => api.getMusic(guildId).then(setMusic)} />
        )}
        {activeTab === "settings" && (
          <SettingsPanel guild={guild} onSave={handleSaveSettings} saving={saving} />
        )}
      </main>
    </div>
  );
}

function MusicPanel({ music, guildId, onRefresh }) {
  if (!music?.current) {
    return (
      <div className="max-w-4xl">
        <h2 className="text-2xl font-bold mb-6">Müzik</h2>
        <div className="bg-card border border-border rounded-2xl p-16 text-center">
          <Music className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Şu anda çalan müzik yok</p>
          <p className="text-sm text-muted-foreground/60 mt-2">Bir ses kanalında müzik çalmaya başla!</p>
        </div>
      </div>
    );
  }

  const track = music.current;
  const progress = track.duration > 0 ? (music.position / track.duration) * 100 : 0;

  const handlePause = async () => { await api.pauseMusic(guildId); onRefresh(); };
  const handleSkip = async () => { await api.skipMusic(guildId); onRefresh(); };
  const handleShuffle = async () => { await api.shuffleQueue(guildId); onRefresh(); };
  const handleLoop = async () => {
    const modes = ["none", "track", "queue"];
    const next = modes[(modes.indexOf(music.loop) + 1) % 3];
    await api.setLoop(guildId, next);
    onRefresh();
  };
  const handleVolume = async (vol) => { await api.setVolume(guildId, vol); onRefresh(); };
  const handleRemove = async (idx) => { await api.removeTrack(guildId, idx); onRefresh(); };

  return (
    <div className="max-w-5xl">
      <h2 className="text-2xl font-bold mb-6">Müzik</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Now Playing - spans 2 cols */}
        <div className="lg:col-span-2 space-y-6">
          {/* Player Card */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-start gap-5">
              {track.thumbnail ? (
                <img src={track.thumbnail} alt="" className="w-24 h-24 rounded-xl object-cover" />
              ) : (
                <div className="w-24 h-24 rounded-xl bg-secondary flex items-center justify-center">
                  <Disc3 className="w-10 h-10 text-muted-foreground animate-spin" style={{ animationDuration: "3s" }} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg truncate">{track.title}</h3>
                <p className="text-muted-foreground text-sm mb-4">{track.author}</p>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatDuration(music.position)}</span>
                    <span>{formatDuration(track.duration)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <button onClick={handleShuffle} className="p-2.5 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                  <Shuffle className="w-5 h-5" />
                </button>
                <button onClick={handlePause} className="p-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground transition-colors">
                  {music.paused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
                </button>
                <button onClick={handleSkip} className="p-2.5 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                  <SkipForward className="w-5 h-5" />
                </button>
                <button onClick={handleLoop} className={`p-2.5 rounded-xl hover:bg-secondary transition-colors ${music.loop !== "none" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                  {music.loop === "track" ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
                </button>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-3">
                <button onClick={() => handleVolume(music.volume > 0 ? 0 : 80)} className="text-muted-foreground hover:text-foreground">
                  {music.volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="150"
                  value={music.volume}
                  onChange={(e) => handleVolume(parseInt(e.target.value))}
                  className="w-28 h-1.5 accent-primary cursor-pointer"
                />
                <span className="text-xs text-muted-foreground w-8 text-right">{music.volume}%</span>
              </div>
            </div>

            {track.requester && (
              <div className="mt-3 text-xs text-muted-foreground">
                İsteyen: {track.requester.username}
              </div>
            )}
          </div>
        </div>

        {/* Queue - right column */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Kuyruk</h3>
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-lg">{music.queueSize} şarkı</span>
          </div>

          {music.queue.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Kuyruk boş</p>
          ) : (
            <div className="space-y-1 max-h-[400px] overflow-y-auto">
              {music.queue.map((track, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-secondary/50 group transition-colors">
                  <span className="text-xs text-muted-foreground w-5 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{track.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{track.author} · {formatDuration(track.duration)}</div>
                  </div>
                  <button
                    onClick={() => handleRemove(i)}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {music.queueSize > music.queue.length && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  +{music.queueSize - music.queue.length} şarkı daha...
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsPanel({ guild, onSave, saving }) {
  const [prefix, setPrefix] = useState(guild.settings.prefix);
  const [language, setLanguage] = useState(guild.settings.language);
  const [djRole, setDjRole] = useState(guild.settings.djRole || "");
  const [defaultVolume, setDefaultVolume] = useState(guild.settings.defaultVolume);
  const [welcomeEnabled, setWelcomeEnabled] = useState(guild.settings.welcome?.enabled || false);
  const [welcomeChannel, setWelcomeChannel] = useState(guild.settings.welcome?.channelId || "");
  const [welcomeMsg, setWelcomeMsg] = useState(guild.settings.welcome?.welcomeMsg || "");
  const [goodbyeMsg, setGoodbyeMsg] = useState(guild.settings.welcome?.goodbyeMsg || "");

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold mb-6">Ayarlar</h2>

      <div className="space-y-6">
        {/* General */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Genel Ayarlar
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Prefix</label>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                maxLength={5}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Dil</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="en">English</option>
                <option value="tr">Türkçe</option>
              </select>
            </div>
          </div>
        </div>

        {/* Music */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Music className="w-5 h-5 text-primary" />
            Müzik Ayarları
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">DJ Rolü</label>
              <select
                value={djRole}
                onChange={(e) => setDjRole(e.target.value)}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Yok (herkes kullanabilir)</option>
                {guild.roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Varsayılan Ses ({defaultVolume}%)</label>
              <input
                type="range"
                min="1"
                max="150"
                value={defaultVolume}
                onChange={(e) => setDefaultVolume(parseInt(e.target.value))}
                className="w-full accent-primary cursor-pointer mt-2"
              />
            </div>
          </div>
        </div>

        {/* Welcome */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Hoş Geldin Sistemi
          </h3>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className={`w-11 h-6 rounded-full transition-colors relative ${welcomeEnabled ? "bg-primary" : "bg-secondary"}`}
                onClick={() => setWelcomeEnabled(!welcomeEnabled)}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${welcomeEnabled ? "left-6" : "left-1"}`} />
              </div>
              <span className="text-sm">{welcomeEnabled ? "Aktif" : "Devre dışı"}</span>
            </label>

            {welcomeEnabled && (
              <>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Kanal</label>
                  <select
                    value={welcomeChannel}
                    onChange={(e) => setWelcomeChannel(e.target.value)}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="">Kanal seç...</option>
                    {guild.channels.map(c => (
                      <option key={c.id} value={c.id}>#{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Hoş Geldin Mesajı</label>
                  <textarea
                    value={welcomeMsg}
                    onChange={(e) => setWelcomeMsg(e.target.value)}
                    placeholder="Hoş geldin {user}! {server} sunucusuna katıldın."
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none h-20"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground mb-1.5 block">Güle Güle Mesajı</label>
                  <textarea
                    value={goodbyeMsg}
                    onChange={(e) => setGoodbyeMsg(e.target.value)}
                    placeholder="{username} sunucudan ayrıldı."
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none h-20"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Değişkenler: {"{user}"} (etiket), {"{username}"} (isim), {"{server}"} (sunucu), {"{membercount}"} (üye sayısı), {"{tag}"} (tag)
                </p>
              </>
            )}
          </div>
        </div>

        {/* Save */}
        <button
          onClick={() => onSave({
            prefix,
            language,
            djRole: djRole || null,
            defaultVolume,
            welcome: {
              enabled: welcomeEnabled ? 1 : 0,
              channelId: welcomeChannel,
              welcomeMsg: welcomeMsg || null,
              goodbyeMsg: goodbyeMsg || null
            }
          })}
          disabled={saving}
          className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-colors disabled:opacity-50"
        >
          {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
        </button>
      </div>
    </div>
  );
}

function formatDuration(ms) {
  if (!ms || ms === 0) return "0:00";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}
