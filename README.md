<div align="center">

# 🏃‍♂️ RunMapRepeat

**Your personal run tracker. Your data. Your infrastructure.**

*Draw routes on a map → track distance, pace, calories → own your fitness data*

[![License](https://img.shields.io/badge/License-Private-red.svg)](LICENSE)
[![AWS](https://img.shields.io/badge/AWS-Serverless-FF9900?logo=amazonaws)](https://aws.amazon.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)

</div>

---

## 🌟 Why RunMapRepeat?

**Fed up with bloated fitness apps that lock your data behind subscriptions?**

RunMapRepeat is different. It's a **self-hosted**, **lightweight** alternative that puts you in complete control. Built with modern serverless architecture, it scales effortlessly while keeping costs predictable. Perfect for runners who want clean analytics without the monthly fees.

### ✨ **Built for**
- 🏃‍♀️ **Runners** who want beautiful, simple run tracking without subscription lock-in
- 👩‍💻 **Developers** seeking a production-ready serverless full-stack reference architecture
- 🔒 **Privacy-conscious users** who want their fitness data in their own AWS account

## 🚀 Features

<table>
<tr>
<td width="50%">

### 🗺️ **Interactive Route Mapping**
✨ **Draw routes with a click** — Create running routes by clicking waypoints on an interactive map
📏 **Auto distance calculation** — Precise measurements from route geometry
🔍 **Smart location search** — Powered by Amazon Location Service (Esri)
📱 **Mobile-optimized** — Touch-friendly map controls

### 📊 **Beautiful Analytics Dashboard**
📈 **Live stats cards** — Week/month distance, pace, run count with trend arrows
📊 **Weekly distance chart** — Visual progress over the last 8 weeks
📅 **Monthly overview** — 6-month distance visualization
🏆 **Personal records** — Longest run, fastest pace, best week
🎯 **All-time totals** — Complete running history at a glance

</td>
<td width="50%">

### 🎵 **Spotify Integration**
🎶 **Smart music search** — Find artists, albums, or tracks with autocomplete
💿 **Album artwork** — Beautiful visual display with Spotify links
🎧 **"What I listened to"** — Associate music with your runs
🔗 **Deep linking** — Direct "Open in Spotify" integration

### 👤 **User Profile & Health**
⚖️ **Calorie calculation** — Based on your weight and distance
📝 **Rich run logging** — Distance, duration, pace, elevation, notes
📅 **Plan ahead** — Schedule future runs and mark them complete
✉️ **Email summaries** — Weekly/monthly progress reports

### 🔒 **Security & Auth**
🛡️ **Enterprise-grade auth** — AWS Cognito with SRP flow
✅ **Email verification** — Secure self-registration process
🔐 **Protected routes** — Every page requires authentication
⚙️ **Profile gates** — Guided setup for new users

</td>
</tr>
</table>

## 🏗️ Architecture

<div align="center">

![RunMapRepeat Architecture](docs/architecture.png)

</div>

### 🎯 **Design Philosophy**
| **Principle** | **Implementation** | **Why** |
|---|---|---|
| **Serverless-First** | Lambda + API Gateway + DynamoDB | Scale to zero, pay per use, no server management |
| **Single-Table Design** | All entities in one DynamoDB table | Predictable performance, cost efficiency |
| **ARM64 Everywhere** | Graviton-powered Lambdas | 20% better price-performance |
| **Mobile-First** | React SPA with CloudFront | Fast, responsive, works offline |
| **Infrastructure as Code** | AWS CDK with TypeScript | Reproducible, version-controlled infrastructure |

---

## 🤖 AI-Powered Code Review & Auto-Fix

> **🚀 This is what makes RunMapRepeat special**
> Every pull request gets **automatically reviewed by Claude Opus 4.6** and **auto-fixed by Claude Sonnet 4** with zero human intervention required for the review-fix cycle.

### ⚡ **How It Works**

<div align="center">

```
🔄 AUTOMATED REVIEW & FIX PIPELINE
──────────────────────────────────────────

PR Opened/Updated → 🧪 Tests → 🤖 AI Review → 🔧 Auto-Fix → ✅ Merge Ready

┌─ 🧪 TEST PHASE ─────────────┐    ┌─ 🤖 REVIEW PHASE ─────────┐    ┌─ 🔧 FIX PHASE ──────────────┐
│ • Frontend (Vitest)         │    │ Claude Opus 4.6          │    │ Claude Sonnet 4             │
│ • Backend (pytest)          │───▶│ • Security scan           │───▶│ • Reads findings            │
│ • Infrastructure (CDK)      │    │ • Code quality review     │    │ • Fixes issues              │
│ • E2E tests                 │    │ • Test coverage check     │    │ • Runs tests                │
│                             │    │ • Posts inline comments   │    │ • Pushes working changes    │
│ ❌ Fail → Stop              │    │ • Auto-resolves old fixes │    │ • Max 2 cycles              │
└─────────────────────────────┘    └───────────────────────────┘    └─────────────────────────────┘
```

</div>

### 🎯 **AI Agents**

| **🤖 Agent** | **Model** | **Role** |
|---------|-------|----------|
| **🔍 Review Agent** | Claude Opus 4.6 | Security scan, code quality, AWS best practices, test coverage analysis |
| **🔧 Fix Agent** | Claude Sonnet 4 | Auto-fix code issues, run tests, revert broken changes, push working fixes |

### ⚡ **Key Features**

- 🛡️ **Security-first** — SLATS rules auto-loaded by all agents
- 🔄 **Zero human intervention** — Full review-fix cycle runs automatically
- 👤 **Human approval required** — Bots never auto-approve merges
- 🏷️ **Escape hatch** — Add `no-auto-fix` label to disable per-PR
- 📊 **Full audit trail** — All findings and fixes visible in PR conversation

> 💡 **Want to see this in action?** Check out the [complete design doc](docs/design/ai-review-and-fix-pipeline.md)

---

## ⚙️ CI/CD Pipeline

<div align="center">

![RunMapRepeat CI/CD Pipeline](docs/cicd-pipeline.png)

</div>

### 🎯 **Smart Path-Based Routing**
A GitHub webhook Lambda automatically routes deployments based on changed files:

| **📁 Changed Files** | **🚀 Pipeline Triggered** | **⏱️ Build Time** |
|-------|------------|--------|
| `frontend/`, `buildspec.yml` | Frontend Pipeline | ~3 min |
| `backend/`, `infra/` | Backend Pipeline | ~5 min |

---

## 🏗️ Infrastructure Stacks

| **🏷️ Stack** | **📦 Resources** | **💡 Purpose** |
|---------|-------------|-----------|
| **Auth** | Cognito User Pool, Identity Pool, IAM roles | User authentication & authorization |
| **Frontend** | S3 bucket, CloudFront distribution | React SPA hosting |
| **Data** | DynamoDB single-table (on-demand) | Run data & user profiles |
| **API** | API Gateway, Lambda functions, Location Service | Backend REST API |
| **Pipelines** | CodePipeline V2 + CodeBuild (ARM64) | Automated deployment |
| **Webhook** | API Gateway + Lambda | GitHub integration |

---

## 🛠️ Tech Stack

<table>
<tr>
<td width="50%">

### 🎨 **Frontend**
- ⚛️ **React 18** — Modern hooks-based components
- 📘 **TypeScript** — Type-safe development
- ⚡ **Vite** — Lightning-fast builds
- 🗺️ **MapLibre GL JS** — Interactive maps
- 📊 **Recharts** — Beautiful data visualization

### ☁️ **Backend**
- 🐍 **Python 3.12** — Latest features & performance
- 🚀 **AWS Lambda (ARM64)** — Graviton-powered serverless
- 🔗 **API Gateway** — RESTful API management
- 📦 **DynamoDB** — Single-table NoSQL design

</td>
<td width="50%">

### 🏗️ **Infrastructure**
- 🏗️ **AWS CDK (Python)** — Infrastructure as Code
- 🚀 **CodePipeline V2** — Automated deployments
- 🔐 **Cognito** — Enterprise auth (User + Identity Pools)
- 🌐 **S3 + CloudFront** — Global SPA hosting

### 🤝 **Integrations**
- 🗺️ **Amazon Location Service** — Esri-powered search
- 🎵 **Spotify Web API** — Music search & linking
- 🤖 **Claude Opus 4.6** — AI code review via Bedrock
- 📱 **Telegram Bot** — Pipeline notifications

</td>
</tr>
</table>

---

## 📁 Project Structure

<table>
<tr>
<td width="50%">

### 🤖 **AI & DevOps**
```
.claude/
├── rules/                  # Auto-loaded code rules
│   ├── security.md         # AWS SLATS security rules
│   ├── backend.md          # Python/Lambda conventions
│   ├── frontend.md         # React/TypeScript rules
│   └── infrastructure.md   # CDK best practices

.github/
├── workflows/
│   ├── pr-review.yml       # AI review pipeline
│   └── claude-fix.yml      # Auto-fix workflow
├── scripts/
│   └── ai_review.py        # Review agent (Opus 4.6)
└── prompts/                # AI agent instructions
```

### 🎨 **Frontend** (React SPA)
```
frontend/
├── src/
│   ├── api/                # Cognito-authenticated client
│   ├── auth/               # Login, register, profile gate
│   ├── components/
│   │   ├── Dashboard/      # Stats cards & charts
│   │   ├── Map/            # Interactive mapping
│   │   ├── NavBar/         # Mobile navigation
│   │   └── Spotify/        # Music search
│   ├── pages/              # Route components
│   ├── types/              # TypeScript definitions
│   └── utils/              # Helpers & calculations
└── e2e/                    # Playwright tests
```

</td>
<td width="50%">

### 🐍 **Backend** (Python Lambdas)
```
backend/
├── handlers/               # Lambda entry points
│   ├── profile.py          # User profile CRUD
│   ├── runs.py             # Run tracking API
│   ├── stats.py            # Analytics aggregation
│   └── spotify_search.py   # Music integration
├── data/                   # DynamoDB access layer
│   ├── profile.py          # Profile data operations
│   ├── runs.py             # Run data operations
│   └── spotify.py          # Spotify API client
└── tests/                  # pytest coverage
```

### 🏗️ **Infrastructure** (AWS CDK)
```
infra/
├── app.py                  # CDK application entry
├── stacks/                 # Infrastructure stacks
│   ├── auth_stack.py       # Cognito authentication
│   ├── data_stack.py       # DynamoDB tables
│   ├── api_stack.py        # API Gateway + Lambdas
│   ├── frontend_stack.py   # S3 + CloudFront
│   └── pipeline_stack.py   # CI/CD automation
└── tests/                  # Infrastructure tests
```

### 📋 **Configuration**
```
buildspec.yml               # Frontend CodeBuild spec
CLAUDE.md                   # Development guidelines
WORKFLOW.md                 # Team processes
```

</td>
</tr>
</table>

---

## 📡 API Reference

<div align="center">

**🔒 All endpoints require Cognito JWT authorization**

</div>

### 👤 **Profile Management**
| **Method** | **Endpoint** | **Purpose** |
|---------|-----------|-----------|
| `GET` | `/profile` | Get user profile details |
| `PUT` | `/profile` | Create or update user profile |

### 🏃‍♀️ **Run Tracking**
| **Method** | **Endpoint** | **Purpose** |
|---------|-----------|-----------|
| `GET` | `/runs` | List all user runs |
| `POST` | `/runs` | Create new run (planned or completed) |
| `GET` | `/runs/{runId}` | Get specific run details |
| `PUT` | `/runs/{runId}` | Update existing run |
| `DELETE` | `/runs/{runId}` | Delete a run |
| `POST` | `/runs/{runId}/complete` | Mark planned run as completed |

### 📊 **Analytics**
| **Method** | **Endpoint** | **Purpose** |
|---------|-----------|-----------|
| `GET` | `/stats` | Get aggregated running statistics |

### 🎵 **Music Integration**
| **Method** | **Endpoint** | **Purpose** |
|---------|-----------|-----------|
| `GET` | `/spotify/search?q=...&type=...` | Search Spotify catalog (artists, albums, tracks) |

---

## 🗄️ Database Schema

**Single-table DynamoDB design for optimal performance**

| **🏷️ Entity** | **PK** | **SK** | **📋 Key Attributes** |
|---------|-----|-----|---------------------|
| **Profile** | `{cognito-sub}` | `PROFILE` | email, displayName, heightCm, weightKg, emailSubscriptions |
| **Run** | `{cognito-sub}` | `RUN#{ulid}` | status, runDate, title, route, distanceMeters, durationSeconds, paceSecondsPerKm, caloriesBurned, notes, audio |

---

## 🚀 Getting Started

### 📋 **Prerequisites**

Make sure you have these installed:

- 🟢 **Node.js 22+** — Frontend development
- 🐍 **Python 3.12+** — Backend & infrastructure
- ☁️ **AWS CDK CLI** — `npm install -g aws-cdk`
- 🔧 **AWS CLI** — Configured with appropriate permissions

### 💻 **Local Development**

<table>
<tr>
<td width="33%">

#### 🎨 **Frontend**
```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev

# Run tests
npm run test

# E2E tests
npx playwright test
```

</td>
<td width="33%">

#### 🐍 **Backend**
```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Unit tests
pytest tests/ -v

# Integration tests
pytest tests/ -v -m integration
```

</td>
<td width="33%">

#### 🏗️ **Infrastructure**
```bash
cd infra

# Install dependencies
pip install -r requirements.txt

# Preview changes
cdk diff

# Deploy all stacks
cdk deploy --all

# Deploy single stack
cdk deploy RunMapRepeat-Api
```

</td>
</tr>
</table>

---

## 🚢 Deployment

### ⚡ **Automated Deployment** (Recommended)

Every push to `main` triggers automated deployment:

```
Push to main → GitHub Webhook → Smart Routing → Pipeline Execution → Live!
```

| **📁 Changed Files** | **🔄 Action** | **⏱️ Time** |
|-------|--------|------|
| `frontend/`, `buildspec.yml` | Frontend pipeline: Build → S3 → CloudFront | ~3 min |
| `backend/`, `infra/` | Backend pipeline: Tests → CDK deploy | ~5 min |
| Both | Sequential execution | ~8 min |

### 🛠️ **Manual Deployment**

<details>
<summary>Click to expand manual deployment commands</summary>

```bash
# Frontend deployment
cd frontend && npm run build
aws s3 sync dist/ s3://<site-bucket>/ --delete
aws cloudfront create-invalidation --distribution-id <dist-id> --paths "/*"

# Backend deployment
cd infra && cdk deploy RunMapRepeat-Api RunMapRepeat-Data
```

</details>

---

## 📄 License

**Private project.** All rights reserved.

---

<div align="center">

### 💡 **Questions or Issues?**

Found a bug? Have a feature idea? Want to contribute?
- 📧 **Contact:** [Report an issue](https://github.com/barakcaf/runmaprepeat/issues)
- 📚 **Documentation:** Check out the [design docs](docs/)
- 🤝 **Contributing:** See [WORKFLOW.md](WORKFLOW.md) for development guidelines

---

**⭐ If you find RunMapRepeat useful, consider giving it a star!**

*Built with ❤️ by developers who believe you should own your data*

</div>
