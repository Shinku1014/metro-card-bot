## Context

当前系统是一个基于 Telegraf 的 Telegram Bot，用于管理信用卡地铁优惠券。核心逻辑位于 `src/index.ts`（交互逻辑）和 `src/dataManager.ts`（数据持久化）。
目前的出站流程是：点击“进站中”的卡片 -> 弹出菜单选择 A 或 B 优惠券 -> 消耗优惠券并重置状态。
数据存储在 `data/cards.json` 中，包含每张卡的优惠券剩余数量和每日使用情况。

## Goals / Non-Goals

**Goals:**
- 实现自动优惠券选择逻辑以简化操作。
- 优化 UI 文字描述，使其更符合中文习惯。
- 提供误操作撤销机制。
- 实现后台超时检测与提醒，防止用户忘记出站。

**Non-Goals:**
- 重新设计数据库结构（仅在必要时扩展字段）。
- 修改优惠券的发放规则（保持 10张 A + 每月 5张 B）。

## Decisions

### 1. 自动出站决策逻辑
在用户点击“进站中”卡片时，程序将首先检查 A 和 B 的可用性：
- 条件：(剩余数量 > 0) AND (今日未用)。
- 如果仅有一个条件满足，则直接调用 `consumeCoupon` 逻辑并回复消息。
- 如果两个都满足或都不满足（兜底处理），则保持原有菜单选择逻辑。

### 2. 超时提醒机制（Background Task）
在 `index.ts` 启动时，使用 `setInterval` 每分钟执行一次扫描（或根据性能调整频率）。
- 扫描逻辑：遍历所有用户的所有卡片。
- 触发条件：`card.status === 'in_station'` 且 `(now - lastUsed) > 210 minutes`。
- 通知方式：通过 `bot.telegram.sendMessage` 发送带 Inline Keyboard 的消息。
- **注意**：为了避免重复提醒，可能需要在 `Card` 对象中增加 `reminderSent: boolean` 字段，或者利用 `lastUsed` 的时间差（如仅在 210-215 分钟区间内提醒一次）。本设计采用 `reminderSent` 标志位以确保精准。

### 3. UI 文本格式化
全局搜索 `五折:` 和 `-2:` 字符串。
- `(五折:${card.coupons.A} -2:${totalB})` -> `(五折: ${card.coupons.A} 减二: ${totalB})` (注意冒号后的空格)。

### 4. 撤销进站逻辑
在卡片点击逻辑中，如果卡片处于 `in_station` 状态，弹出的选择菜单（或自动流程之前的判断）中增加一个 `undo_checkin` 的 Action 按钮。
- 执行逻辑：将 `status` 设为 `idle`，更新 `lastUsed`，不消耗任何优惠券。

## Risks / Trade-offs

- **[Risk]** 多卡进站提醒冲突 → **[Mitigation]** 提醒消息应明确指出是哪张卡片超时。
- **[Risk]** 内存中维护定时任务在重启时重置 → **[Mitigation]** 由于数据在 `cards.json` 中，重启后定时扫描依然能根据 `lastUsed` 时间判断。由于 `reminderSent` 标志位持久化在 json 中，不会导致重复提醒。

## Migration Plan
1. 修改 `types.ts` 中的 `Card` 接口，增加 `reminderSent?: boolean`。
2. 运行 `dataManager.getCards` 时自动为旧卡片补全字段。
3. 部署后，系统将自动开始扫描现有进站卡片。
