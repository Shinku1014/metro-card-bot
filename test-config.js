require('dotenv').config();

console.log('🔧 Metro Card Bot 配置检查...\n');

// 检查必要的环境变量
const requiredEnvVars = ['BOT_TOKEN'];
let configOk = true;

requiredEnvVars.forEach(varName => {
    const value = process.env[varName];
    if (!value || value === 'your_bot_token_here') {
        console.log(`❌ ${varName}: 未配置或使用默认值`);
        configOk = false;
    } else {
        console.log(`✅ ${varName}: 已配置`);
    }
});

// 检查数据文件路径
const dataFile = process.env.DATA_FILE || './data/cards.json';
console.log(`📁 数据文件路径: ${dataFile}`);

// 检查依赖
try {
    require('telegraf');
    console.log('✅ Telegraf: 已安装');
} catch (error) {
    console.log('❌ Telegraf: 未安装');
    configOk = false;
}

try {
    require('dotenv');
    console.log('✅ dotenv: 已安装');
} catch (error) {
    console.log('❌ dotenv: 未安装');
    configOk = false;
}

console.log('\n' + '='.repeat(50));

if (configOk) {
    console.log('🎉 配置检查通过！可以启动 Bot 了。');
    console.log('\n运行命令：');
    console.log('  npm start     # 生产环境');
    console.log('  npm run dev   # 开发环境');
} else {
    console.log('⚠️  配置检查失败，请修复以上问题后重试。');
    console.log('\n需要配置：');
    console.log('1. 编辑 .env 文件，设置正确的 BOT_TOKEN');
    console.log('2. 确保所有依赖已正确安装');
}

console.log('\n📖 详细使用说明请查看 USAGE.md 文件');
