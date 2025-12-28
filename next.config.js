const path = require('path');

/** @type {import('next').NextConfig} */
const emptyModulePath = path.resolve(__dirname, 'utils/emptyModule.js');

const nextConfig = {
  output: 'export',
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
  // Enable experimental WASM support
  experimental: {
    webpackBuildWorker: true,
  },
  // Turbopack configuration for Next.js 16+
  turbopack: {
    resolveAlias: {
      fs: { browser: './utils/emptyModule.js' },
      path: { browser: './utils/emptyModule.js' },
      url: { browser: './utils/emptyModule.js' },
    },
  },
  // Webpack fallback for WASM support (used in production build)
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    // Fixes for tiktoken and transformers.js in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: emptyModulePath,
        path: emptyModulePath,
        url: emptyModulePath,
        module: false,
        perf_hooks: false,
      };
    }

    return config;
  },
};

module.exports = nextConfig;
