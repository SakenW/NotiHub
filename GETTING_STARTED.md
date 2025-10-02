# Getting Started with NotiHub

## 🚀 Quick Start (5 Minutes)

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/notihub.git
cd notihub

# Install dependencies
npm install

# Build the project
npm run build

# Link globally (for development)
npm link
```

### 2. Initialize Configuration

```bash
notihub init
```

This will start an interactive wizard:
- Select channels to enable (Feishu, Slack, DingTalk)
- Enter webhook URLs and secrets
- Configure policies (deduplication, rate limiting, retry)

### 3. Send Your First Notification

```bash
# Quick test
notihub send \
  --source="test" \
  --type="success" \
  --title="Hello NotiHub!" \
  --summary="This is my first notification"
```

### 4. Start Web Server

```bash
notihub serve
```

Server will start at `http://localhost:3000`

## 📖 Detailed Usage

### CLI Commands

#### `notihub init`

Initialize configuration interactively.

```bash
# Standard init
notihub init

# Force overwrite existing config
notihub init --force
```

Configuration will be saved to `~/.notihub/config.yaml`

#### `notihub send`

Send notifications in multiple ways:

**Option 1: From command line arguments**
```bash
notihub send \
  --source="my-app" \
  --type="error" \
  --severity="high" \
  --title="Database Connection Failed" \
  --summary="Could not connect to PostgreSQL at db.example.com"
```

**Option 2: From JSON file**
```bash
# Create event.json
cat > event.json <<EOF
{
  "source": "ci-cd",
  "event_type": "success",
  "severity": "low",
  "title": "Deployment Successful",
  "summary": "v1.2.3 deployed to production",
  "context": {
    "version": "1.2.3",
    "environment": "production",
    "duration": "45s"
  },
  "actions": [
    {
      "type": "link",
      "text": "View Deployment",
      "url": "https://example.com/deployments/123"
    }
  ]
}
EOF

# Send it
notihub send -f event.json
```

**Option 3: From stdin (pipe)**
```bash
echo '{
  "source": "monitoring",
  "event_type": "warning",
  "title": "High CPU Usage",
  "summary": "Server CPU at 85%"
}' | notihub send
```

#### `notihub config`

Manage configuration:

```bash
# List all configuration
notihub config list

# Get specific value
notihub config get server.port

# Set value
notihub config set server.port 8080

# Show config file path
notihub config path
```

#### `notihub serve`

Start HTTP server:

```bash
# Start with default settings
notihub serve

# Custom port
notihub serve --port 8080

# Custom host
notihub serve --host 127.0.0.1

# Cloud mode (with database)
notihub serve --cloud
```

Server endpoints:
- Health check: `GET /health`
- API docs: `GET /api/docs`
- Send notification: `POST /webhooks/notify`
- List events: `GET /api/events`
- Get stats: `GET /api/stats`

## 🔗 Integration Examples

### GitHub Actions

Add to `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy
        run: ./deploy.sh

      - name: Notify Success
        if: success()
        run: |
          notihub send -f - <<EOF
          {
            "source": "github-actions",
            "event_type": "success",
            "severity": "low",
            "title": "Deployment Successful",
            "summary": "Branch: ${{ github.ref_name }}, Commit: ${{ github.sha }}",
            "context": {
              "repo": "${{ github.repository }}",
              "actor": "${{ github.actor }}",
              "workflow": "${{ github.workflow }}"
            },
            "actions": [
              {
                "type": "link",
                "text": "View Run",
                "url": "${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
              }
            ]
          }
          EOF

      - name: Notify Failure
        if: failure()
        run: |
          notihub send \
            --source="github-actions" \
            --type="error" \
            --severity="high" \
            --title="Deployment Failed" \
            --summary="Check logs for details"
```

### n8n Workflow

In n8n, add an "Execute Command" node:

```javascript
const event = {
  source: "n8n",
  event_type: "info",
  title: $json.title || "Workflow Completed",
  summary: $json.summary || "N8N workflow executed",
  context: {
    workflow_id: $workflow.id,
    execution_id: $execution.id
  }
};

return $(`notihub send -f - <<'EOF'\n${JSON.stringify(event)}\nEOF`);
```

### HTTP API

Send notifications via HTTP:

```bash
curl -X POST http://localhost:3000/webhooks/notify \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "api-test",
    "event_type": "info",
    "severity": "low",
    "title": "API Test",
    "summary": "Testing HTTP API"
  }'
```

```python
# Python example
import requests

response = requests.post(
    'http://localhost:3000/webhooks/notify',
    headers={'Authorization': 'Bearer YOUR_TOKEN'},
    json={
        'source': 'python-script',
        'event_type': 'success',
        'title': 'Data Processing Complete',
        'summary': 'Processed 1,000 records'
    }
)

print(response.json())
```

