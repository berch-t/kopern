# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest (`main`) | Yes |
| Older commits | No |

## Reporting a Vulnerability

**Do NOT open a public issue for security vulnerabilities.**

Send an email to **security@kopern.ai** with:

1. Description of the vulnerability
2. Steps to reproduce
3. Impact assessment (what an attacker could do)
4. Any suggested fix

### Response Timeline

- **48 hours** — Acknowledgment of your report
- **7 days** — Assessment and severity classification
- **30 days** — Fix deployed (critical/high severity)

### Scope

In scope:
- Authentication bypass
- Data exposure (access to other users' data)
- Injection vulnerabilities (XSS, SQL injection, command injection)
- Server-Side Request Forgery (SSRF)
- Privilege escalation
- API key leakage
- Webhook signature bypass

Out of scope:
- Social engineering attacks
- Denial of service (DoS/DDoS)
- Vulnerabilities in third-party dependencies with no exploit path
- Issues already reported and being fixed
- Rate limiting bypass (already logged and monitored)

### Recognition

We credit researchers in our changelog (with permission). No bug bounty program at this time.
