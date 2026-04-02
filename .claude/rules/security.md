---
description: AWS security rules — mandatory for all code changes
globs: "**"
---

# Security Rules (SLATS) — NEVER Violate These

These are hard blockers. If a fix would violate any rule, skip it and explain why.

## Resource Policies
- NEVER use `"Principal": "*"` without scoped conditions (aws:PrincipalOrgID, aws:SourceAccount, etc.)
- NEVER create public S3 buckets (read or write) — serve through CloudFront
- NEVER create Lambda function URLs with `AuthType: NONE`
- NEVER create SQS/SNS/KMS/Secrets Manager policies open to `"Principal": "*"`

## IAM
- NEVER create IAM users with console login — use federated access
- NEVER enable root account access keys
- NEVER use `ForAllValues` on single-valued condition keys (returns true when key absent)
- NEVER use policy variables (`${aws:...}`) in trust policies — use literal values
- NEVER rely on IP address conditions alone to restrict role access

## Data Protection
- NEVER make EBS/RDS snapshots or EC2 AMIs public
- NEVER hardcode secrets, API keys, account IDs, or ARNs in source code
- NEVER store credentials in environment variables as plaintext — use Secrets Manager or SSM Parameter Store
- NEVER disable encryption at rest (DynamoDB, S3, EBS, RDS)

## Cognito
- NEVER allow self-registration on Cognito user pools — admin-only registration
- NEVER allow unauthenticated identity pool access without scoped-down permissions
- NEVER disable Cognito authorizer on API Gateway routes

## Network
- NEVER open SSH (port 22) to 0.0.0.0/0 — use SSM Session Manager
- NEVER create security groups with unrestricted ingress (0.0.0.0/0) on sensitive ports
- NEVER expose internal services directly — use ALB/CloudFront with proper security groups

## API Gateway
- NEVER deploy API Gateway without authorization (Cognito, IAM, or Lambda authorizer)
- NEVER enable API Gateway execute-api endpoint when using custom domains — disable it


## Deep Expertise

## AWS Security Depth
- IAM: least-privilege enforcement, permission boundaries, SCPs, role trust policies,
  condition keys (aws:SourceIp, aws:PrincipalOrgID, aws:SourceAccount)
- No `*` actions or resources in production policies
- Cross-account access: explicit trust with conditions, not implicit
- KMS CMK vs AWS managed keys — use CMK for sensitive data, envelope encryption
  for large payloads
- S3: PublicAccessBlock at account level, not just bucket level
- Secrets Manager with rotation, SSM Parameter Store SecureString
- Never store credentials in environment variables displayed in logs
- TLS everywhere, no weak ciphers, certificate management via ACM

### Network
- Security groups: deny by default, no 0.0.0.0/0 ingress on sensitive ports
- NACLs as secondary defense layer
- VPC Flow Logs enabled on all VPCs
- PrivateLink vs public endpoints — prefer PrivateLink
- VPC endpoints over NAT Gateway (cost + security)
- IMDSv2 with hop limit 2 for containers

### Detection & Monitoring
- GuardDuty threat intelligence enabled
- CloudTrail: all regions, management + data events, log file validation
- Security Hub standards: CIS AWS Foundations, AWS FSBP, PCI DSS
- AWS Config rules for drift detection
- ECR image scanning (Inspector enhanced scanning)
- Container hardening: distroless, non-root, read-only filesystem

## OWASP Top 10 (2021)
1. **Broken Access Control** — server-side enforcement, deny by default
2. **Cryptographic Failures** — data classification, TLS everywhere, no weak ciphers
3. **Injection** — parameterized queries, input validation, WAF rules
4. **Insecure Design** — threat modeling in design phase
5. **Security Misconfiguration** — hardening, disable defaults, IaC scanning
6. **Vulnerable Components** — SBOM, Dependabot, CVE triage
7. **Authentication Failures** — MFA, session management, brute-force protection
8. **Software/Data Integrity** — code signing, supply chain, CI integrity
9. **Logging/Monitoring Failures** — SIEM coverage, alerting SLAs
10. **SSRF** — IMDSv2, network egress controls

## OWASP Top 10 for LLMs (2025)
- **LLM01: Prompt Injection** — direct and indirect, sandboxing, input sanitization
- **LLM02: Sensitive Information Disclosure** — PII in prompts/outputs, output filtering
- **LLM03: Supply Chain** — model provenance, fine-tune data poisoning
- **LLM04: Data and Model Poisoning** — training data validation
- **LLM05: Improper Output Handling** — downstream injection, unsafe deserialization
- **LLM06: Excessive Agency** — principle of least privilege for agent tool access
- **LLM07: System Prompt Leakage** — confidentiality of system prompts
- **LLM08: Vector/Embedding Weaknesses** — RAG poisoning, embedding inversion
- **LLM09: Misinformation** — hallucination risk in high-stakes domains
- **LLM10: Unbounded Consumption** — token budget limits, rate limiting, DoS prevention

## Threat Modeling
- Apply STRIDE: Spoofing, Tampering, Repudiation, Information Disclosure, DoS, Elevation
- Data flow diagram analysis, trust boundary identification
- Attack surface enumeration: public endpoints, third-party integrations, IAM paths

## Compliance & Supply Chain
- SOC 2, ISO 27001, GDPR, HIPAA alignment indicators
- SBOM generation and dependency confusion attack vectors
- CI/CD pipeline security: secret scanning, SAST, DAST, IaC scanning (Checkov, cfn-nag)

## Security Review Output Format
Classify findings: **[CRITICAL]** (exploitable now), **[HIGH]**, **[MEDIUM]**, **[LOW]**
For each: Finding → Impact → Blast Radius → Remediation → Detective Controls
Map to OWASP category or AWS security pillar. Flag compliance implications.
