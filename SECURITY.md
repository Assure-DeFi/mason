# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability in Mason, please report it responsibly.

### How to Report

1. **Do NOT open a public GitHub issue** for security vulnerabilities
2. Email security concerns to the maintainers via GitHub's private vulnerability reporting:
   - Go to [Security Advisories](https://github.com/Assure-DeFi/mason/security/advisories)
   - Click "Report a vulnerability"
3. Include as much detail as possible:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment:** We will acknowledge receipt within 48 hours
- **Updates:** We will provide updates on our progress
- **Resolution:** We aim to resolve critical issues within 7 days
- **Credit:** We will credit reporters in our release notes (unless you prefer anonymity)

## Security Best Practices

When deploying Mason, follow these guidelines:

### Environment Variables

- **Never commit `.env.local` files** - they are gitignored for a reason
- **Rotate credentials regularly** - especially after team changes
- **Use strong secrets** - generate with `openssl rand -base64 32`

### Database Security

- **Row Level Security:** The default RLS policies are permissive for development. For production, implement restrictive policies based on `auth.uid()`
- **Service Role Key:** Never expose the Supabase service role key in client-side code

### GitHub OAuth

- **Callback URLs:** Only configure authorized callback URLs for your domains
- **Token Storage:** GitHub tokens are stored encrypted at rest by Supabase
- **Scope Minimization:** Mason requests `repo` scope which is broad; only connect repositories you trust Mason to modify

### Network Security

- **HTTPS Only:** Always use HTTPS in production
- **CORS:** Configure appropriate CORS policies for your deployment

## Known Limitations

- RLS policies in migration files are development-only (documented in SQL comments)
- GitHub access tokens are stored encrypted at rest but not additionally encrypted at application level

## Security Updates

Watch this repository for security updates:

- Enable GitHub notifications for releases
- Check [GitHub Security Advisories](https://github.com/Assure-DeFi/mason/security/advisories)
