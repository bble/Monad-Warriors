// Auto-generated contract verification
import { ethers } from 'ethers';

export const DEPLOYED_CONTRACTS = {
  MWAR_TOKEN: '0xa200561a8e6325fD24AE767c1701F2d1Aa3860e1',
  HERO_NFT: '0x01Eb7582f8cf98EeB5bd7F0aCfC8DACCeeD18F96',
  GAME_CORE: '0x935e44C9fAc29E17AcE3E5AB047D8027E6E1A101',
  NETWORK: 'monadTestnet',
  CHAIN_ID: 10143,
  DEPLOYED_AT: '2025-01-01T00:00:00.000Z'
} as const;

export const verifyContractAddresses = () => {
  const addresses = Object.values(DEPLOYED_CONTRACTS);
  return addresses.every(addr => 
    typeof addr === 'string' && 
    addr.startsWith('0x') && 
    addr.length === 42
  );
};