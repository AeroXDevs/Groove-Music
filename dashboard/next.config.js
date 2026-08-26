/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.discordapp.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "i.scdn.co" },
    ],
  },
};

module.exports = nextConfig;
