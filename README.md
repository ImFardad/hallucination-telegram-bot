# 🤖 Hallucination Telegram AI Bot

A lightweight, serverless Telegram AI chatbot designed for zero-idle-cost deployment on **Cloudflare Workers** using native **Workers AI**.

Built with a fast, low-consumption model supporting fluent **Persian (فارسی)** and **English**, persistent conversation memory via **Cloudflare KV**, and complete conversational reset controls.

---

## ✨ Features

- **⚡ Serverless & Lightweight**: Runs entirely on Cloudflare Workers edge network with zero server maintenance and instant cold starts.
- **🧠 Cloudflare Workers AI**: Powered by `@cf/meta/llama-3.2-3b-instruct` by default — exceptionally low compute unit consumption, fast response times, and strong multilingual capabilities (Persian & English).
- **💾 Conversation Memory**: Retains multi-turn conversation context stored in Cloudflare KV with a sliding window (default: last 10 messages) and configurable TTL (auto-expires inactive sessions after 7 days).
- **🔄 Chat Reset**: Start fresh at any time using `/new`, `/clear`, or `/reset`.
- **💬 Real-time Typing Status**: Displays Telegram's "typing..." action while generating AI responses.
- **✂️ Smart Message Chunking**: Automatically splits long AI responses exceeding Telegram's 4,096-character limit into clean chunks.
- **🛡️ Secure Webhooks**: Supports Telegram `secret_token` verification to reject unauthorized webhook requests.
- **⚡ Non-blocking Execution**: Uses `ctx.waitUntil` to acknowledge Telegram webhooks with `200 OK` immediately, avoiding webhook timeouts.

---

## 📋 Bot Commands

| Command | Description |
| :--- | :--- |
| `/start` | Welcome message and instructions on how to use the bot. |
| `/new` or `/clear` | Clears conversation memory in KV and starts a new conversation. |
| `/model` | Displays current active Workers AI model and memory settings. |
| `/help` | Detailed help guide and usage instructions. |

---

## 🛠️ Prerequisites

Before deploying, ensure you have:

1. **Node.js** (version 18 or later) and **npm**.
2. A **Telegram Bot Token** from [@BotFather](https://t.me/BotFather).
3. A **Cloudflare Account** (free tier supports Workers, KV, and Workers AI).

---

## 🚀 Quickstart & Deployment Guide

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/ImFardad/hallucination-telegram-bot.git
cd hallucination-telegram-bot
npm install
```

### 2. Log in to Cloudflare

Authenticate Wrangler with your Cloudflare account:

```bash
npx wrangler login
```

### 3. Create Cloudflare KV Namespace

Create a KV namespace for storing conversation history:

```bash
npx wrangler kv namespace create CHAT_HISTORY
```

The terminal will output a snippet like this:
```jsonc
{ "binding": "CHAT_HISTORY", "id": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" }
```

Open [wrangler.jsonc](./wrangler.jsonc) and replace `YOUR_KV_NAMESPACE_ID` with your generated ID:

```jsonc
"kv_namespaces": [
  {
    "binding": "CHAT_HISTORY",
    "id": "your_kv_namespace_id_here"
  }
]
```

### 4. Configure Bot Secrets

Add your Telegram Bot token as a secure secret in Cloudflare:

```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN
```
*(When prompted, paste your Telegram Bot Token from `@BotFather`)*

*(Optional but recommended)* Add a secret token to protect your webhook endpoint:

```bash
npx wrangler secret put SECRET_TOKEN
```
*(Enter any random secure string consisting of `A-Z`, `a-z`, `0-9`, `_`, and `-`)*

### 5. Deploy to Cloudflare Workers

Deploy your worker to Cloudflare's edge:

```bash
npm run deploy
```

Once deployment finishes, Wrangler will output your live worker URL:
```text
https://hallucination-telegram-bot.<your-subdomain>.workers.dev
```

### 6. Register Telegram Webhook

Register your Cloudflare Worker URL with Telegram's Webhook API.

Run the following command in your terminal (replace `<BOT_TOKEN>` and `<WORKER_URL>`):

```bash
# If you set a SECRET_TOKEN:
curl -F "url=https://<WORKER_URL>/webhook" \
     -F "secret_token=<YOUR_SECRET_TOKEN>" \
     https://api.telegram.org/bot<BOT_TOKEN>/setWebhook

# Or if you did not configure SECRET_TOKEN:
curl -F "url=https://<WORKER_URL>/webhook" \
     https://api.telegram.org/bot<BOT_TOKEN>/setWebhook
```

You should receive a JSON response with `"ok": true`:
```json
{"ok": true, "result": true, "description": "Webhook was set"}
```

🎉 **Your bot is now live!** Open your bot on Telegram and send `/start`.

---

## ⚙️ Configuration & Environment Variables

You can customize variables directly in [wrangler.jsonc](./wrangler.jsonc):

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `AI_MODEL` | `@cf/meta/llama-3.2-3b-instruct` | Cloudflare Workers AI model name. |
| `MAX_HISTORY_MESSAGES` | `10` | Maximum number of recent messages kept in context window. |
| `HISTORY_TTL_SECONDS` | `604800` | KV conversation expiration time in seconds (604800 = 7 days). |
| `SYSTEM_PROMPT` | *(Concise bilingual prompt)* | Base system instructions guiding tone, brevity, and language. |

### 💡 Alternative Models

If you wish to test other lightweight models that support Persian, simply update `AI_MODEL` in [wrangler.jsonc](./wrangler.jsonc):

- `@cf/meta/llama-3.2-3b-instruct` *(Default, fast, low resource consumption, great Persian)*
- `@cf/meta/llama-3.1-8b-instruct` *(Higher parameter count, strong reasoning)*
- `@cf/qwen/qwen1.5-7b-chat-awq` *(Strong multilingual performance)*

---

## 💻 Local Development

1. Create a `.dev.vars` file based on `.dev.vars.example`:
   ```bash
   cp .dev.vars.example .dev.vars
   ```
2. Fill in your `TELEGRAM_BOT_TOKEN` inside `.dev.vars`.
3. Start the local development server:
   ```bash
   npm run dev
   ```
4. Expose your local port (e.g. using `cloudflared tunnel` or `ngrok`) to test webhooks locally.

---

## 📁 Project Structure

```text
hallucination-telegram-bot/
├── src/
│   ├── ai.ts            # Workers AI interaction & system prompt
│   ├── bot.ts           # Telegram update routing & command handlers
│   ├── index.ts         # Worker entrypoint, health check & webhook handler
│   ├── storage.ts       # Cloudflare KV memory & sliding window logic
│   ├── telegram.ts      # Telegram Bot API client (send messages, typing action)
│   └── types.ts         # TypeScript definitions for Telegram & Worker Env
├── .dev.vars.example    # Environment variable template for local dev
├── .gitignore           # Git ignore rules
├── LICENSE              # MIT License
├── package.json         # Node.js dependencies and scripts
├── README.md            # Project documentation
├── tsconfig.json        # TypeScript configuration
└── wrangler.jsonc       # Cloudflare Workers configuration & bindings
```

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).
