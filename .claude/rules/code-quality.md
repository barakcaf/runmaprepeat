---
description: Code quality, architecture, and system design expertise
globs:
  - "**/*.py"
  - "**/*.ts"
  - "**/*.tsx"
---

# Code Quality & Architecture

## Project-Specific Conventions
- Clear separation: handlers → data layer (no business logic in Lambda entry points)
- DynamoDB single-table design (PK: userId, SK: PROFILE | RUN#<ulid>)
- All API calls through `src/api/` module on frontend
- Type hints on all Python function signatures
- Strict TypeScript: no `any`
- Conventional commits: `feat:`, `fix:`, `test:`, `chore:`, `docs:`

## Architecture & Design Patterns
- AWS Well-Architected Framework across all 6 pillars (Operational Excellence,
  Security, Reliability, Performance Efficiency, Cost Optimization, Sustainability)
- Service decomposition using Domain-Driven Design and bounded contexts
- Distributed system patterns: CQRS, Event Sourcing, Saga, Outbox, Circuit Breaker,
  Bulkhead, Sidecar, Strangler Fig
- API design: REST — consistency, versioning, idempotency,
  pagination, backward compatibility

## AWS Service Limits (know these)
- Lambda: 1000 default concurrent executions, 10 burst concurrency
- API Gateway: 10,000 RPS (regional), 29s integration timeout (WebSocket)
- DynamoDB: 40,000 RCU/WCU per table (on-demand auto-scales), 1MB scan limit
- SQS: unlimited throughput (standard), 300 msg/s (FIFO), 256KB message size
- SNS: 100,000 topics, 12.5M subscriptions per topic

## Compute Optimization
- Lambda cold start mitigation: provisioned concurrency, SnapStart, minimal package size
- Graviton/ARM64 by default — cheaper and faster
- Cost awareness: data transfer ($0.09/GB cross-region), NAT Gateway ($0.045/hr)

## Data Modeling
- DynamoDB: access patterns drive schema, GSI overloading, single-table design
- Always paginate Scans (1MB limit per call)
- Decimal → float conversion before JSON serialization
- Caching: cache-aside, write-through, TTL design

## Code Standards
- Cyclomatic complexity thresholds, function length limits
- SOLID principles, composition over inheritance
- Dependency management: version pinning, CVE exposure, minimal surface area

## Error Handling
- Exception taxonomy with clear hierarchy
- Retry with exponential backoff and jitter for AWS SDK calls
- Never swallow exceptions silently
- API errors: `{ "error": "message" }` with appropriate status codes

## Observability
- Structured logging (JSON) with correlation IDs
- Distributed tracing (X-Ray) instrumentation
- Custom CloudWatch metrics for business events
- Latency profiling: P50/P95/P99 targets

## Code Review Output Format
Structured headers: **Critical**, **Major**, **Minor**, **Commendations**
Include code snippets for fixes. Quantify impact where possible
(e.g., "reduces cold starts by ~40%", "saves ~$X/month").
Cost efficiency score (1-10) with justification.
