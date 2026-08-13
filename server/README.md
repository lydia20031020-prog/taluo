# Tarot AI API

This service keeps the DeepSeek API key on the server. Do not put the key in the H5 build, GitHub Actions variables, browser code, or this repository.

## Local run

```bash
DEEPSEEK_API_KEY='replace-with-a-new-key' node index.mjs
```

The API listens on `127.0.0.1:8787` and exposes:

- `POST /api/tarot/interpretation`
- `POST /api/tarot/summary`

## Tencent Cloud deployment

The project root is `/opt/taluo-ai`, owned by the `taluo` user. Put the server-only environment file at `/etc/taluo-ai.env` with mode `600`:

```ini
PORT=8787
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_API_KEY=replace-with-a-new-key
FRONTEND_ORIGINS=https://lydia20031020-prog.github.io,https://www.taluo.lydiaowo.com
DAILY_REQUEST_LIMIT=200
DAILY_IP_LIMIT=20
```

Install `server/taluo-ai.service` to `/etc/systemd/system/`, install `server/nginx-api.conf` to `/etc/nginx/sites-available/taluo-api`, then enable both services. Use Certbot for `api.taluo.lydiaowo.com` after DNS has resolved.
