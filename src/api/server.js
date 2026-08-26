const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

function createAPIServer(client) {
  const app = express();
  const port = process.env.API_PORT || 3001;

  app.use(cors({
    origin: process.env.DASHBOARD_URL || "http://localhost:3000",
    credentials: true
  }));
  app.use(express.json());
  app.use(cookieParser());

  app.set("client", client);

  app.use("/api/auth", require("./routes/auth"));
  app.use("/api/guilds", require("./routes/guilds"));
  app.use("/api/music", require("./routes/music"));
  app.use("/api/stats", require("./routes/stats"));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", uptime: client.uptime, guilds: client.guilds.cache.size });
  });

  app.listen(port, () => {
    client.logger.log(`[API] Dashboard API running on port ${port}`, "ready");
  });

  return app;
}

module.exports = createAPIServer;
