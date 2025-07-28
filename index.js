require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const DataManager = require('./dataManager');

const bot = new Telegraf(process.env.BOT_TOKEN);
const dataManager = new DataManager(process.env.DATA_FILE);

// 常量
const MAX_MONTHLY_USAGE = 10;

// 获取状态表情符号
function getStatusEmoji(status) {
    switch (status) {
        case 'idle': return '⚪';
        case 'in_station': return '🟢';
        default: return '⚪';
    }
}

// 获取使用次数的颜色表情
function getUsageEmoji(usage) {
    if (usage >= MAX_MONTHLY_USAGE) return '🔴';
    if (usage >= 8) return '🟡';
    if (usage >= 5) return '🟠';
    return '🟢';
}

// 创建卡片按钮
function createCardButtons(cards) {
    if (cards.length === 0) {
        return Markup.inlineKeyboard([
            [Markup.button.callback('➕ 添加卡片', 'add_card')]
        ]);
    }

    const buttons = cards.map(card => {
        const statusEmoji = getStatusEmoji(card.status);
        const usageEmoji = getUsageEmoji(card.monthlyUsage);
        const statusText = card.status === 'in_station' ? '进站中' : '空闲';
        const buttonText = `${statusEmoji} ${card.name} (${card.monthlyUsage}/${MAX_MONTHLY_USAGE}) ${usageEmoji} - ${statusText}`;

        return [Markup.button.callback(buttonText, `card_${card.id}`)];
    });

    buttons.push([
        Markup.button.callback('➕ 添加卡片', 'add_card'),
        Markup.button.callback('➕ 批量添加', 'batch_add_card')
    ]);
    buttons.push([
        Markup.button.callback('🗑️ 删除卡片', 'delete_menu')
    ]);

    return Markup.inlineKeyboard(buttons);
}

// 创建删除卡片按钮
function createDeleteButtons(cards) {
    if (cards.length === 0) {
        return Markup.inlineKeyboard([
            [Markup.button.callback('⬅️ 返回', 'back_to_main')]
        ]);
    }

    const buttons = cards.map(card => [
        Markup.button.callback(`🗑️ ${card.name}`, `delete_${card.id}`)
    ]);

    buttons.push([Markup.button.callback('⬅️ 返回', 'back_to_main')]);
    return Markup.inlineKeyboard(buttons);
}

// 显示主菜单
async function showMainMenu(ctx) {
    const userId = ctx.from.id;
    const cards = dataManager.getCards(userId);

    let message = '🚇 地铁卡管理系统\n\n';

    if (cards.length === 0) {
        message += '您还没有添加任何卡片。点击下面的按钮添加您的第一张卡片！';
    } else {
        message += '您的卡片列表：\n';
        cards.forEach(card => {
            const statusEmoji = getStatusEmoji(card.status);
            const usageEmoji = getUsageEmoji(card.monthlyUsage);
            const statusText = card.status === 'in_station' ? '进站中' : '空闲';
            message += `${statusEmoji} ${card.name}: ${card.monthlyUsage}/${MAX_MONTHLY_USAGE} 次 ${usageEmoji} - ${statusText}\n`;
        });
        message += '\n点击卡片按钮来进站/出站：';
    }

    const keyboard = createCardButtons(cards);

    if (ctx.callbackQuery) {
        await ctx.editMessageText(message, keyboard);
    } else {
        await ctx.reply(message, keyboard);
    }
}

// 用户状态管理
const userStates = new Map();

// 启动命令
bot.start((ctx) => {
    showMainMenu(ctx);
});

// 帮助命令
bot.help((ctx) => {
    const helpText = `
🚇 地铁卡管理 Bot 帮助

这个 Bot 可以帮助您管理信用卡的地铁使用次数（每月最多10次）。

功能：
• /start - 显示主菜单
• /cards - 查看所有卡片
• 添加卡片 - 添加单张信用卡
• 批量添加 - 一次添加多张卡片（用逗号分隔）
• 点击卡片 - 进站/出站操作
• 删除卡片 - 移除不需要的卡片

使用方法：
1. 添加您的信用卡（支持批量添加）
2. 进地铁时点击相应卡片（显示"进站中"状态）
3. 出地铁时再次点击同一卡片（完成一次乘坐，次数+1）

批量添加示例：
工商银行卡,招商银行卡,建设银行卡

每月会自动重置使用次数。
`;
    ctx.reply(helpText);
});

// 查看卡片命令
bot.command('cards', (ctx) => {
    showMainMenu(ctx);
});

// 处理添加卡片
bot.action('add_card', (ctx) => {
    userStates.set(ctx.from.id, 'waiting_card_name');
    ctx.reply('请输入卡片名称（例如：工商银行卡、招商银行卡等）：');
    ctx.answerCbQuery();
});

// 处理批量添加卡片
bot.action('batch_add_card', (ctx) => {
    userStates.set(ctx.from.id, 'waiting_batch_card_names');
    ctx.reply('请输入多张卡片名称，用逗号分隔\n\n例如：工商银行卡,招商银行卡,建设银行卡\n\n💡 提示：每张卡片名称不超过20个字符');
    ctx.answerCbQuery();
});

