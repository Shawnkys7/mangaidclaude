import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'thumbnail.komiku.org',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'thumbnail.komiku.to',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'update.komikid.org',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.komiku.org',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.komiku.to',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.komikid.org',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.myanimelist.net',
        port: '',
        pathname: '/**',
      },
    ],
  },
  output: 'standalone',
  transpilePackages: ['motion'],
  webpack: (config, {dev}) => {
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;
