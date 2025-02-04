/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['yfwskzwdtvtzjivqbhmp.supabase.co'], // Add your Supabase storage domain
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
