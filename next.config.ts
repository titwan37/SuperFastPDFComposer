import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  basePath: '/superfastpdfcomposer',
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
  },
  allowedDevOrigins: ["6000-firebase-studio-1763034151557.cluster-cbeiita7rbe7iuwhvjs5zww2i4.cloudworkstations.dev"],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
