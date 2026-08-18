/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  experimental: {
    /**
     * Load Prisma from Node at runtime instead of bundling it into RSC / Route Handler chunks.
     * Helps avoid intermittent webpack `Cannot read properties of undefined (reading 'call')` when
     * the generated client or query engine was partially updated (e.g. Windows EPERM during `prisma generate`).
     */
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
  },
};

export default nextConfig;
