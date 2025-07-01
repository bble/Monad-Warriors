// Gas设置助手工具

export interface GasSettings {
  gasLimit: string;
  gasPrice: string; // in gwei
  estimatedCost: string; // in MON
}

export interface GasRecommendation {
  conservative: GasSettings;
  standard: GasSettings;
  fast: GasSettings;
}

/**
 * 根据交易类型获取推荐的gas设置
 */
export function getGasRecommendations(baseGasEstimate: bigint, currentGasPrice: bigint): GasRecommendation {
  // 战斗交易的最小gas限制（基于失败案例分析）
  const MIN_BATTLE_GAS = BigInt(800000);

  // 确保gas限制足够
  const safeGasLimit = baseGasEstimate > MIN_BATTLE_GAS ? baseGasEstimate : MIN_BATTLE_GAS;

  // 不同策略的gas限制
  const conservativeGas = safeGasLimit + (safeGasLimit * BigInt(100)) / BigInt(100); // +100%
  const standardGas = safeGasLimit + (safeGasLimit * BigInt(50)) / BigInt(100);     // +50%
  const fastGas = safeGasLimit + (safeGasLimit * BigInt(20)) / BigInt(100);         // +20%

  // 不同策略的gas价格（gwei）
  const conservativePrice = BigInt(15) * BigInt(1000000000); // 15 gwei
  const standardPrice = BigInt(20) * BigInt(1000000000);     // 20 gwei
  const fastPrice = BigInt(30) * BigInt(1000000000);         // 30 gwei
  
  return {
    conservative: {
      gasLimit: conservativeGas.toString(),
      gasPrice: '15',
      estimatedCost: formatMON(conservativeGas * conservativePrice)
    },
    standard: {
      gasLimit: standardGas.toString(),
      gasPrice: '20',
      estimatedCost: formatMON(standardGas * standardPrice)
    },
    fast: {
      gasLimit: fastGas.toString(),
      gasPrice: '30',
      estimatedCost: formatMON(fastGas * fastPrice)
    }
  };
}

/**
 * 格式化MON数量显示
 */
function formatMON(wei: bigint): string {
  const ether = wei / BigInt(1000000000000000000); // 10^18
  const remainder = wei % BigInt(1000000000000000000); // 10^18
  const decimal = remainder / BigInt(100000000000000); // 10^14, 保留4位小数

  if (ether === BigInt(0)) {
    return `0.${decimal.toString().padStart(4, '0')}`;
  }

  return `${ether}.${decimal.toString().padStart(4, '0')}`;
}

/**
 * 验证gas设置是否合理
 */
export function validateGasSettings(gasLimit: string, gasPrice: string): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  const limit = BigInt(gasLimit);
  const price = parseFloat(gasPrice);
  
  // 检查gas限制
  if (limit < BigInt(500000)) {
    errors.push('Gas限制太低，可能导致交易失败');
  } else if (limit < BigInt(800000)) {
    warnings.push('Gas限制偏低，建议设置为800,000以上');
  }

  if (limit > BigInt(2000000)) {
    warnings.push('Gas限制过高，可能浪费费用');
  }
  
  // 检查gas价格
  if (price < 10) {
    warnings.push('Gas价格较低，交易可能确认较慢');
  } else if (price > 50) {
    warnings.push('Gas价格较高，可能产生不必要的费用');
  }
  
  if (price <= 0) {
    errors.push('Gas价格必须大于0');
  }
  
  return {
    isValid: errors.length === 0,
    warnings,
    errors
  };
}

/**
 * 获取当前网络的推荐gas价格
 */
export function getRecommendedGasPrice(networkCongestion: 'low' | 'medium' | 'high' = 'medium'): string {
  switch (networkCongestion) {
    case 'low':
      return '15'; // 15 gwei
    case 'medium':
      return '20'; // 20 gwei
    case 'high':
      return '30'; // 30 gwei
    default:
      return '20';
  }
}

/**
 * 计算交易费用
 */
export function calculateTransactionCost(gasLimit: string, gasPrice: string): {
  costInWei: string;
  costInMON: string;
  costInUSD?: string;
} {
  const limit = BigInt(gasLimit);
  const priceWei = BigInt(parseFloat(gasPrice) * 1e9); // gwei to wei
  
  const costWei = limit * priceWei;
  const costMON = formatMON(costWei);
  
  return {
    costInWei: costWei.toString(),
    costInMON: costMON,
    // costInUSD 需要实时价格数据
  };
}
