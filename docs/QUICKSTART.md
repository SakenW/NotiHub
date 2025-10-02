# Quick Start Guide

Get started with NotiHub in 5 minutes.

## Installation

### Option 1: Global Installation

```bash
npm install -g @notihub/cli
```

### Option 2: Use npx (No Installation)

```bash
npx @notihub/cli init
```

### Option 3: Local Development

```bash
git clone https://github.com/yourusername/notihub.git
cd notihub
npm install
npm run build
npm link
```

## Initial Setup

### 1. Initialize Configuration

```bash
notihub init
```

You'll be prompted to configure:
- ✅ Feishu (飞书)
- ✅ DingTalk (钉钉)
- ✅ Slack
- ✅ Email
- ✅ Policies (deduplication, retry, rate limiting)

Configuration will be saved to `~/.notihub/config.yaml`

### 2. Test Your First Notification

```bash
# Send a simple notification
notihub send \
  --source="quickstart" \
  --type="success" \
  --title="Hello NotiHub" \
  --summary="Your first notification!"
```

### 3. Send from JSON File

Create `event.json`:

```json
{
  "source": "my-app",
  "event_type": "success",
  "severity": "low",
  "title": "Deployment Successful",
  "summary": "Version 1.0.0 deployed to production",
  "context": {
    "version": "1.0.0",
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
```

Send it:

```bash
notihub send -f event.json
```

### 4. Send from stdin

```bash
echo '{
  "source": "ci",
  "event_type": "error",
  "title": "Build Failed",
  "summary": "Tests failed on main branch"
}' | notihub send
```

## Start Web Dashboard

### 1. Start Server

```bash
notihub serve
```

Output:
```
🚀 Dashboard running at http://localhost:3000
📊 API: http://localhost:3000/api
🔗 Webhooks: http://localhost:3000/webhooks/notify
```

### 2. Open Dashboard

```bash
notihub dashboard
```

Or manually visit: http://localhost:3000

### 3. Explore Features

- **Overview** - Real-time statistics and trends
- **Events** - Search and filter notification history
- **Channels** - Configure and test output channels
- **Inputs** - Manage input sources
- **Settings** - Adjust policies and rules
- **Logs** - Real-time event stream

## Common Use Cases

### Use Case 1: Claude Code Integration

Add to `.claude-code/hooks/on-task-complete.sh`:

```bash
#!/bin/bash

notihub send -f - <<EOF
{
  "source": "claude-code",
  "event_type": "success",
  "severity": "low",
  "title": "Task Completed: $TASK_NAME",
  "summary": "Duration: ${DURATION}s",
  "context": {
    "task_name": "$TASK_NAME",
    "workspace": "$WORKSPACE",
    "files_changed": $FILES_CHANGED
  }
}
EOF
```

Make it executable:
```bash
chmod +x .claude-code/hooks/on-task-complete.sh
```

### Use Case 2: GitHub Actions

Add to `.github/workflows/deploy.yml`:

```yaml
- name: Notify on deployment
  if: always()
  run: |
    STATUS=${{ job.status }}
    EVENT_TYPE="info"

    if [ "$STATUS" = "success" ]; then
      EVENT_TYPE="success"
    elif [ "$STATUS" = "failure" ]; then
      EVENT_TYPE="error"
    fi

    notihub send -f - <<EOF
    {
      "source": "github-actions",
      "event_type": "$EVENT_TYPE",
      "severity": "medium",
      "title": "Deployment $STATUS",
      "summary": "Workflow: ${{ github.workflow }}",
      "context": {
        "repo": "${{ github.repository }}",
        "branch": "${{ github.ref_name }}",
        "commit": "${{ github.sha }}",
        "actor": "${{ github.actor }}"
      },
      "actions": [
        {
          "type": "link",
          "text": "View Logs",
          "url": "${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
        }
      ]
    }
    EOF
```

### Use Case 3: n8n Workflow

In n8n, add an "Execute Command" node:

```javascript
const event = {
  source: "n8n",
  event_type: "info",
  title: $json.title || "Workflow Completed",
  summary: $json.summary || "N8N workflow executed successfully",
  context: {
    workflow_id: $workflow.id,
    workflow_name: $workflow.name,
    execution_id: $execution.id
  }
};

return $(`notihub send -f - <<'EOF'\n${JSON.stringify(event)}\nEOF`);
```

