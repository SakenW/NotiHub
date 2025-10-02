# NotiHub - Project Summary

## 项目概述

**NotiHub** 是一个统一的通知中枢系统，用于接收来自多种来源的事件，并分发到多个通知渠道。

### 核心价值

- ✅ **统一事件模型** - 标准化不同系统的事件格式
- ✅ **多渠道支持** - 一次发送，多渠道分发
- ✅ **智能策略** - 去重、限流、重试、降级
- ✅ **可视化管理** - Web Dashboard 实时监控
- ✅ **灵活部署** - CLI 工具 + 本地/云端服务

## 架构设计

### 架构模式

采用 **六边形架构（Hexagonal Architecture）** + **战术 DDD**：

1. **端口-适配器模式** - 输入输出解耦
2. **依赖倒置** - 核心不依赖外部实现
3. **配置驱动** - 动态启用/禁用功能
4. **插件化扩展** - 新增适配器无需改动核心

### 分层结构

```
┌─────────────────────────────────────┐
│  Presentation (CLI/Web Routes)      │
├─────────────────────────────────────┤
│  Input Adapters (事件来源)           │
│  • CLI • HTTP • Claude Code         │
│  • GitHub • n8n • Codex             │
├─────────────────────────────────────┤
│  Application Services (业务逻辑)     │
│  • NotificationService              │
│  • DeduplicationService             │
│  • RetryPolicy • EventStore         │
├─────────────────────────────────────┤
│  Domain Layer (核心模型)             │
│  • Event • Channel • Policy         │
├─────────────────────────────────────┤
│  Output Adapters (通知渠道)          │
│  • Feishu • Slack • DingTalk        │
│  • Telegram • Email • Webhook       │
├─────────────────────────────────────┤
│  Infrastructure (基础设施)           │
│  • Storage • Cache • SSE • Logger   │
└─────────────────────────────────────┘
```

## 目录结构

```
notihub/
├── src/
│   ├── cli/                      # CLI 命令
│   │   ├── index.ts
│   │   └── commands/
│   │       ├── init.ts           # 初始化配置
│   │       ├── send.ts           # 发送通知
│   │       ├── serve.ts          # 启动 Web 服务
│   │       ├── config.ts         # 配置管理
│   │       └── dashboard.ts      # 打开仪表盘
│   │
│   ├── web/                      # Web 服务器
│   │   ├── server.ts
│   │   ├── routes/
│   │   │   ├── api/              # REST API
│   │   │   ├── webhooks/         # Webhook 端点
│   │   │   └── sse/              # 实时事件流
│   │   └── middleware/
│   │
│   ├── dashboard/                # 前端 Dashboard (Vue 3)
│   │   └── src/
│   │       ├── pages/            # 页面组件
│   │       ├── components/       # UI 组件
│   │       ├── api/              # API 客户端
│   │       └── stores/           # 状态管理
│   │
│   ├── adapters/                 # 适配器层
│   │   ├── input/                # 输入适配器
│   │   │   ├── base/             # 基类和注册表
│   │   │   ├── cli/              # CLI 输入
│   │   │   ├── http/             # HTTP API
│   │   │   ├── claude-code/      # Claude Code Hook
│   │   │   ├── codex/            # Codex 集成
│   │   │   ├── github/           # GitHub Webhook
│   │   │   └── n8n/              # n8n 集成
│   │   │
│   │   └── output/               # 输出适配器
│   │       ├── base/             # 渠道接口
│   │       ├── feishu/           # 飞书
│   │       ├── dingtalk/         # 钉钉
│   │       ├── slack/            # Slack
│   │       ├── telegram/         # Telegram
│   │       ├── wecom/            # 企业微信
│   │       ├── email/            # 邮件
│   │       └── webhook/          # 通用 Webhook
│   │
│   ├── application/              # 应用服务层
│   │   ├── notification-service.ts    # 通知服务
│   │   ├── deduplication-service.ts   # 去重服务
│   │   ├── retry-policy.ts            # 重试策略
│   │   ├── event-store.ts             # 事件存储
│   │   └── stats-collector.ts         # 统计收集
│   │
│   ├── domain/                   # 领域层
│   │   ├── types.ts              # 类型定义
│   │   ├── event.ts              # 事件模型
│   │   └── ...
│   │
│   └── infrastructure/           # 基础设施层
│       ├── cache/                # 缓存（LRU）
│       ├── storage/              # 持久化（SQLite/Postgres）
│       ├── sse/                  # Server-Sent Events
│       └── logger/               # 日志
│
├── templates/                    # 配置模板、卡片模板
├── tests/                        # 测试
├── docs/                         # 文档
├── package.json
├── tsconfig.json
└── README.md
```

