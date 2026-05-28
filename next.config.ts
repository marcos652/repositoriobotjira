import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  experimental: {
    // Optimize barrel imports for heavy charting libraries
    optimizePackageImports: ['apexcharts', 'react-apexcharts'],
  },
};

export default nextConfig;
