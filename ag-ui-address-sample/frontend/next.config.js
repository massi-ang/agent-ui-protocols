/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  transpilePackages: ['@copilotkit/react-ui', '@copilotkit/react-core'],
}
module.exports = nextConfig
