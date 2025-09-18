/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Azure App Service
  output: 'standalone',
  
  // Optimize for production deployment
  compress: true,
  poweredByHeader: false,
  
  // Ensure proper static file handling
  trailingSlash: false,
  
  // Experimental optimizations
  experimental: {
    // Reduce server bundle size
    serverComponentsExternalPackages: [],
  },
  
  // Environment-specific configurations
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
};

export default nextConfig;