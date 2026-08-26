const router = require("express").Router();
const { verifyToken } = require("../middleware/auth");

router.use(verifyToken);

router.get("/:guildId", (req, res) => {
  const client = req.app.get("client");
  const player = client.manager.players.get(req.params.guildId);

  if (!player || !player.queue.current) {
    return res.json({ playing: false, queue: [], current: null });
  }

  const track = player.queue.current;
  const position = player.shoukaku?.position || player.position || 0;

  res.json({
    playing: !player.paused,
    paused: player.paused,
    volume: player.volume,
    loop: player.loop || "none",
    position,
    current: {
      title: track.title,
      author: track.author,
      duration: track.length || track.duration || 0,
      uri: track.uri,
      thumbnail: track.thumbnail || null,
      requester: track.requester ? {
        id: track.requester.id,
        username: track.requester.username,
        avatar: track.requester.avatar
      } : null
    },
    queue: [...player.queue].slice(0, 50).map((t, i) => ({
      index: i,
      title: t.title,
      author: t.author,
      duration: t.length || t.duration || 0,
      uri: t.uri,
      thumbnail: t.thumbnail || null,
      requester: t.requester ? {
        id: t.requester.id,
        username: t.requester.username
      } : null
    })),
    queueSize: player.queue.size
  });
});

router.post("/:guildId/pause", (req, res) => {
  const client = req.app.get("client");
  const player = client.manager.players.get(req.params.guildId);
  if (!player) return res.status(404).json({ error: "No player" });

  player.pause(!player.paused);
  res.json({ paused: player.paused });
});

router.post("/:guildId/skip", (req, res) => {
  const client = req.app.get("client");
  const player = client.manager.players.get(req.params.guildId);
  if (!player) return res.status(404).json({ error: "No player" });

  player.skip();
  res.json({ success: true });
});

router.post("/:guildId/volume", (req, res) => {
  const client = req.app.get("client");
  const player = client.manager.players.get(req.params.guildId);
  if (!player) return res.status(404).json({ error: "No player" });

  const { volume } = req.body;
  if (typeof volume !== "number" || volume < 0 || volume > 150) {
    return res.status(400).json({ error: "Volume must be 0-150" });
  }

  player.setVolume(volume);
  res.json({ volume: player.volume });
});

router.post("/:guildId/loop", (req, res) => {
  const client = req.app.get("client");
  const player = client.manager.players.get(req.params.guildId);
  if (!player) return res.status(404).json({ error: "No player" });

  const { mode } = req.body;
  if (!["none", "track", "queue"].includes(mode)) {
    return res.status(400).json({ error: "Invalid loop mode" });
  }

  player.setLoop(mode);
  res.json({ loop: player.loop });
});

router.post("/:guildId/shuffle", (req, res) => {
  const client = req.app.get("client");
  const player = client.manager.players.get(req.params.guildId);
  if (!player) return res.status(404).json({ error: "No player" });

  player.queue.shuffle();
  res.json({ success: true });
});

router.delete("/:guildId/queue/:index", (req, res) => {
  const client = req.app.get("client");
  const player = client.manager.players.get(req.params.guildId);
  if (!player) return res.status(404).json({ error: "No player" });

  const index = parseInt(req.params.index);
  if (isNaN(index) || index < 0 || index >= player.queue.size) {
    return res.status(400).json({ error: "Invalid index" });
  }

  player.queue.splice(index, 1);
  res.json({ success: true, queueSize: player.queue.size });
});

module.exports = router;