### Use Case 4: API Integration

```bash
# Using curl
curl -X POST http://localhost:3000/webhooks/notify \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "my-service",
    "event_type": "warning",
    "severity": "medium",
    "title": "High Memory Usage",
    "summary": "Server memory at 85%"
  }'
```

```javascript
// Using Node.js
const axios = require('axios');

await axios.post('http://localhost:3000/webhooks/notify', {
  source: 'my-app',
  event_type: 'error',
  severity: 'high',
  title: 'Database Connection Failed',
  summary: 'Could not connect to PostgreSQL',
  context: {
    error: err.message,
    host: 'db.example.com'
  }
}, {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
});
```

```python
# Using Python
import requests

response = requests.post(
    'http://localhost:3000/webhooks/notify',
    headers={'Authorization': 'Bearer YOUR_TOKEN'},
    json={
        'source': 'python-script',
        'event_type': 'success',
        'title': 'Data Sync Complete',
        'summary': 'Synced 1,234 records'
    }
)
```

## Configuration Tips

### Enable Multiple Channels

Edit `~/.notihub/config.yaml`:

```yaml
channels:
  feishu:
    enabled: true
    webhook: "https://open.feishu.cn/..."

  slack:
    enabled: true
    webhook: "https://hooks.slack.com/..."

  email:
    enabled: true
    smtp_host: smtp.gmail.com
    smtp_user: "your-email@gmail.com"
    smtp_password: "your-app-password"
    to:
      - "team@example.com"
```

### Adjust Policies

```yaml
policies:
  deduplication:
    enabled: true
    ttl: 120  # Increase to 2 minutes

  rate_limit:
    enabled: true
    max_per_minute: 20  # Allow more notifications

  retry:
    enabled: true
    max_attempts: 5  # More retries
    backoff: [1, 2, 5, 10, 20]
```

### Set Up Routing Rules

```yaml
routing:
  enabled: true
  rules:
    - name: "Critical Alerts"
      condition:
        severity: critical
      channels:
        - feishu
        - email
        - slack  # Send to all channels

    - name: "CI/CD Only to Slack"
      condition:
        source: github
      channels:
        - slack
```

## CLI Reference

```bash
# Initialization
notihub init                           # Interactive setup
notihub init --force                   # Overwrite existing config

# Sending notifications
notihub send -f event.json             # From file
notihub send --source=test ...         # From flags
echo '{...}' | notihub send            # From stdin

# Configuration management
notihub config list                    # Show current config
notihub config set feishu.webhook ...  # Update value
notihub config test feishu             # Test channel

# Server management
notihub serve                          # Start server
notihub serve --port 8080              # Custom port
notihub serve --daemon                 # Background mode
notihub stop                           # Stop daemon
notihub status                         # Check status
notihub dashboard                      # Open browser

# Channel management
notihub channel list                   # List channels
notihub channel test <name>            # Test channel
notihub channel enable <name>          # Enable channel
notihub channel disable <name>         # Disable channel

# Input management
notihub input list                     # List input sources
notihub input enable <name>            # Enable input
notihub input disable <name>           # Disable input
```

## Troubleshooting

### Notification not sent

1. Check channel configuration:
   ```bash
   notihub config test feishu
   ```

2. Check logs:
   ```bash
   tail -f ~/.notihub/logs/app.log
   ```

3. Verify webhook URL and secrets

### Dashboard not accessible

1. Check if server is running:
   ```bash
   notihub status
   ```

2. Check port availability:
   ```bash
   lsof -i :3000
   ```

3. Try different port:
   ```bash
   notihub serve --port 8080
   ```

### Duplicate notifications

1. Check deduplication TTL (may be too short)
2. Ensure events have unique `trace_id`
3. Review `~/.notihub/config.yaml` policies

## Next Steps

- 📖 Read [Architecture Guide](./ARCHITECTURE.md)
- 🔌 Create [Custom Adapters](./EXTENDING.md)
- 🚀 Deploy to [Cloud](./DEPLOYMENT.md)
- 💬 Join [Community Discussions](https://github.com/yourusername/notihub/discussions)
