# Security Model
# BHMS - Buying House Management System

---

## Table of Contents

1. [Security Architecture](#1-security-architecture)
2. [Authentication](#2-authentication)
3. [Authorization](#3-authorization)
4. [Data Security](#4-data-security)
5. [Audit & Compliance](#5-audit--compliance)
6. [Infrastructure Security](#6-infrastructure-security)

---

## 1. Security Architecture

### 1.1 Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    BHMS Security Architecture                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Layer 1: Network Security                                     │
│  ├── WAF (Web Application Firewall)                            │
│  ├── DDoS Protection                                           │
│  ├── IP Whitelisting                                           │
│  └── SSL/TLS Termination                                       │
│                                                                 │
│  Layer 2: Application Security                                 │
│  ├── Input Validation                                          │
│  ├── Output Encoding                                           │
│  ├── CSRF Protection                                           │
│  ├── XSS Prevention                                           │
│  └── SQL Injection Prevention                                  │
│                                                                 │
│  Layer 3: Authentication                                       │
│  ├── Multi-Factor Authentication (MFA)                         │
│  ├── OAuth 2.0 / OpenID Connect                                │
│  ├── JWT Tokens                                                │
│  └── Session Management                                        │
│                                                                 │
│  Layer 4: Authorization                                        │
│  ├── Role-Based Access Control (RBAC)                          │
│  ├── Permission Matrix                                         │
│  ├── Tenant Isolation                                          │
│  └── Field-Level Security                                      │
│                                                                 │
│  Layer 5: Data Security                                        │
│  ├── Encryption at Rest (AES-256)                              │
│  ├── Encryption in Transit (TLS 1.3)                           │
│  ├── Data Masking                                              │
│  └── Backup Encryption                                         │
│                                                                 │
│  Layer 6: Audit & Compliance                                   │
│  ├── Audit Logging                                             │
│  ├── Activity Monitoring                                       │
│  ├── Compliance Reporting                                      │
│  └── Incident Response                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Security Principles

| Principle | Description |
|-----------|-------------|
| Defense in Depth | Multiple security layers |
| Least Privilege | Minimum required access |
| Separation of Duties | Critical ops require multiple users |
| Secure by Default | Deny all, allow by exception |
| Zero Trust | Verify every request |

---

## 2. Authentication

### 2.1 Authentication Methods

| Method | Priority | Description |
|--------|----------|-------------|
| Email/Password | Required | Standard login |
| MFA (TOTP) | Optional | Time-based one-time password |
| SSO | Optional | Single Sign-On via SAML/OIDC |
| Magic Link | Optional | Passwordless login |

### 2.2 Password Policy

| Rule | Requirement |
|------|-------------|
| Minimum Length | 12 characters |
| Complexity | Upper, lower, number, special |
| History | Last 12 passwords remembered |
| Expiry | 90 days (optional) |
| Lockout | 5 failed attempts |
| Lockout Duration | 30 minutes |

### 2.3 Token Management

| Token Type | Lifetime | Refresh |
|------------|----------|---------|
| Access Token | 30 minutes | Yes |
| Refresh Token | 7 days | Yes |
| MFA Token | 5 minutes | No |
| Reset Token | 1 hour | No |

### 2.4 Session Management

| Rule | Description |
|------|-------------|
| Concurrent Sessions | Max 5 per user |
| Session Timeout | 30 minutes inactivity |
| Session Invalidation | On password change |
| Session Tracking | IP, device, browser |

---

## 3. Authorization

### 3.1 Role-Based Access Control (RBAC)

#### Predefined Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| Super Admin | System administrator | All permissions |
| Tenant Admin | Company administrator | All within tenant |
| Managing Director | Executive access | View all, approve |
| Merchandising Director | Merchandising head | Merchandising + Approve |
| Merchandiser | Order management | CRUD orders, T&A |
| Commercial Manager | LC management | CRUD LC, Banks |
| QA Manager | Quality management | CRUD quality |
| Production Manager | Production management | CRUD production |
| Finance Manager | Finance management | CRUD finance |
| Viewer | Read-only access | View only |

### 3.2 Permission Matrix

| Module | View | Create | Update | Delete | Approve | Export |
|--------|------|--------|--------|--------|---------|--------|
| Orders | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ |
| T&A | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ |
| Costing | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ |
| LC | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ |
| Production | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ |
| Quality | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ |
| Logistics | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ |
| Finance | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ |
| Users | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Settings | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ |

### 3.3 Tenant Isolation

```
┌─────────────────────────────────────────────────────────────────┐
│                    Tenant Isolation Strategy                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Database Level:                                               │
│  ├── Separate schema per tenant                                │
│  ├── Tenant ID in all tables                                   │
│  └── Row-level security policies                               │
│                                                                 │
│  Application Level:                                            │
│  ├── Tenant context middleware                                 │
│  ├── Automatic tenant filtering                                │
│  └── Cross-tenant access prevention                            │
│                                                                 │
│  API Level:                                                    │
│  ├── Tenant ID in headers                                      │
│  ├── JWT contains tenant claim                                 │
│  └── API gateway tenant routing                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Data Security

### 4.1 Encryption Standards

| Data State | Method | Standard |
|------------|--------|----------|
| At Rest | AES-256 | Database, files |
| In Transit | TLS 1.3 | All communications |
| Backups | AES-256 | Encrypted backups |
| Secrets | Vault | HashiCorp Vault |

### 4.2 Data Classification

| Level | Examples | Protection |
|-------|----------|------------|
| Confidential | Financial data, LC details | Encryption, access logging |
| Sensitive | Personal data, passwords | Encryption, masking |
| Internal | Orders, production data | Access control |
| Public | Product catalog | Standard protection |

### 4.3 Data Masking

| Field | Masking Rule |
|-------|--------------|
| Password | Always hashed (bcrypt) |
| Credit Card | Show last 4 only |
| Bank Account | Show last 4 only |
| Phone | Show country code + last 4 |
| Email | Show first 2 chars + domain |

---

## 5. Audit & Compliance

### 5.1 Audit Trail

| Action | Logged |
|--------|--------|
| Login/Logout | ✓ |
| Create | ✓ |
| Update | ✓ |
| Delete | ✓ |
| Approve | ✓ |
| Export | ✓ |
| Permission Change | ✓ |
| Password Change | ✓ |

### 5.2 Audit Log Fields

```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "user_id": "uuid",
  "action": "create",
  "entity_type": "order",
  "entity_id": "uuid",
  "old_values": {},
  "new_values": {},
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "created_at": "2024-01-15T10:30:00Z"
}
```

### 5.3 Compliance Requirements

| Standard | Requirement | Implementation |
|----------|-------------|----------------|
| GDPR | Data protection | Encryption, right to deletion |
| SOC 2 | Security controls | Audit logging, access control |
| ISO 27001 | Information security | Security policies, monitoring |
| OWASP Top 10 | Web security | Input validation, CSRF, XSS |

---

## 6. Infrastructure Security

### 6.1 Network Security

| Control | Implementation |
|---------|----------------|
| WAF | AWS WAF / Cloudflare |
| DDoS | AWS Shield |
| Firewall | Security groups, NACLs |
| VPN | Admin access only |

### 6.2 Server Security

| Control | Implementation |
|---------|----------------|
| OS Hardening | CIS benchmarks |
| Patch Management | Automated updates |
| Anti-malware | Runtime protection |
| File Integrity | Monitoring |

### 6.3 Monitoring & Alerting

| Monitor | Alert |
|---------|-------|
| Failed Logins | 5+ attempts in 5 minutes |
| Unusual Access | New location/device |
| Permission Changes | Any admin changes |
| Data Exports | Large exports |
| API Abuse | Rate limit exceeded |

---

*This document should be reviewed by Security Engineer before implementation.*
