const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function fetchAPI(path, options = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    credentials: "include",
  });

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/";
    }
    throw new Error("Unauthorized");
  }

  return res.json();
}

export const api = {
  getLoginUrl: () => fetchAPI("/api/auth/login"),
  callback: (code) => fetchAPI("/api/auth/callback", { method: "POST", body: JSON.stringify({ code }) }),
  getMe: () => fetchAPI("/api/auth/me"),
  logout: () => fetchAPI("/api/auth/logout", { method: "POST" }),

  getGuilds: () => fetchAPI("/api/guilds"),
  getGuild: (id) => fetchAPI(`/api/guilds/${id}`),
  updateSettings: (id, data) => fetchAPI(`/api/guilds/${id}/settings`, { method: "PATCH", body: JSON.stringify(data) }),

  getMusic: (guildId) => fetchAPI(`/api/music/${guildId}`),
  pauseMusic: (guildId) => fetchAPI(`/api/music/${guildId}/pause`, { method: "POST" }),
  skipMusic: (guildId) => fetchAPI(`/api/music/${guildId}/skip`, { method: "POST" }),
  setVolume: (guildId, volume) => fetchAPI(`/api/music/${guildId}/volume`, { method: "POST", body: JSON.stringify({ volume }) }),
  setLoop: (guildId, mode) => fetchAPI(`/api/music/${guildId}/loop`, { method: "POST", body: JSON.stringify({ mode }) }),
  shuffleQueue: (guildId) => fetchAPI(`/api/music/${guildId}/shuffle`, { method: "POST" }),
  removeTrack: (guildId, index) => fetchAPI(`/api/music/${guildId}/queue/${index}`, { method: "DELETE" }),

  getStats: () => fetchAPI("/api/stats"),
  getPublicStats: () => fetchAPI("/api/stats/public"),
};
