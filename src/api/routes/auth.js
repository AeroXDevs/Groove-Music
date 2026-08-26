const router = require("express").Router();
const { generateToken, verifyToken } = require("../middleware/auth");

const DISCORD_API = "https://discord.com/api/v10";
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || "http://localhost:3000/api/auth/callback";

router.get("/login", (req, res) => {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "identify guilds"
  });
  res.json({ url: `https://discord.com/api/oauth2/authorize?${params}` });
});

router.post("/callback", async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Missing code" });

  try {
    const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return res.status(400).json({ error: "Failed to exchange code" });
    }

    const userRes = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const user = await userRes.json();

    const guildsRes = await fetch(`${DISCORD_API}/users/@me/guilds`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const guilds = await guildsRes.json();

    const jwt = generateToken(user);

    res.cookie("token", jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      user: {
        id: user.id,
        username: user.username,
        globalName: user.global_name,
        avatar: user.avatar,
        discriminator: user.discriminator
      },
      guilds: guilds
        .filter(g => (g.permissions & 0x20) === 0x20)
        .map(g => ({
          id: g.id,
          name: g.name,
          icon: g.icon,
          owner: g.owner
        })),
      token: jwt
    });
  } catch (err) {
    console.error("[API Auth]", err);
    res.status(500).json({ error: "Authentication failed" });
  }
});

router.get("/me", verifyToken, (req, res) => {
  res.json({ user: req.user });
});

router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ success: true });
});

module.exports = router;
