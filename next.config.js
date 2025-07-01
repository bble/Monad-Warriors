/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  transpilePackages: [
    '@rainbow-me/rainbowkit',
    '@vanilla-extract/css',
    '@vanilla-extract/dynamic',
    '@vanilla-extract/sprinkles'
  ],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
    }

    // 强制使用 CommonJS 导入
    config.module.rules.push({
      test: /node_modules\/@vanilla-extract\/sprinkles/,
      type: 'javascript/auto',
    });

    return config;
  },
  // 添加头部配置来处理CORS和安全问题
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
  env: {
    NEXT_PUBLIC_MONAD_TESTNET_RPC_URL: process.env.NEXT_PUBLIC_MONAD_TESTNET_RPC_URL || 'https://testnet-rpc.monad.xyz',
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID || '10143',
    NEXT_PUBLIC_MWAR_TOKEN_ADDRESS: process.env.NEXT_PUBLIC_MWAR_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000',
    NEXT_PUBLIC_HERO_NFT_ADDRESS: process.env.NEXT_PUBLIC_HERO_NFT_ADDRESS || '0x0000000000000000000000000000000000000000',
    NEXT_PUBLIC_GAME_CORE_ADDRESS: process.env.NEXT_PUBLIC_GAME_CORE_ADDRESS || '0x0000000000000000000000000000000000000000',
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '00000000000000000000000000000000',
  },
}

module.exports = nextConfig