// 处理卡片点击
bot.action(/^card_(.+)$/, async (ctx) => {
    const cardId = ctx.match[1];
    const userId = ctx.from.id;
    const cards = dataManager.getCards(userId);
    const card = cards.find(c => c.id === cardId);

    if (!card) {
        await ctx.answerCbQuery('卡片不存在！');
        return;
    }

    if (card.monthlyUsage >= MAX_MONTHLY_USAGE && card.status === 'idle') {
        await ctx.answerCbQuery('本月使用次数已达上限！');
        return;
    }

    let newStatus;
    let message;

    if (card.status === 'idle') {
        newStatus = 'in_station';
        message = `✅ ${card.name} 已进站`;
    } else if (card.status === 'in_station') {
        newStatus = 'idle';
        message = `✅ ${card.name} 已出站，本月使用次数：${card.monthlyUsage + 1}/${MAX_MONTHLY_USAGE}`;
    }

    dataManager.updateCardStatus(userId, cardId, newStatus);
    await ctx.answerCbQuery(message);
    await showMainMenu(ctx);
});

// 处理删除菜单
bot.action('delete_menu', async (ctx) => {
    const userId = ctx.from.id;
    const cards = dataManager.getCards(userId);

    const message = cards.length === 0
        ? '没有可删除的卡片。'
        : '选择要删除的卡片：';

    const keyboard = createDeleteButtons(cards);
    await ctx.editMessageText(message, keyboard);
    await ctx.answerCbQuery();
});

// 处理删除卡片
bot.action(/^delete_(.+)$/, async (ctx) => {
    const cardId = ctx.match[1];
    const userId = ctx.from.id;
    const cards = dataManager.getCards(userId);
    const card = cards.find(c => c.id === cardId);

    if (!card) {
        await ctx.answerCbQuery('卡片不存在！');
        return;
    }

    dataManager.deleteCard(userId, cardId);
    await ctx.answerCbQuery(`已删除卡片：${card.name}`);
    await showMainMenu(ctx);
});

// 返回主菜单
bot.action('back_to_main', async (ctx) => {
    await showMainMenu(ctx);
    await ctx.answerCbQuery();
});

// 处理文本消息（添加卡片名称）
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const userState = userStates.get(userId);

    if (userState === 'waiting_card_name') {
        const cardName = ctx.message.text.trim();

        if (cardName.length === 0) {
            await ctx.reply('卡片名称不能为空，请重新输入：');
            return;
        }

        if (cardName.length > 20) {
            await ctx.reply('卡片名称太长，请输入20个字符以内的名称：');
            return;
        }

        const success = dataManager.addCard(userId, cardName);

        if (success) {
            userStates.delete(userId);
            await ctx.reply(`✅ 成功添加卡片：${cardName}`);
            await showMainMenu(ctx);
        } else {
            await ctx.reply('该卡片名称已存在，请使用其他名称：');
        }
    } else if (userState === 'waiting_batch_card_names') {
        const input = ctx.message.text.trim();

        if (input.length === 0) {
            await ctx.reply('输入不能为空，请重新输入：');
            return;
        }

        // 按逗号分割卡片名称
        const cardNames = input.split(',').map(name => name.trim()).filter(name => name.length > 0);

        if (cardNames.length === 0) {
            await ctx.reply('未检测到有效的卡片名称，请重新输入：');
            return;
        }

        if (cardNames.length > 10) {
            await ctx.reply('一次最多只能添加10张卡片，请重新输入：');
            return;
        }

        const results = [];
        const successCards = [];
        const failedCards = [];

        for (const cardName of cardNames) {
            if (cardName.length === 0) {
                continue;
            }

            if (cardName.length > 20) {
                failedCards.push(`${cardName}（名称过长）`);
                continue;
            }

            const success = dataManager.addCard(userId, cardName);
            if (success) {
                successCards.push(cardName);
            } else {
                failedCards.push(`${cardName}（已存在）`);
            }
        }

        userStates.delete(userId);

        let message = '📋 批量添加结果：\n\n';

        if (successCards.length > 0) {
            message += `✅ 成功添加 ${successCards.length} 张卡片：\n`;
            successCards.forEach(name => {
                message += `• ${name}\n`;
            });
        }

        if (failedCards.length > 0) {
            message += `\n❌ 添加失败 ${failedCards.length} 张卡片：\n`;
            failedCards.forEach(name => {
                message += `• ${name}\n`;
            });
        }

        await ctx.reply(message);
        await showMainMenu(ctx);
    } else {
        // 默认显示主菜单
        await showMainMenu(ctx);
    }
});

// 错误处理
bot.catch((err, ctx) => {
    console.error('Bot error:', err);
    ctx.reply('发生错误，请稍后重试。');
});

// 启动 Bot
console.log('Starting Metro Card Bot...');
bot.launch().then(() => {
    console.log('Metro Card Bot is running!');
});

// 优雅关闭
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
