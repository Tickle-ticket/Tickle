import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
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
      { protocol: 'https', hostname: 'ssafy-tickle-ticket-2026.s3.ap-northeast-2.amazonaws.com' },
    ],
  },
};

export default nextConfig;
