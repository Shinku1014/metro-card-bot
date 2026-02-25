## ADDED Requirements

### Requirement: 撤销进站操作
当用户误点击进站 (`in_station`) 时，系统 SHALL 提供一种在该卡片状态变为 `idle` 但不消耗任何优惠券的方式。
- 系统 SHALL 在操作界面（如主按钮或后续菜单）增加一个 `undo_checkin` 功能。

#### Scenario: 成功撤销进站
- **WHEN** 用户点击进站中卡片的“刚才点错了/撤销进站”按钮
- **THEN** 系统 SHALL 将该卡片的状态重置为 `idle` 且不改变优惠券剩余数量

#### Scenario: 自动跳转主界面
- **WHEN** 用户撤销进站后
- **THEN** 系统 SHALL 自动刷新主菜单并显示该卡片已恢复空闲
