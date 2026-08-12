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

当前第一阶段部署地址：`https://lydia20031020-prog.github.io/taluo/`。后续可将 `www.taluo.lydiaowo.com` 绑定到 GitHub Pages。H5 是静态文件，Supabase 负责牌库、占卜记录和 Edge Function AI 解读。

### GitHub Pages 自动部署

仓库已经包含 `.github/workflows/deploy-pages.yml`。将代码推送到 `main` 分支后，GitHub Actions 会自动构建并发布 H5。

1. 在仓库 `Settings > Pages > Build and deployment` 中将 `Source` 设为 `GitHub Actions`。
2. 在 `Settings > Secrets and variables > Actions > Variables` 添加 `TARO_APP_SUPABASE_URL` 和 `TARO_APP_SUPABASE_ANON_KEY`。当前没有 Supabase 时可以暂时不添加，页面仍可打开，但牌阵和牌库为空。
3. 推送到 `main` 后，在 `Actions` 页面等待 `Build and deploy H5 to GitHub Pages` 完成。

### 1. 配置 Supabase

1. 在 Supabase 创建或选择一个项目。
2. 在 SQL Editor 按顺序执行 `supabase/migrations/00001_create_tarot_tables.sql` 到 `00004_insert_minor_arcana_remaining.sql`。
3. 在 Supabase 部署两个 Edge Functions：`tarot-interpretation` 和 `tarot-summary`。
4. 在项目 Secrets 中设置 `DASHSCOPE_API_KEY`。该密钥只放在 Edge Function，不能写进 H5 环境变量或提交到 Git。
5. 在 Project Settings > API 复制 Project URL 和 anon public key，填入本地 `.env.production`（可从 `.env.example` 复制）。anon key 可以用于浏览器，`service_role` key 不可以暴露。

### 2. 构建 H5

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm build:h5:production
```

构建产物位于 `dist/`。每次更换 Supabase 地址或 anon key 后都需要重新构建。

### 3. 部署到服务器

以下示例适用于后续改为自有服务器部署。请将 `dist/` 的内容上传到该目录，不要上传 `.env.production`、Supabase service role key 或任何 AI 服务 key。

```bash
sudo mkdir -p /var/www/taluo
sudo chown -R "$USER":"$USER" /var/www/taluo
rsync -avz --delete dist/ <SSH_USER>@43.143.208.73:/var/www/taluo/
```

Nginx 站点配置（`/etc/nginx/sites-available/taluo`）应包含：

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name www.taluo.lydiaowo.com;
    root /var/www/taluo;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

启用配置并检查：

```bash
sudo ln -s /etc/nginx/sites-available/taluo /etc/nginx/sites-enabled/taluo
sudo nginx -t
sudo systemctl reload nginx
```

### 4. DNS 和 HTTPS

在域名 DNS 控制台添加 `A` 记录：主机记录 `www.taluo`，记录值 `43.143.208.73`。解析生效后，在服务器执行：

```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d www.taluo.lydiaowo.com
```

Certbot 会配置 HTTPS 和自动续期。上线验收至少要测试首页、单张牌、三张牌、牌库、历史记录、AI 解读，以及直接刷新页面和手机访问。

### 5. 备案信息

首页已展示备案号：`京ICP备2026004406号-2`。备案主体、网站名称和服务器接入信息仍以工信部/云服务商备案后台登记为准。
