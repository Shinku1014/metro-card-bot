# Metro Card Bot

一个用于管理信用卡地铁使用次数的 Telegram Bot，使用 TypeScript + ts-node 开发。帮助您追踪每张卡每月的地铁乘坐次数（最多10次）。

## 功能特性

- ✅ 添加多张信用卡
- ✅ 显示卡片列表为按钮形式
- ✅ 点击按钮进行进站/出站操作
- ✅ 实时显示每张卡的月度使用次数和当前状态
- ✅ 每月自动重置使用次数
- ✅ 删除不需要的卡片
- ✅ 防止超出月度使用限制
- ✅ TypeScript 类型安全
- ✅ 开发时热重载

## 技术栈

- **TypeScript** - 类型安全的 JavaScript
- **ts-node** - 直接运行 TypeScript
- **Telegraf** - Telegram Bot 框架
- **dotenv** - 环境变量管理

## 安装和设置

### 1. 创建 Telegram Bot

1. 在 Telegram 中找到 [@BotFather](https://t.me/botfather)
2. 发送 `/newbot` 命令
3. 按照提示设置 bot 名称和用户名
4. 获取 Bot Token

### 2. 安装依赖

```bash
npm install
```

### 3. 配置环境变量

复制示例配置文件并编辑：

```bash
cp .env.example .env
```

编辑 `.env` 文件，添加您的 Bot Token：

```
BOT_TOKEN=your_bot_token_here
DATA_FILE=./data/cards.json
```

### 4. 运行 Bot

```bash
# 使用 ts-node 直接运行 TypeScript（推荐）
npm start

# 开发环境（自动重启）
npm run dev

# 编译为 JavaScript
npm run build

# 运行编译后的 JavaScript 版本
npm run prod

# 后台运行（使用 nohup）
nohup npm start > nohup.out 2>&1 &
```

### 5. 验证配置

```bash
# 运行配置检查脚本
npx ts-node src/test-config.ts
```

## Docker 部署

### 使用 GitHub Actions 自动构建

项目已配置 GitHub Actions 自动构建流水线，每次推送代码到 `master` 分支时会自动：

1. 编译 TypeScript 代码
2. 构建 Docker 镜像
3. 推送到 GitHub Container Registry

### 在服务器上部署

> **💡 架构说明**: 项目支持 AMD64 (x86_64) 和 ARM64 (aarch64) 架构。部署前可运行 `./detect-platform.sh` 检测并自动配置合适的架构。

#### 方法一：使用 Docker Compose（推荐）

1. **在服务器上创建部署目录**：
```bash
mkdir metro-card-bot && cd metro-card-bot
```

2. **下载部署文件**：
```bash
# 下载 docker-compose.yml
wget https://raw.githubusercontent.com/Shinku1014/metro-card-bot/master/docker-compose.yml

# 下载部署脚本
wget https://raw.githubusercontent.com/Shinku1014/metro-card-bot/master/deploy.sh
chmod +x deploy.sh
```

3. **配置环境变量**：
```bash
# 创建 .env 文件
echo "BOT_TOKEN=your_bot_token_here" > .env
```

4. **运行部署脚本**：
```bash
# 部署最新版本
./deploy.sh

# 部署指定版本
./deploy.sh v1.0.0
```

#### 方法二：直接使用 Docker

```bash
# 拉取镜像（指定平台架构）
docker pull --platform linux/arm64 ghcr.io/shinku1014/metro-card-bot:latest

# 创建数据目录
mkdir -p ./data

# 运行容器
docker run -d \
  --name metro-card-bot \
  --restart unless-stopped \
  --platform linux/arm64 \
  -e BOT_TOKEN=your_bot_token_here \
  -v $(pwd)/data:/app/data \
  ghcr.io/shinku1014/metro-card-bot:latest
```

> **注意**: 如果您的服务器是 ARM64 架构（如 Apple M1/M2、AWS Graviton），请使用 `--platform linux/arm64`。如果是 AMD64 架构，请使用 `--platform linux/amd64`。

### Docker 管理命令

```bash
# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 更新到最新版本
docker-compose pull && docker-compose up -d
```

## 使用方法

### 基本操作

1. **启动 Bot**：发送 `/start` 命令
2. **添加卡片**：点击"➕ 添加卡片"按钮，然后输入卡片名称
3. **进站**：点击卡片按钮，状态变为"进站中"
4. **出站**：再次点击同一卡片按钮，完成一次乘坐，使用次数+1
5. **删除卡片**：点击"🗑️ 删除卡片"按钮选择要删除的卡片

### 按钮说明

- **😴 卡片名称 (次数/10) 空闲**：卡片处于空闲状态，可以进站
- **🚇 卡片名称 (次数/10) 进站中**：卡片处于进站状态，下次点击将出站


- **🟢 次数 0-4**：使用次数较少（绿色）
- **🟡 次数 5-7**：使用次数中等（橙色）
- **🟠 次数 8-9**：使用次数较多（黄色）
- **🔴 次数 10**：已达月度上限（红色）

### 命令列表

- `/start` - 显示主菜单
- `/cards` - 查看所有卡片
- `/help` - 显示帮助信息

## 项目结构

```
metro-card-bot/
├── src/                    # TypeScript 源代码
│   ├── index.ts           # 主程序文件
│   ├── dataManager.ts     # 数据管理模块
│   ├── types.ts           # 类型定义
│   └── test-config.ts     # 配置测试
├── dist/                  # 编译后的 JavaScript 文件
├── data/                  # 数据存储目录
│   └── cards.json        # 用户数据文件
├── .github/               # GitHub Actions 配置
│   └── workflows/
│       └── docker-build.yml  # Docker 构建流水线
├── Dockerfile             # Docker 镜像构建文件
├── docker-compose.yml     # Docker Compose 配置
├── deploy.sh              # 部署脚本
├── .dockerignore          # Docker 忽略文件
├── package.json           # 项目配置
├── tsconfig.json          # TypeScript 配置
├── .env.example           # 环境变量示例
└── README.md              # 项目文档
```

## 数据结构

每个用户的数据包含：

```json
{
  "userId": {
    "cards": [
      {
        "id": "唯一标识符",
        "name": "卡片名称",
        "monthlyUsage": 0,
        "status": "idle|in_station",
        "lastUsed": "最后使用时间",
        "createdAt": "创建时间"
      }
    ],
    "currentMonth": 0,
    "currentYear": 2025
  }
}
```

## 特性说明

- **自动月度重置**：每月1号自动重置所有卡片的使用次数
- **状态管理**：记录每张卡的进站/出站状态
- **使用限制**：防止单张卡月度使用次数超过10次
- **数据持久化**：所有数据保存在本地 JSON 文件中
- **多用户支持**：支持多个用户同时使用

## 技术栈

- **Node.js** - 运行环境
- **Telegraf** - Telegram Bot 框架
- **dotenv** - 环境变量管理
- **JSON** - 数据存储

## 许可证

MIT License
