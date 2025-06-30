#!/usr/bin/env node

/**
 * Monad Warriors - 部署前检查脚本
 * 确保项目在部署前满足所有要求
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Monad Warriors - Deployment Readiness Check\n');

let checksPassed = 0;
let totalChecks = 0;
const issues = [];

function runCheck(name, checkFn) {
  totalChecks++;
  console.log(`🔍 Checking ${name}...`);
  
  try {
    const result = checkFn();
    if (result.success) {
      console.log(`✅ ${name}: ${result.message}`);
      checksPassed++;
    } else {
      console.log(`❌ ${name}: ${result.message}`);
      issues.push(`${name}: ${result.message}`);
    }
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    issues.push(`${name}: ${error.message}`);
  }
  
  console.log('');
}

// 1. 检查环境变量
runCheck('Environment Variables', () => {
  const envExample = path.join(process.cwd(), '.env.example');
  const env = path.join(process.cwd(), '.env');
  
  if (!fs.existsSync(envExample)) {
    return { success: false, message: '.env.example file missing' };
  }
  
  if (!fs.existsSync(env)) {
    return { success: false, message: '.env file missing - copy from .env.example' };
  }
  
  const envContent = fs.readFileSync(env, 'utf8');
  const requiredVars = [
    'NEXT_PUBLIC_MONAD_TESTNET_RPC_URL',
    'NEXT_PUBLIC_CHAIN_ID',
    'NEXT_PUBLIC_MWAR_TOKEN_ADDRESS',
    'NEXT_PUBLIC_HERO_NFT_ADDRESS',
    'NEXT_PUBLIC_GAME_CORE_ADDRESS'
  ];
  
  const missingVars = requiredVars.filter(varName => !envContent.includes(varName));
  
  if (missingVars.length > 0) {
    return { success: false, message: `Missing variables: ${missingVars.join(', ')}` };
  }
  
  return { success: true, message: 'All required environment variables present' };
});

// 2. 检查依赖项
runCheck('Dependencies', () => {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const requiredDeps = [
      'next',
      'react',
      'react-dom',
      '@rainbow-me/rainbowkit',
      'wagmi',
      'viem'
    ];
    
    const missingDeps = requiredDeps.filter(dep => 
      !packageJson.dependencies[dep] && !packageJson.devDependencies[dep]
    );
    
    if (missingDeps.length > 0) {
      return { success: false, message: `Missing dependencies: ${missingDeps.join(', ')}` };
    }
    
    return { success: true, message: 'All required dependencies installed' };
  } catch (error) {
    return { success: false, message: 'Could not read package.json' };
  }
});

// 3. 检查TypeScript配置
runCheck('TypeScript Configuration', () => {
  const tsConfig = path.join(process.cwd(), 'tsconfig.json');
  
  if (!fs.existsSync(tsConfig)) {
    return { success: false, message: 'tsconfig.json missing' };
  }
  
  try {
    const config = JSON.parse(fs.readFileSync(tsConfig, 'utf8'));
    
    if (!config.compilerOptions) {
      return { success: false, message: 'Invalid tsconfig.json structure' };
    }
    
    return { success: true, message: 'TypeScript configuration valid' };
  } catch (error) {
    return { success: false, message: 'Invalid tsconfig.json format' };
  }
});

// 4. 检查核心组件
runCheck('Core Components', () => {
  const coreComponents = [
    'components/HeroCollection.tsx',
    'components/GameLobby.tsx',
    'components/GameArena.tsx',
    'components/PlayerStats.tsx',
    'components/Equipment.tsx',
    'components/Marketplace.tsx',
    'components/Guild.tsx',
    'components/Leaderboard.tsx',
    'components/Quests.tsx'
  ];
  
  const missingComponents = coreComponents.filter(comp => !fs.existsSync(comp));
  
  if (missingComponents.length > 0) {
    return { success: false, message: `Missing components: ${missingComponents.join(', ')}` };
  }
  
  return { success: true, message: 'All core components present' };
});

// 5. 检查智能合约
runCheck('Smart Contracts', () => {
  const contracts = [
    'contracts/MWARToken.sol',
    'contracts/HeroNFT.sol',
    'contracts/GameCore.sol'
  ];
  
  const missingContracts = contracts.filter(contract => !fs.existsSync(contract));
  
  if (missingContracts.length > 0) {
    return { success: false, message: `Missing contracts: ${missingContracts.join(', ')}` };
  }
  
  return { success: true, message: 'All smart contracts present' };
});

// 6. 检查测试文件
runCheck('Test Coverage', () => {
  const testDirs = ['test', '__tests__'];
  const hasTests = testDirs.some(dir => fs.existsSync(dir));
  
  if (!hasTests) {
    return { success: false, message: 'No test directory found' };
  }
  
  // 检查是否有测试文件
  const testFiles = [];
  testDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir, { recursive: true });
      testFiles.push(...files.filter(file => file.includes('.test.')));
    }
  });
  
  if (testFiles.length === 0) {
    return { success: false, message: 'No test files found' };
  }
  
  return { success: true, message: `Found ${testFiles.length} test files` };
});

// 7. 检查构建配置
runCheck('Build Configuration', () => {
  const nextConfig = path.join(process.cwd(), 'next.config.js');
  
  if (!fs.existsSync(nextConfig)) {
    return { success: false, message: 'next.config.js missing' };
  }
  
  const tailwindConfig = path.join(process.cwd(), 'tailwind.config.js');
  
  if (!fs.existsSync(tailwindConfig)) {
    return { success: false, message: 'tailwind.config.js missing' };
  }
  
  return { success: true, message: 'Build configuration files present' };
});

// 8. 检查文档
runCheck('Documentation', () => {
  const docs = [
    'README.md',
    'DEMO_GUIDE.md',
    'PROJECT_SUMMARY.md'
  ];
  
  const missingDocs = docs.filter(doc => !fs.existsSync(doc));
  
  if (missingDocs.length > 0) {
    return { success: false, message: `Missing documentation: ${missingDocs.join(', ')}` };
  }
  
  return { success: true, message: 'All documentation present' };
});

// 9. 检查公共资源
runCheck('Public Assets', () => {
  const publicDir = path.join(process.cwd(), 'public');
  
  if (!fs.existsSync(publicDir)) {
    return { success: false, message: 'public directory missing' };
  }
  
  const requiredFiles = ['manifest.json', 'robots.txt'];
  const missingFiles = requiredFiles.filter(file => 
    !fs.existsSync(path.join(publicDir, file))
  );
  
  if (missingFiles.length > 0) {
    return { success: false, message: `Missing public files: ${missingFiles.join(', ')}` };
  }
  
  return { success: true, message: 'Public assets configured' };
});

// 10. 尝试构建项目
runCheck('Build Test', () => {
  try {
    console.log('   Building project...');
    execSync('npm run build', { stdio: 'pipe' });
    return { success: true, message: 'Project builds successfully' };
  } catch (error) {
    return { success: false, message: 'Build failed - check build errors' };
  }
});

// 生成报告
console.log('📊 Deployment Readiness Report');
console.log('='.repeat(50));
console.log(`✅ Checks Passed: ${checksPassed}/${totalChecks}`);
console.log(`❌ Issues Found: ${issues.length}`);
console.log('');

if (issues.length > 0) {
  console.log('🚨 Issues to Fix:');
  issues.forEach((issue, index) => {
    console.log(`   ${index + 1}. ${issue}`);
  });
  console.log('');
}

// 计算就绪度分数
const readinessScore = Math.round((checksPassed / totalChecks) * 100);
console.log(`📈 Deployment Readiness Score: ${readinessScore}%`);

if (readinessScore >= 90) {
  console.log('🎉 Project is ready for deployment!');
  console.log('');
  console.log('🚀 Next steps:');
  console.log('   1. Deploy contracts to Monad Testnet');
  console.log('   2. Update environment variables with contract addresses');
  console.log('   3. Deploy frontend to Vercel/Netlify');
  console.log('   4. Test all functionality on deployed version');
} else if (readinessScore >= 70) {
  console.log('⚠️  Project is mostly ready, but has some issues to fix');
  console.log('   Fix the issues above before deploying');
} else {
  console.log('❌ Project is not ready for deployment');
  console.log('   Please fix the critical issues above');
}

console.log('');
console.log('📋 Deployment Checklist:');
console.log('   □ All environment variables configured');
console.log('   □ Smart contracts deployed to Monad Testnet');
console.log('   □ Frontend deployed and accessible');
console.log('   □ All features tested and working');
console.log('   □ Performance optimized');
console.log('   □ Security audit completed');
console.log('   □ Documentation updated');
console.log('   □ Demo prepared');

// 保存报告
const report = {
  timestamp: new Date().toISOString(),
  checksPassed,
  totalChecks,
  readinessScore,
  issues,
  status: readinessScore >= 90 ? 'ready' : readinessScore >= 70 ? 'mostly-ready' : 'not-ready'
};

fs.writeFileSync('deployment-readiness-report.json', JSON.stringify(report, null, 2));
console.log('');
console.log('💾 Report saved to: deployment-readiness-report.json');

process.exit(readinessScore >= 70 ? 0 : 1);
