// Auto-generated contract verification
import { ethers } from 'ethers';

export const DEPLOYED_CONTRACTS = {
  MWAR_TOKEN: '0x2746231982d7Ba755afbeDF70b102DfD92a886C5',
  HERO_NFT: '0x18F96e349DfDcdF03AEaa89fd4a0BE2C78B40bf4',
  GAME_CORE: '0x5447b32f99A65e5Be2ca278d53dAb9daB54036Aa',
  NETWORK: 'monadTestnet',
  CHAIN_ID: 10143,
  DEPLOYED_AT: '2025-01-01T12:00:00.000Z'
} as const;

export const verifyContractAddresses = () => {
  const addresses = Object.values(DEPLOYED_CONTRACTS);
  return addresses.every(addr => 
    typeof addr === 'string' && 
    addr.startsWith('0x') && 
    addr.length === 42
  );
};