import 'dotenv/config';
import { Telegraf, Markup, Context } from 'telegraf';
import { DataManager } from './dataManager';
import { Card, BotContext } from './types';

const bot = new Telegraf(process.env.BOT_TOKEN!);
const dataManager = new DataManager(process.env.DATA_FILE);

// 用户状态管理
const userStates = new Map<number, string>();

// 获取状态表情符号
function getStatusEmoji(card: Card): string {
    if (card.status === 'in_station') return '🚇';
    if (card.dailyUsage && card.dailyUsage.A && card.dailyUsage.B) return '😴';
    return '😃';
}

// 获取使用次数的颜色表情
function getCouponEmoji(card: Card): string {
    const totalCoupons = card.coupons.A + card.coupons.B.reduce((sum, b) => sum + b.count, 0);
    if (totalCoupons === 0) return '🔴';
    if (totalCoupons <= 2) return '🟠';
    if (totalCoupons <= 5) return '🟡';
    return '🟢';
}

// 创建卡片按钮
function createCardButtons(cards: Card[]) {
    if (cards.length === 0) {
        return Markup.inlineKeyboard([
            [Markup.button.callback('➕ 添加卡片', 'add_card')]
        ]);
    }

    const buttons = cards.map(card => {
        const statusEmoji = getStatusEmoji(card);
        const usageEmoji = getCouponEmoji(card);
        let statusText: string;

        if (card.status === 'in_station') {
            statusText = '进站中';
        } else if (card.dailyUsage && card.dailyUsage.A && card.dailyUsage.B) {
            statusText = '今日已完';
        } else if (card.dailyUsage && card.dailyUsage.A) {
            statusText = '已用五折';
        } else if (card.dailyUsage && card.dailyUsage.B) {
            statusText = '已用减二';
        } else {
            statusText = '空闲';
        }

        const totalB = card.coupons.B.reduce((sum, b) => sum + b.count, 0);
        const buttonText = `${statusEmoji} ${card.name} (五折: ${card.coupons.A} 减二: ${totalB}) ${usageEmoji} - ${statusText}`;

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
function createDeleteButtons(cards: Card[]) {
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
async function showMainMenu(ctx: Context): Promise<void> {
    if (!ctx.from) return;

    const userId = ctx.from.id;
    const cards = dataManager.getCards(userId);

    let message = '🚇 地铁卡管理系统\n\n';

    if (cards.length === 0) {
        message += '您还没有添加任何卡片。点击下面的按钮添加您的第一张卡片！';
    } else {
        message += '您的卡片列表：\n';
        cards.forEach(card => {
            const statusEmoji = getStatusEmoji(card);
            const usageEmoji = getCouponEmoji(card);
            let statusText: string;

            if (card.status === 'in_station') {
                statusText = '进站中';
            } else if (card.dailyUsage && card.dailyUsage.A && card.dailyUsage.B) {
                statusText = '今日已完';
            } else if (card.dailyUsage && card.dailyUsage.A) {
                statusText = '已用五折';
            } else if (card.dailyUsage && card.dailyUsage.B) {
                statusText = '已用减二';
            } else {
                statusText = '空闲';
            }

            const totalB = card.coupons.B.reduce((sum, b) => sum + b.count, 0);
            message += `${statusEmoji} ${card.name}: 五折: ${card.coupons.A} 减二: ${totalB} ${usageEmoji} - ${statusText}\n`;
        });
        message += '\n';
    }

    const keyboard = createCardButtons(cards);

    try {
        if (ctx.callbackQuery) {
            await ctx.editMessageText(message, keyboard);
        } else {
            await ctx.reply(message, keyboard);
        }
    } catch (e) {
        // 如果编辑消息失败（例如内容相同），则发送新消息
        // 或者忽略 "message to edit not found" 错误
        // console.error('Failed to update menu:', e);
        await ctx.reply(message, keyboard);
    }
}

// 启动命令
bot.start((ctx) => {
    showMainMenu(ctx);
});

// 帮助命令
bot.help((ctx) => {
    const helpText = `
🚇 地铁卡管理 Bot 帮助

这个 Bot 可以帮助您管理信用卡的地铁优惠券。

优惠规则：
1. 每张卡初始有 10 张 五折 优惠券
2. 每月自动增加 5 张 减二 优惠券（当月有效）
3. 每张卡每天可以分别使用一次 五折 和 减二

功能：
• /start - 显示主菜单
• /cards - 查看所有卡片
• /reset - 取消当前所有卡的状态，全部设置为空闲
• 添加卡片 - 添加单张信用卡
• 批量添加 - 一次添加多张卡片
• 点击卡片 - 进站操作
• 再次点击 - 出站并选择优惠券

使用方法：
1. 进地铁时点击相应卡片
2. 出地铁时再次点击同一卡片
3. 选择使用的优惠券（五折 或 减二）
`;
    ctx.reply(helpText);
});

// 查看卡片命令
bot.command('cards', (ctx) => {
    showMainMenu(ctx);
});

// 重置所有卡片状态命令
bot.command('reset', async (ctx) => {
    if (!ctx.from) return;
    const userId = ctx.from.id;
    dataManager.resetAllCardsStatus(userId);
    await ctx.reply('✅ 所有卡片状态已重置为「空闲」');
    await showMainMenu(ctx);
});

// 处理添加卡片
bot.action('add_card', (ctx) => {
    if (!ctx.from) return;
    userStates.set(ctx.from.id, 'waiting_card_name');
    ctx.reply('请输入卡片名称（例如：工商银行卡、招商银行卡等）：');
    ctx.answerCbQuery();
});

// 处理批量添加卡片
bot.action('batch_add_card', (ctx) => {
    if (!ctx.from) return;
    userStates.set(ctx.from.id, 'waiting_batch_card_names');
    ctx.reply('请输入多张卡片名称，用逗号分隔\n\n例如：工商银行卡,招商银行卡,建设银行卡\n\n💡 提示：每张卡片名称不超过20个字符');
    ctx.answerCbQuery();
});

// 处理卡片点击
bot.action(/^card_(.+)$/, async (ctx) => {
    if (!ctx.from || !ctx.match) return;

    const cardId = ctx.match[1];
    const userId = ctx.from.id;
    const cards = dataManager.getCards(userId);
    const card = cards.find(c => c.id === cardId);

    if (!card) {
        await ctx.answerCbQuery('卡片不存在！');
        return;
    }

    const totalB = card.coupons.B.reduce((sum, b) => sum + b.count, 0);
    const totalCoupons = card.coupons.A + totalB;

    if (totalCoupons === 0 && card.status === 'idle') {
        await ctx.answerCbQuery('优惠券已用完！');
        return;
    }

    if (card.dailyUsage && card.dailyUsage.A && card.dailyUsage.B && card.status === 'idle') {
        await ctx.answerCbQuery('今天该卡所有优惠已用完！');
        return;
    }

    if (card.status === 'idle') {
        const newStatus = 'in_station';
        const message = `✅ ${card.name} 已进站`;
        dataManager.updateCardStatus(userId, cardId, newStatus);
        await ctx.answerCbQuery(message);
        await showMainMenu(ctx);
    } else if (card.status === 'in_station') {
        // 出站选择优惠券
        const canUseA = !card.dailyUsage?.A && card.coupons.A > 0;
        const canUseB = !card.dailyUsage?.B && totalB > 0;

        // 若只有一种可用，则自动消耗
        if (canUseA && !canUseB) {
            const result = dataManager.consumeCoupon(userId, cardId, 'A');
            if (result.success) {
                await ctx.answerCbQuery(`✅ 自动使用五折 | ${result.message}`);
                await showMainMenu(ctx);
            } else {
                await ctx.answerCbQuery(result.message);
            }
            return;
        }

        if (canUseB && !canUseA) {
            const result = dataManager.consumeCoupon(userId, cardId, 'B');
            if (result.success) {
                await ctx.answerCbQuery(`✅ 自动使用减二 | ${result.message}`);
                await showMainMenu(ctx);
            } else {
                await ctx.answerCbQuery(result.message);
            }
            return;
        }

        // 两种均可用或均不可用时，展示手动选择菜单
        const buttons = [];

        let labelA = `🎟️ 使用五折 (剩余: ${card.coupons.A})`;
        if (card.dailyUsage?.A) labelA += ' [今日已用]';

        if (!card.dailyUsage?.A && card.coupons.A > 0) {
            buttons.push([Markup.button.callback(labelA, `useA_${cardId}`)]);
        }

        let labelB = `🎫 使用减二 (剩余: ${totalB})`;
        if (card.dailyUsage?.B) labelB += ' [今日已用]';

        if (!card.dailyUsage?.B && totalB > 0) {
            buttons.push([Markup.button.callback(labelB, `useB_${cardId}`)]);
        }

        await ctx.reply(`请选择 ${card.name} 使用的优惠券：`, Markup.inlineKeyboard(buttons));
        await ctx.answerCbQuery();
    }
});

// 处理优惠券选择
bot.action(/^use([AB])_(.+)$/, async (ctx) => {
    if (!ctx.from || !ctx.match) return;

    const type = ctx.match[1] as 'A' | 'B';
    const cardId = ctx.match[2];
    const userId = ctx.from.id;

    const result = dataManager.consumeCoupon(userId, cardId, type);

    if (result.success) {
        try {
            await ctx.deleteMessage(); // 删除选择菜单
        } catch (e) {
            // Include a log statement for debugging purposes
            console.error('Failed to delete message:', e);
        }
        await ctx.reply(`✅ ${result.message}`);
        await showMainMenu(ctx);
    } else {
        await ctx.answerCbQuery(result.message);
    }
});

// 取消选择
bot.action('cancel_use', async (ctx) => {
    if (!ctx.from) return;
    await ctx.deleteMessage();
    await ctx.answerCbQuery('已取消');
});

// 处理删除菜单
bot.action('delete_menu', async (ctx) => {
    if (!ctx.from) return;

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
    if (!ctx.from || !ctx.match) return;

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
    if (!ctx.from || !('text' in ctx.message)) return;

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

        const successCards: string[] = [];
        const failedCards: string[] = [];

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

// ---- 超时出站提醒 ----
const CHECKOUT_TIMEOUT_MINUTES = 210; // 可调整的超时阈值（分钟）

async function checkTimeoutReminders(): Promise<void> {
    const allUsers = dataManager.getAllUsersCards();
    const now = Date.now();

    for (const { userId, cards } of allUsers) {
        const numericUserId = parseInt(userId, 10);
        if (isNaN(numericUserId)) continue;

        for (const card of cards) {
            if (card.status !== 'in_station') continue;
            if (card.reminderSent) continue;
            if (!card.checkInTime) continue;

            const checkInMs = new Date(card.checkInTime).getTime();
            const elapsedMinutes = (now - checkInMs) / 60000;

            if (elapsedMinutes >= CHECKOUT_TIMEOUT_MINUTES) {
                const keyboard = Markup.inlineKeyboard([
                    [Markup.button.callback('✅ 已出站，选择优惠券', `reminder_checkout_${card.id}`)]
                ]);

                try {
                    await bot.telegram.sendMessage(
                        numericUserId,
                        `⏰ 提醒：您的卡片「${card.name}」已进站 ${Math.floor(elapsedMinutes)} 分钟，请确认是否已出站。`,
                        keyboard
                    );
                    dataManager.setReminderSent(numericUserId, card.id, true);
                    console.log(`Timeout reminder sent for user ${userId}, card ${card.name}`);
                } catch (e) {
                    console.error(`Failed to send timeout reminder to user ${userId}:`, e);
                }
            }
        }
    }
}

// 处理提醒消息中的"已出站"按钮
bot.action(/^reminder_checkout_(.+)$/, async (ctx) => {
    if (!ctx.from || !ctx.match) return;

    const cardId = ctx.match[1];
    const userId = ctx.from.id;
    const cards = dataManager.getCards(userId);
    const card = cards.find(c => c.id === cardId);

    if (!card || card.status !== 'in_station') {
        await ctx.answerCbQuery('该卡片当前不在进站状态');
        try { await ctx.deleteMessage(); } catch (e) { /* 忽略 */ }
        return;
    }

    const totalB = card.coupons.B.reduce((sum, b) => sum + b.count, 0);
    const canUseA = !card.dailyUsage?.A && card.coupons.A > 0;
    const canUseB = !card.dailyUsage?.B && totalB > 0;

    // 若只有一种可用，自动消耗
    if (canUseA && !canUseB) {
        const result = dataManager.consumeCoupon(userId, cardId, 'A');
        try { await ctx.deleteMessage(); } catch (e) { /* 忽略 */ }
        await ctx.answerCbQuery(`✅ 自动使用五折 | ${result.message}`);
        await showMainMenu(ctx);
        return;
    }

    if (canUseB && !canUseA) {
        const result = dataManager.consumeCoupon(userId, cardId, 'B');
        try { await ctx.deleteMessage(); } catch (e) { /* 忽略 */ }
        await ctx.answerCbQuery(`✅ 自动使用减二 | ${result.message}`);
        await showMainMenu(ctx);
        return;
    }

    // 展示选择菜单
    const buttons = [];
    if (!card.dailyUsage?.A && card.coupons.A > 0) {
        buttons.push([Markup.button.callback(`🎟️ 使用五折 (剩余: ${card.coupons.A})`, `useA_${cardId}`)]);
    }
    if (!card.dailyUsage?.B && totalB > 0) {
        buttons.push([Markup.button.callback(`🎫 使用减二 (剩余: ${totalB})`, `useB_${cardId}`)]);
    }

    try { await ctx.deleteMessage(); } catch (e) { /* 忽略 */ }
    await ctx.reply(`请选择 ${card.name} 使用的优惠券：`, Markup.inlineKeyboard(buttons));
    await ctx.answerCbQuery();
});

// 启动 Bot
console.log('Starting Metro Card Bot...');

bot.telegram.setMyCommands([
    { command: 'start', description: '显示主菜单' },
    { command: 'cards', description: '查看所有卡片' },
    { command: 'reset', description: '重置所有卡片状态为「空闲」' },
    { command: 'help', description: '显示帮助信息' }
]);

bot.launch().then(() => {
    console.log('Metro Card Bot is running!');
    // 启动超时提醒定时器（每分钟扫描一次）
    setInterval(checkTimeoutReminders, 60 * 1000);
    console.log(`Timeout reminder checker started (threshold: ${CHECKOUT_TIMEOUT_MINUTES} min)`);
});

// 优雅关闭
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
