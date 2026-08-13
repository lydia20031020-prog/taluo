# 欢迎使用你的秒哒应用代码包
秒哒应用链接
    URL:https://www.miaoda.cn/projects/app-8z0if5bs311d

# Project Overview

This repository is a Taro + React + TypeScript starter project for WeChat Mini-Programs and mobile H5, styled with Tailwind CSS and managed via pnpm.
This document explains how to set up your local environment, develop, test, lint, and build the project.
---

## Repository Structure

The project structure is as follows:

```

├── babel.config.js
├── package.json
├── pnpm-lock.yaml
├── postcss.config.js
├── project.config.json
├── README.md
├── tailwind.config.js
├── tsconfig.check.json
├── tsconfig.json
├── config/
│   ├── dev.ts
│   ├── index.ts
│   └── prod.ts
├── scripts/
├── src/
│   ├── app.config.ts               # Taro app configuration, defining routes and tabBar, Please note that the "pages" must correctly correspond to the routes defined in src/pages.
│   ├── app.scss
│   ├── app.ts
│   ├── index.html
│   ├── client/
│   │   └── supabase.ts             # Supabase client configuration, When you need to use Supabase, import and use it from this file.
│   ├── db/                         # Database operations and Supabase integration, all database calls should be implemented here
│   │   └── README.md
│   ├── pages/                      # each folder corresponds to a route defined in app.config.ts
│   ├── store/                      # Global state management using Zustand for cross-page state sharing
│   │   └── README.md
│   └── types/                      # TypeScript type definitions
│       └── global.d.ts
└── supabase/
```

After you generate any files or update the structure of this project, please update the README.md file to reflect the changes.

## Installation and Setup

```bash
pnpm install # Install dependencies
```

```bash
pnpm run lint  # Lint source (Important: After modifying the code, please execute this command to perform necessary checks.)
```

## H5 网站发布

当前前端地址：`https://lydia20031020-prog.github.io/taluo/`。H5 由 GitHub Pages 托管，AI 请求经
`https://api.taluo.lydiaowo.com` 转发到 DeepSeek，API 密钥只保存在腾讯云服务器中。Supabase 尚未配置，
当前牌库和牌阵使用本地离线数据。

### GitHub Pages 自动部署

仓库已经包含 `.github/workflows/deploy-pages.yml`。将代码推送到 `main` 分支后，GitHub Actions 会自动构建并发布 H5。

1. 在仓库 `Settings > Pages > Build and deployment` 中将 `Source` 设为 `GitHub Actions`。
2. AI API 地址已经在工作流中配置为 `https://api.taluo.lydiaowo.com`。不要在 GitHub Secrets、Variables 或前端环境变量中添加 DeepSeek API Key。
3. Supabase 尚未创建时无需添加相关变量，页面会使用本地塔罗数据。
4. 推送到 `main` 后，在 `Actions` 页面等待 `Build and deploy H5 to GitHub Pages` 完成。

### 1. DeepSeek AI 架构

```text
GitHub Pages H5
    -> https://api.taluo.lydiaowo.com
    -> Tencent Cloud 43.143.208.73 (Nginx + Node.js)
    -> https://api.deepseek.com/chat/completions
```

服务器程序位于 `server/`，默认模型为 `deepseek-v4-flash`。浏览器不会收到 DeepSeek API Key。

### 2. 构建 H5

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm build:h5:production
```

构建产物位于 `dist/`。每次更换公开的 AI API 地址、Supabase 地址或 anon key 后都需要重新构建。

### 3. 配置 DNS

域名当前使用 DNSPod。添加一条记录：

| 配置项 | 值 |
| --- | --- |
| 记录类型 | `A` |
| 主机记录 | `api.taluo` |
| 记录值 | `43.143.208.73` |
| TTL | 默认 |

### 4. 部署 AI 服务

服务器要求 Ubuntu/Debian、Node.js 20 或更高版本、Nginx。不要把 API Key 写入仓库或命令历史。

```bash
sudo useradd --system --home /opt/taluo-ai --shell /usr/sbin/nologin taluo
sudo mkdir -p /opt/taluo-ai
sudo cp server/index.mjs server/package.json /opt/taluo-ai/
sudo chown -R taluo:taluo /opt/taluo-ai
sudo cp server/taluo-ai.service /etc/systemd/system/
sudo cp server/nginx-api.conf /etc/nginx/sites-available/taluo-api
sudo ln -s /etc/nginx/sites-available/taluo-api /etc/nginx/sites-enabled/taluo-api
```

在服务器交互式创建密钥文件，避免密钥进入 shell 历史：

```bash
sudo install -m 600 -o root -g root /dev/null /etc/taluo-ai.env
sudo nano /etc/taluo-ai.env
```

文件内容：

```ini
PORT=8787
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_API_KEY=在这里填写新密钥
FRONTEND_ORIGINS=https://lydia20031020-prog.github.io,https://www.taluo.lydiaowo.com
DAILY_REQUEST_LIMIT=200
DAILY_IP_LIMIT=20
```

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now taluo-ai
sudo systemctl status taluo-ai --no-pager
sudo nginx -t
sudo systemctl reload nginx
```

### 5. 配置 HTTPS

确认 `api.taluo.lydiaowo.com` 已解析到服务器后执行：

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.taluo.lydiaowo.com
```

验收：

```bash
curl -i https://api.taluo.lydiaowo.com/api/tarot/summary
journalctl -u taluo-ai -n 50 --no-pager
```

第一个命令用 GET 请求会返回 `404`，这表示 HTTPS 和反向代理已连通。之后在 H5 中进行一次单张牌占卜，分别测试 AI 深度解读和 AI 总结。

### 6. 后续配置 Supabase

需要云端保存历史记录时，再创建 Supabase 项目并执行 `supabase/migrations/` 下的迁移。Supabase anon key 可以用于浏览器，`service_role` key 不能暴露。

### 7. 备案信息

首页已展示备案号：`京ICP备2026004406号-2`。备案主体、网站名称和服务器接入信息仍以工信部/云服务商备案后台登记为准。
