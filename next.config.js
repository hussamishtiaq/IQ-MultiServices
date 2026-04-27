/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Cloudinary already optimizes; Next still runs through /_next/image but
    // if sharp / optimization fails we don't break the page.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
    // Allow next/image to serve modern formats automatically
    formats: ['image/avif', 'image/webp'],
    // Reasonable cache TTL (60s minimum) for optimized images
    minimumCacheTTL: 60,
  },
}

module.exports = nextConfig
