// Auto-generated contract verification
import { ethers } from 'ethers';

export const DEPLOYED_CONTRACTS = {
  MWAR_TOKEN: '0xD2f5d0418577BBCC98aAc97807e433dd091C1Be8',
  HERO_NFT: '0xcD7Cd65d4bE940280B752e10C3eEb6D6cF53B18D',
  GAME_CORE: '0xecde73957F1c15cE2E225fA4F485ABE03fcC7E48',
  NETWORK: 'monadTestnet',
  CHAIN_ID: 10143,
  DEPLOYED_AT: '2025-06-30T08:43:10.353Z'
} as const;

export const verifyContractAddresses = () => {
  const addresses = Object.values(DEPLOYED_CONTRACTS);
  return addresses.every(addr => 
    typeof addr === 'string' && 
    addr.startsWith('0x') && 
    addr.length === 42
  );
};