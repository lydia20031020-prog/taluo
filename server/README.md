# Tarot AI API

This service keeps the DeepSeek API key on the server. Do not put the key in the H5 build, GitHub Actions variables, browser code, or this repository.

## Local run

```bash
DEEPSEEK_API_KEY='replace-with-a-new-key' node index.mjs
```

The API listens on `127.0.0.1:8790` and exposes:

- `POST /api/tarot/interpretation`
- `POST /api/tarot/summary`

## Tencent Cloud deployment (Windows Server 2022 + Caddy)

The existing server already uses Caddy and port `8787` for `wbti.lydiaowo.com`. Tarot AI therefore uses port `8790` and an isolated directory `C:\taluo-ai`. Do not replace the existing Caddyfile; append `windows-caddy-block.txt` to `C:\caddy\Caddyfile`.

Create `C:\taluo-ai\.env` with server-only values:

```ini
PORT=8790
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_API_KEY=replace-with-a-new-key
FRONTEND_ORIGINS=https://lydia20031020-prog.github.io,https://www.taluo.lydiaowo.com
DAILY_REQUEST_LIMIT=200
DAILY_IP_LIMIT=20
```

Run `windows-deploy.ps1` in an elevated PowerShell. It installs Node.js 24, downloads the server files, creates an isolated `TaluoAI` scheduled task on `127.0.0.1:8790`, backs up and appends the API-only Caddy block, validates it, and reloads Caddy. It never replaces the existing `wbti` blocks.