## 核心功能模块

### 1. 输入适配器（Input Adapters）

**职责**：将不同来源的数据转换为标准事件模型

| 适配器 | 说明 | 支持方式 |
|--------|------|----------|
| CLI | 命令行输入 | `notihub send` |
| HTTP | REST API | `POST /webhooks/notify` |
| Claude Code | AI 编码助手 Hook | Webhook |
| GitHub | 代码仓库事件 | Webhook |
| n8n | 工作流自动化 | 命令执行 |
| Codex | 自定义服务 | API |

**接口定义**：
```typescript
interface InputAdapter {
  name: string;
  version: string;
  parse(rawInput: unknown): Promise<Event | Event[]>;
  validate(rawInput: unknown): boolean;
  getConfigSchema(): object;
}
```

### 2. 输出渠道（Output Channels）

**职责**：将标准事件转换为渠道特定格式并发送

| 渠道 | 类型 | 支持格式 |
|------|------|----------|
| Feishu (飞书) | Webhook/MCP | 交互式卡片 |
| DingTalk (钉钉) | Webhook | 富文本消息 |
| Slack | Webhook | Block Kit |
| Telegram | Bot API | HTML 格式 |
| WeCom (企业微信) | Webhook | Markdown |
| Email | SMTP | HTML/Plain |
| Generic Webhook | HTTP POST | JSON |

**接口定义**：
```typescript
interface Channel {
  name: string;
  type: ChannelType;
  send(event: Event): Promise<SendResult>;
  healthCheck(): Promise<boolean>;
  getSupportedEventTypes(): EventType[];
  getConfigSchema(): object;
}
```

### 3. 应用服务（Application Services）

#### NotificationService
- 核心编排逻辑
- 去重检查
- 多渠道分发
- 重试处理
- 事件存储

#### DeduplicationService
- 基于 `trace_id + event_type` 去重
- LRU 缓存，可配置 TTL（默认 60 秒）

#### RetryPolicy
- 指数退避重试（1s, 4s, 10s）
- 可配置最大重试次数（默认 3 次）

#### EventStore
- 持久化事件和发送结果
- 支持 SQLite（本地）/ PostgreSQL（云端）
- 发出 SSE 事件供 Dashboard 实时展示

### 4. Web Dashboard

**功能页面**：

| 页面 | 功能 |
|------|------|
| Overview | 今日统计、趋势图表、渠道状态 |
| Events | 事件历史、搜索筛选、详情查看 |
| Channels | 渠道配置、测试连通性、启用/禁用 |
| Inputs | 输入源配置、Webhook URL 查看 |
| Settings | 策略配置（去重/限流/重试） |
| Logs | 实时日志流（SSE） |

**技术栈**：
- 后端：Fastify + TypeScript
- 前端：Vue 3 + Vite + Naive UI
- 实时通信：Server-Sent Events (SSE)

## 使用流程

### 基本流程

```bash
# 1. 安装
npm install -g @notihub/cli

# 2. 初始化配置
notihub init

# 3. 发送通知
notihub send -f event.json

# 4. 启动 Web Dashboard
notihub serve
notihub dashboard
```

### 集成示例

#### Claude Code Hook

```bash
# .claude-code/hooks/on-task-complete.sh
notihub send \
  --source=claude-code \
  --type=success \
  --title="Task: $TASK_NAME" \
  --summary="Completed in ${DURATION}s"
```

#### GitHub Actions

```yaml
- name: Notify
  run: |
    notihub send -f - <<EOF
    {
      "source": "github",
      "event_type": "error",
      "title": "Build Failed",
      "summary": "See logs"
    }
    EOF
```

#### HTTP API

```bash
curl -X POST http://localhost:3000/webhooks/notify \
  -H "Authorization: Bearer TOKEN" \
  -d '{"source":"api","event_type":"info",...}'
```

