/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  images: {
    unoptimized: true
  },
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
    return config;
  },
  env: {
    NEXT_PUBLIC_MONAD_TESTNET_RPC_URL: process.env.NEXT_PUBLIC_MONAD_TESTNET_RPC_URL || 'https://testnet-rpc.monad.xyz',
    NEXT_PUBLIC_CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID || '41454',
    NEXT_PUBLIC_MWAR_TOKEN_ADDRESS: process.env.NEXT_PUBLIC_MWAR_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000',
    NEXT_PUBLIC_HERO_NFT_ADDRESS: process.env.NEXT_PUBLIC_HERO_NFT_ADDRESS || '0x0000000000000000000000000000000000000000',
    NEXT_PUBLIC_GAME_CORE_ADDRESS: process.env.NEXT_PUBLIC_GAME_CORE_ADDRESS || '0x0000000000000000000000000000000000000000',
  },
}

module.exports = nextConfig
