const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/a/**',
      },
      {
        // The episode video's poster, resized for its box by
        // components/stories/VideoFacade.tsx: oar2.jpg (a Short's 1080x1920
        // frame) and hqdefault.jpg (landscape), the two files
        // lib/stories/videos.ts youtubeThumbnailUrl() can return.
        protocol: 'https',
        hostname: 'i.ytimg.com',
        pathname: '/vi/*/oar2.jpg',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        pathname: '/vi/*/hqdefault.jpg',
      },
      {
        protocol: 'https',
        hostname: 'pbs.twimg.com',
        pathname: '/profile_images/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'logos-world.net',
        pathname: '/wp-content/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
    ],
  },
  
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons', 'react-icons'],
  },
  async redirects() {
    return [
      // The sponsor-slot sales page, retired 2026-09-28. It sold a banner that
      // had not rendered anywhere since the ad slot was dropped on 2026-08-01,
      // so it goes rather than being hidden. Permanent, so the indexed URL
      // passes to the homepage instead of decaying into a 404.
      { source: '/advertise', destination: '/', permanent: true },
    ];
  },
  async headers() {
    // Next's dev-mode react-refresh runtime evaluates a string as JavaScript.
    // Without 'unsafe-eval' the whole main-app chunk throws an EvalError, which
    // means NO client component hydrates under `pnpm dev` — buttons, search and
    // the /admin review tool are all inert. Scoped to development only; the
    // production header is byte-for-byte what it was.
    const scriptSrc = [
      "script-src 'self' 'unsafe-inline'",
      process.env.NODE_ENV === 'production' ? null : "'unsafe-eval'",
      'https://vercel.live https://us-assets.i.posthog.com https://app.posthog.com https://js.stripe.com https://datafa.st',
    ]
      .filter(Boolean)
      .join(' ');

    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              scriptSrc,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https: blob:",
              "media-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
              // youtube-nocookie.com: the episode video facade's player iframe, created only on click.
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://www.youtube-nocookie.com",
              "connect-src 'self' https://api.stripe.com https://us-assets.i.posthog.com https://app.posthog.com https://api.openai.com https://upload.uploadthing.com wss: https:"
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = withBundleAnalyzer(nextConfig);
