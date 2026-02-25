## 1. 数据模型与管理器更新

- [x] 1.1 在 `src/types.ts` 的 `Card` 接口中增加 `reminderSent?: boolean` 字段
- [x] 1.2 在 `src/dataManager.ts` 中增加 `getAllUsersCards()` 方法，用于后台扫描所有用户的进站状态
- [x] 1.3 在 `src/dataManager.ts` 的 `updateCardStatus` 中，当状态由 `in_station` 变为 `idle` 时，重置 `reminderSent` 为 `false`
- [x] 1.4 在 `src/dataManager.ts` 中实现 `setReminderSent(userId, cardId, value)` 方法，用于持久化提醒状态

## 2. UI 文本格式化优化

- [x] 2.1 更新 `src/index.ts` 中的 `createCardButtons` 函数，应用新文案格式：`(五折: ${card.coupons.A} 减二: ${totalB})`
- [x] 2.2 更新 `src/index.ts` 中的 `showMainMenu` 函数（消息正文部分），应用相同的文案格式
- [x] 2.3 检查并更新全系统的其他优惠券显示点（如 `bot.help` 或消费后的通知）

## 3. 核心交互流程改进

- [x] 3.1 在 `src/index.ts` 的 `bot.action(/^card_(.+)$/)` 处理函数中，优先实行自动出站决策逻辑
- [x] 3.2 实现 `undo_checkin` 的 Bot Action：将卡片状态设为 `idle` 并回复撤销成功
- [x] 3.3 在原有的手动出站菜单中增加"撤销进站"按钮

## 4. 超时检查与提醒

- [x] 4.1 在 `src/index.ts` 中实现 `checkTimeoutReminders` 后台扫描逻辑
- [x] 4.2 设置 `setInterval` 定时执行超时检测（210 分钟检测）
- [x] 4.3 构造并发送带交互按钮（撤销/出站）的超时提醒通知消息
- [x] 4.4 实现提醒消息中按钮对应的 Action 处理程序
