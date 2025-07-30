# Docker 部署快速指南

## 🚀 快速部署

### 在服务器上一键部署

```bash
# 1. 创建部署目录
mkdir metro-card-bot && cd metro-card-bot

# 2. 下载部署文件
curl -O https://raw.githubusercontent.com/Shinku1014/metro-card-bot/master/docker-compose.yml
curl -O https://raw.githubusercontent.com/Shinku1014/metro-card-bot/master/deploy.sh
chmod +x deploy.sh

# 3. 配置 Bot Token
echo "BOT_TOKEN=your_bot_token_here" > .env

# 4. 运行部署
./deploy.sh
```

## 📋 部署要求

- Docker 20.10+
- Docker Compose 2.0+
- Linux 服务器（Ubuntu/CentOS/Debian 等）
- 支持的架构：AMD64 (x86_64) 和 ARM64 (aarch64)

## 🏗️ 架构支持

项目支持多架构部署：
- **AMD64** (x86_64): 适用于大多数云服务器和传统 PC
- **ARM64** (aarch64): 适用于 Apple M1/M2、AWS Graviton、树莓派等

### 检测和配置架构

```bash
# 运行架构检测脚本
./detect-platform.sh

# 手动检测架构
uname -m
```

## 🔧 环境变量

在 `.env` 文件中配置：

```bash
# 必需：Telegram Bot Token
BOT_TOKEN=your_bot_token_here

# 可选：数据文件路径（默认 ./data/cards.json）
DATA_FILE=./data/cards.json

# 可选：运行环境（默认 production）
NODE_ENV=production
```

## 📊 监控和维护

### 查看运行状态
```bash
docker-compose ps
```

### 查看实时日志
```bash
docker-compose logs -f metro-card-bot
```

### 重启服务
```bash
docker-compose restart
```

### 更新到最新版本
```bash
# 拉取最新镜像并重启
docker-compose pull && docker-compose up -d
```

### 备份数据
```bash
# 备份用户数据
cp -r data data_backup_$(date +%Y%m%d_%H%M%S)
```

## 🐛 故障排除

### 常见问题

1. **容器无法启动**
   ```bash
   # 查看详细错误信息
   docker-compose logs metro-card-bot
   ```

2. **Bot 无响应**
   ```bash
   # 检查 Bot Token 是否正确
   cat .env
   
   # 重启容器
   docker-compose restart
   ```

3. **数据丢失**
   ```bash
   # 确保数据目录已正确挂载
   docker-compose exec metro-card-bot ls -la /app/data
   ```

### 健康检查

```bash
# 检查容器健康状态
docker-compose ps

# 进入容器调试
docker-compose exec metro-card-bot sh
```

## 📈 扩展部署

### 使用反向代理（如果需要 Web 界面）

```yaml
# docker-compose.yml 示例
version: '3.8'
services:
  metro-card-bot:
    # ... 现有配置
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - metro-card-bot
```

### 使用外部数据库

```yaml
# 如果需要使用外部数据库
services:
  metro-card-bot:
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/botdb
    depends_on:
      - db
      
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: botdb
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```
