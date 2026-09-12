/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // Dev-only: allowed origins for local network dev access
  ...(process.env.NODE_ENV !== "production" && {
    allowedDevOrigins: ["100.109.191.75"],
  }),
  // Allow serving uploaded images from the persistent data directory
  images: {
    unoptimized: true,
  },
  // Rewrite /uploads/* to the dedicated uploads API route so that
  // production standalone builds can serve files from ProgramData
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "/api/uploads/:path*",
      },
    ];
  },
};

export default nextConfig;
