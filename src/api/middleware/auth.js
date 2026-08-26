const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "groove-dashboard-secret-change-me";

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, avatar: user.avatar },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function verifyToken(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

module.exports = { generateToken, verifyToken, JWT_SECRET };