## 配置管理

### 配置文件位置

- 本地模式：`~/.notihub/config.yaml`
- 云端模式：环境变量或挂载配置

### 配置结构

```yaml
version: "1"

server:
  enabled: true
  port: 3000
  mode: local  # local | cloud

inputs:
  claude-code:
    enabled: true
    webhook_path: /webhooks/claude-code

channels:
  feishu:
    enabled: true
    webhook: "https://..."
    secret: "xxx"
    sign: true

policies:
  deduplication:
    enabled: true
    ttl: 60
  retry:
    enabled: true
    max_attempts: 3
    backoff: [1, 4, 10]
```

## 部署选项

### 本地模式（默认）

```bash
notihub serve
```
- SQLite 数据库
- 内存缓存
- 单进程服务

### 云端模式

```bash
export NOTIHUB_MODE=cloud
export DATABASE_URL=postgresql://...
notihub serve --cloud --host 0.0.0.0
```
- PostgreSQL 数据库
- 可水平扩展
- 支持多租户（计划中）

### Docker 部署

```bash
docker build -t notihub .
docker run -p 3000:3000 -v ~/.notihub:/root/.notihub notihub
```

## 扩展性

### 新增输入适配器

1. 创建类实现 `InputAdapter` 接口
2. 实现 `parse()` 方法转换为 `Event`
3. 在 `InputRegistry` 注册
4. 添加配置 schema

### 新增输出渠道

1. 创建类实现 `Channel` 接口
2. 实现 `send()` 方法发送通知
3. 在 `ChannelRegistry` 注册
4. 添加配置 schema

## 开发路线图

### M1: MVP (当前阶段)
- [x] CLI 工具
- [x] HTTP API
- [x] 飞书 Webhook 渠道
- [x] 去重/重试策略
- [ ] 基础 Web Dashboard

### M2: 记录增强
- [ ] SQLite 存储
- [ ] 事件历史查询
- [ ] 统计图表
- [ ] 飞书表格同步

### M3: 多渠道
- [ ] Slack 适配器
- [ ] DingTalk 适配器
- [ ] Telegram 适配器
- [ ] Email 适配器

### M4: 高级功能
- [ ] 路由规则引擎
- [ ] 模板系统
- [ ] AI 摘要（失败日志提炼）
- [ ] Prometheus 指标
- [ ] 多租户支持

## 技术栈

| 层级 | 技术 |
|------|------|
| 语言 | TypeScript |
| 运行时 | Node.js 18+ |
| CLI | Commander.js |
| Web 框架 | Fastify |
| 前端 | Vue 3 + Vite |
| UI 组件 | Naive UI |
| 状态管理 | Pinia |
| 数据库 | SQLite / PostgreSQL |
| 缓存 | LRU Cache |
| HTTP 客户端 | Axios |
| 日志 | Pino |
| 测试 | Vitest |
| 构建 | TSC + Vite |

## 文件说明

### 配置文件
- `package.json` - npm 包配置
- `tsconfig.json` - TypeScript 编译配置
- `.env.example` - 环境变量模板
- `templates/config.template.yaml` - 用户配置模板

### 文档文件
- `README.md` - 项目主文档
- `docs/ARCHITECTURE.md` - 架构设计文档
- `docs/QUICKSTART.md` - 快速开始指南
- `docs/PROJECT_SUMMARY.md` - 本文档

### 核心代码
- `src/domain/` - 领域模型和类型定义
- `src/adapters/` - 输入输出适配器
- `src/application/` - 业务逻辑服务
- `src/infrastructure/` - 基础设施实现
- `src/cli/` - CLI 命令实现
- `src/web/` - Web 服务器实现

## 开发指南

### 本地开发

```bash
# 克隆仓库
git clone https://github.com/yourusername/notihub.git
cd notihub

# 安装依赖
npm install

# 开发模式（热重载）
npm run dev

# 构建
npm run build

# 测试
npm test

# 本地链接（测试 CLI）
npm link
notihub --help
```

### 代码规范

- ESLint + Prettier
- Conventional Commits
- 单元测试覆盖率 > 80%

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交改动 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 许可证

MIT License - 详见 [LICENSE](../LICENSE)
