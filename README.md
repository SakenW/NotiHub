# NotiHub

> Universal notification hub - Send structured events to multiple channels (Feishu, Slack, Telegram, etc.)

[![npm version](https://img.shields.io/npm/v/@notihub/cli.svg)](https://www.npmjs.com/package/@notihub/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📖 Overview

**NotiHub** is a unified notification system that:

- ✅ **Unifies event sources** - Claude Code, GitHub, n8n, CI/CD, custom services
- ✅ **Supports multiple channels** - Feishu (飞书), Slack, DingTalk (钉钉), Telegram, Email
- ✅ **Provides smart features** - Deduplication, rate limiting, retry logic, fallback
- ✅ **Offers flexible deployment** - Local CLI, Web Dashboard, Cloud deployment
- ✅ **Ensures reliability** - Persistent storage, event history, health monitoring

## 🚀 Quick Start

### Installation

```bash
# Global installation
npm install -g @notihub/cli

# Or use npx (no installation)
npx @notihub/cli init
```

### Initial Setup

```bash
# Interactive configuration wizard
notihub init

# Start sending notifications
echo '{"source":"test","event_type":"success","title":"Hello","summary":"World"}' | notihub send
```

### Start Web Dashboard

```bash
# Start local dashboard
notihub serve

# Open in browser
notihub dashboard
```

## 📋 Features

### 🔌 Input Adapters

- **CLI** - Standard input / file
- **HTTP API** - REST endpoint
- **Claude Code** - Hook integration
- **GitHub** - Webhook support
- **n8n** - Workflow integration
- **Custom** - Extensible adapter system

### 📤 Output Channels

- **Feishu (飞书)** - Interactive cards, MCP support
- **DingTalk (钉钉)** - Rich messages
- **Slack** - Block Kit messages
- **Telegram** - HTML formatting
- **WeCom (企业微信)** - Enterprise integration
- **Email** - SMTP support
- **Webhook** - Generic HTTP POST

### 🛡️ Smart Features

- **Deduplication** - Prevent duplicate notifications (configurable TTL)
- **Rate Limiting** - Avoid notification storms
- **Retry Logic** - Exponential backoff (1s, 4s, 10s)
- **Fallback** - Card → Plain text degradation
- **Health Checks** - Monitor channel status

### 📊 Web Dashboard

- **Overview** - Real-time statistics and trends
- **Event History** - Search, filter, replay
- **Channel Management** - Configure, test, monitor
- **Input Sources** - Enable/disable sources
- **Settings** - Policy configuration
- **Real-time Logs** - SSE-powered live updates

## 📚 Documentation

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Input Adapters                      │
│  CLI | HTTP | Claude Code | GitHub | n8n | Custom   │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
         ┌────────────────┐
         │ Core Services  │
         │ - Dedup        │
         │ - Retry        │
         │ - Storage      │
         └────────┬───────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│                 Output Channels                      │
│  Feishu | Slack | DingTalk | Telegram | Email       │
└─────────────────────────────────────────────────────┘
```

### Directory Structure

```
notihub/
├── src/
│   ├── cli/                  # CLI commands
│   ├── web/                  # Web server & API
│   ├── dashboard/            # Frontend (Vue 3)
│   ├── adapters/
│   │   ├── input/            # Input adapters
│   │   └── output/           # Output channels
│   ├── application/          # Business logic
│   ├── domain/               # Domain models
│   └── infrastructure/       # Storage, cache, etc.
├── templates/                # Card templates
└── docs/                     # Documentation
```

### Standard Event Model

```typescript
interface Event {
  source: string;              // 'claude-code' | 'github' | 'custom'
  event_type: EventType;       // 'success' | 'error' | 'warning' | 'info'
  severity: Severity;          // 'low' | 'medium' | 'high' | 'critical'
  title: string;               // Event title
  summary: string;             // Event summary
  context?: Record<string, any>; // Additional context
  actions?: Action[];          // Interactive actions
  trace_id: string;            // Unique identifier
  timestamp: Date;             // Event time
}
```

## 🔧 Usage

### CLI Commands

```bash
# Initialize configuration
notihub init
notihub init --force  # Overwrite existing config

# Send notification
notihub send -f event.json
echo '...' | notihub send
notihub send --source=ci --type=error --title="Build Failed"

# Manage configuration
notihub config list
notihub config set feishu.webhook "https://..."
notihub config test feishu

# Start web server
notihub serve --port 3000
notihub serve --cloud --db postgres://...
notihub serve --daemon

# Open dashboard
notihub dashboard

# Check status
notihub status
```

### Configuration File

Located at `~/.notihub/config.yaml`:

```yaml
version: "1"

server:
  enabled: true
  port: 3000
  mode: local  # 'local' | 'cloud'
  auth:
    token: "auto-generated-token"

inputs:
  claude-code:
    enabled: true
    webhook_path: /webhooks/claude-code

  github:
    enabled: true
    webhook_secret: "xxx"

channels:
  feishu:
    enabled: true
    type: webhook
    webhook: "https://open.feishu.cn/..."
    secret: "xxx"
    sign: true

  slack:
    enabled: false
    webhook: "https://hooks.slack.com/..."

policies:
  deduplication:
    enabled: true
    ttl: 60

  rate_limit:
    enabled: true
    max_per_minute: 10

  retry:
    enabled: true
    max_attempts: 3
    backoff: [1, 4, 10]
```

### HTTP API

```bash
# Send notification
curl -X POST http://localhost:3000/webhooks/notify \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "custom",
    "event_type": "success",
    "title": "Deployment Successful",
    "summary": "v1.2.3 deployed to production"
  }'

# Get statistics
curl http://localhost:3000/api/stats \
  -H "Authorization: Bearer YOUR_TOKEN"

# List events
curl http://localhost:3000/api/events?limit=20 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Integration Examples

#### Claude Code Hook

```bash
# .claude-code/hooks/on-task-complete.sh
#!/bin/bash
notihub send --source=claude-code \
  --type=success \
  --title="Task: $TASK_NAME" \
  --summary="Completed in ${DURATION}s"
```

#### GitHub Actions

```yaml
- name: Notify on failure
  if: failure()
  run: |
    notihub send -f - <<EOF
    {
      "source": "github-actions",
      "event_type": "error",
      "severity": "high",
      "title": "Build Failed",
      "summary": "Workflow ${{ github.workflow }} failed",
      "context": {
        "repo": "${{ github.repository }}",
        "commit": "${{ github.sha }}"
      }
    }
    EOF
```

#### n8n Workflow

```javascript
// Execute Command Node
const payload = {
  source: "n8n",
  event_type: "info",
  title: $json.title,
  summary: $json.summary
};

$(`notihub send -f - <<'EOF'\n${JSON.stringify(payload)}\nEOF`);
```

## 🔌 Extending NotiHub

### Create Custom Input Adapter

```typescript
// src/adapters/input/custom/my-adapter.ts
import { BaseInputAdapter } from '../base/input-adapter.interface';

export class MyAdapter extends BaseInputAdapter {
  readonly name = 'my-source';
  readonly version = '1.0.0';

  async parse(rawInput: unknown): Promise<Event> {
    // Transform your input format to standard Event
    return this.createEvent({
      source: this.name,
      event_type: 'info',
      title: 'Custom Event',
      summary: 'From my adapter',
    });
  }

  validate(rawInput: unknown): boolean {
    // Validate input format
    return true;
  }

  getConfigSchema(): object {
    return {
      type: 'object',
      properties: {
        apiKey: { type: 'string' }
      }
    };
  }
}

// Register
InputRegistry.register(new MyAdapter());
```

### Create Custom Channel

```typescript
// src/adapters/output/custom/my-channel.ts
import { BaseChannel } from '../base/channel.interface';

export class MyChannel extends BaseChannel {
  readonly name = 'my-channel';
  readonly type = 'webhook';

  async send(event: Event): Promise<SendResult> {
    // Send to your platform
    const response = await axios.post(this.config.webhook, {
      title: event.title,
      body: event.summary,
    });

    return {
      success: true,
      channel: this.name,
      timestamp: new Date(),
    };
  }

  getConfigSchema(): object {
    return {
      type: 'object',
      required: ['webhook'],
      properties: {
        webhook: { type: 'string', format: 'uri' }
      }
    };
  }
}

// Register
ChannelRegistry.register(new MyChannel(config.channels.mychannel));
```

## 🚢 Deployment

### Local Mode (Default)

```bash
notihub serve
```

Data stored in `~/.notihub/data.db` (SQLite)

### Cloud Mode

```bash
# Using environment variables
export NOTIHUB_MODE=cloud
export DATABASE_URL=postgresql://user:pass@host/db
export NOTIHUB_AUTH_TOKEN=your-secure-token

notihub serve --cloud --host 0.0.0.0
```

### Docker

```bash
docker build -t notihub .
docker run -p 3000:3000 \
  -e NOTIHUB_AUTH_TOKEN=xxx \
  -v ~/.notihub:/root/.notihub \
  notihub
```

### Docker Compose

```yaml
version: '3.8'
services:
  notihub:
    image: notihub:latest
    ports:
      - "3000:3000"
    environment:
      - NOTIHUB_MODE=cloud
      - DATABASE_URL=postgresql://postgres:password@db/notihub
    depends_on:
      - db

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=notihub
      - POSTGRES_PASSWORD=password
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

## 📄 License

MIT © [Your Name]

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) first.

## 📮 Support

- 📚 [Documentation](./docs/)
- 🐛 [Issues](https://github.com/yourusername/notihub/issues)
- 💬 [Discussions](https://github.com/yourusername/notihub/discussions)
