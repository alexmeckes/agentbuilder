/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactStrictMode: true,
  swcMinify: true,
  env: {
    BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:8000',
    ENABLE_MCP_SERVERS: process.env.ENABLE_MCP_SERVERS || 'true',
  },
  // Enable standalone output for Vercel
  output: 'standalone',
}

module.exports = nextConfig 