```javascript
// Node.js example
const axios = require('axios');

await axios.post('http://localhost:3000/webhooks/notify', {
  source: 'nodejs-app',
  event_type: 'warning',
  title: 'High Memory Usage',
  summary: 'Memory at 85%'
}, {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
});
```

## 📊 Event Model

Standard event structure:

```typescript
{
  source: string;              // Event source (e.g., 'github', 'ci-cd', 'monitoring')
  event_type: EventType;       // 'success' | 'error' | 'warning' | 'info'
  severity: Severity;          // 'low' | 'medium' | 'high' | 'critical'
  title: string;               // Event title (required)
  summary: string;             // Event summary/description
  context?: object;            // Additional context data
  actions?: Action[];          // Interactive actions (buttons/links)
  trace_id?: string;           // Unique identifier (auto-generated if not provided)
  timestamp?: Date;            // Event timestamp (auto-generated if not provided)
}
```

### Action Types

```typescript
{
  type: 'link',                // Link button
  text: 'View Details',
  url: 'https://example.com'
}

{
  type: 'postback',            // Callback button (future)
  text: 'Approve',
  callback: 'approve_action_123'
}
```

## 🔧 Configuration

Config file location: `~/.notihub/config.yaml`

### Example Configuration

```yaml
version: "1"

server:
  enabled: true
  port: 3000
  host: 0.0.0.0
  mode: local  # 'local' | 'cloud'
  auth:
    token: "your-auth-token"

database:
  type: sqlite
  path: ~/.notihub/data.db

inputs:
  cli:
    enabled: true

  http:
    enabled: true
    webhook_path: /webhooks/notify

channels:
  feishu:
    enabled: true
    type: webhook
    webhook: "https://open.feishu.cn/open-apis/bot/v2/hook/xxx"
    secret: "xxx"
    sign: true

  slack:
    enabled: false
    webhook: "https://hooks.slack.com/services/xxx"

policies:
  deduplication:
    enabled: true
    ttl: 60  # seconds

  rate_limit:
    enabled: true
    max_per_minute: 10

  retry:
    enabled: true
    max_attempts: 3
    backoff: [1, 4, 10]
```

## 🔍 API Reference

### Authentication

All API requests require Bearer token:

```bash
Authorization: Bearer YOUR_TOKEN
```

Get your token from config:

```bash
notihub config get server.auth.token
```

### Endpoints

#### POST /webhooks/notify

Send a notification.

**Request:**
```json
{
  "source": "string",
  "event_type": "success|error|warning|info",
  "severity": "low|medium|high|critical",
  "title": "string",
  "summary": "string",
  "context": {},
  "actions": []
}
```

**Response:**
```json
{
  "success": true,
  "trace_id": "abc-123",
  "results": [
    {
      "success": true,
      "channel": "feishu",
      "message_id": "msg_xxx"
    }
  ]
}
```

#### GET /api/events

List events with pagination.

**Query Parameters:**
- `source` - Filter by source
- `type` - Filter by event type
- `severity` - Filter by severity
- `limit` - Results per page (default: 50)
- `offset` - Pagination offset

**Response:**
```json
{
  "total": 100,
  "items": [...],
  "limit": 50,
  "offset": 0
}
```

#### GET /api/stats

Get statistics.

**Response:**
```json
{
  "today": {
    "total": 123,
    "success": 120,
    "failed": 2,
    "partial": 1,
    "success_rate": "97.56"
  },
  "channels": {
    "feishu": {
      "healthy": true
    }
  }
}
```

## 🐛 Troubleshooting

### Notification not sent

1. Check channel configuration:
   ```bash
   notihub config get channels.feishu
   ```

2. Test channel connectivity:
   ```bash
   curl -X POST http://localhost:3000/api/channels/feishu/test \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. Check logs (if server running):
   ```bash
   tail -f ~/.notihub/logs/app.log
   ```

### Server won't start

1. Check if port is in use:
   ```bash
   lsof -i :3000
   ```

2. Try different port:
   ```bash
   notihub serve --port 8080
   ```

### Configuration issues

1. Verify config file exists:
   ```bash
   notihub config path
   cat ~/.notihub/config.yaml
   ```

2. Reinitialize if corrupted:
   ```bash
   notihub init --force
   ```

## 📚 Next Steps

- 📖 Read the [Architecture Guide](./docs/ARCHITECTURE.md)
- 🔌 Learn how to [create custom adapters](./docs/EXTENDING.md)
- 🚀 [Deploy to production](./docs/DEPLOYMENT.md)
- 💬 Join [community discussions](https://github.com/yourusername/notihub/discussions)
