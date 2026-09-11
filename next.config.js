/** @type {import('next').NextConfig} */
const nextConfig = {
  agentRules: false,
  images: {
    remotePatterns: [
      // Supabase Storage — where admin-uploaded menu photos live
      { protocol: "https", hostname: "wgpzhfcdrycorpbmovuc.supabase.co", pathname: "/storage/v1/object/public/**" },
      // Admins can also paste an arbitrary image URL from the web
      { protocol: "https", hostname: "**" },
    ],
  },
};

module.exports = nextConfig;
