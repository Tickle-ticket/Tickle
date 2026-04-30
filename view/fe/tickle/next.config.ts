import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // output: 'standalone',
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.namu.wiki' },
      { protocol: 'https', hostname: 'ticketimage.interpark.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'tkfile.yes24.com' },
      { protocol: 'https', hostname: 'i.pravatar.cc' },
      { protocol: 'https', hostname: 'picsum.photos' },
    ],
  },
};

export default nextConfig;
