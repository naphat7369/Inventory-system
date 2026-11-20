import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow phones/tablets on the same LAN to load Next.js development assets.
  // Production requests are governed by the deployed origin and are unaffected.
  allowedDevOrigins: ['192.168.1.153'],
  async redirects() {
    return [
      {
        source: '/e-approve/:path*',
        destination: '/e-documents/:path*',
        permanent: false,
      },
      {
        source: '/settings/e-approve',
        destination: '/settings/e-documents',
        permanent: false,
      },
    ];
  },
};


export default nextConfig;
