# Secrets Management Guidelines

## Overview
This document outlines the secrets management best practices for the Workover platform.

## Secrets Inventory

### Production Secrets
- **SUPABASE_URL**: Supabase project URL
- **SUPABASE_ANON_KEY**: Public anon key (safe to expose in client)
- **SUPABASE_SERVICE_ROLE_KEY**: Server-side only (NEVER expose to client)
- **STRIPE_SECRET_KEY**: Stripe API secret key (server-side only)
- **STRIPE_PUBLISHABLE_KEY**: Stripe publishable key (safe for client)
- **JWT_SECRET**: JWT signing secret (managed by Supabase)

### Development Secrets
- All secrets should have `.local` variants for local development
- Never commit `.env.local` files to version control

## Storage Locations

### ✅ Correct Storage
- **Supabase Edge Functions**: Use Supabase Secrets (accessible via `Deno.env.get()`)
- **Client-side publishable keys**: Can be in `.env` with `VITE_` prefix
- **Server-side secrets**: MUST be in Supabase Secrets or secure vault

### ❌ Incorrect Storage
- **NEVER** hardcode secrets in source code
- **NEVER** commit secrets to Git
- **NEVER** expose `SERVICE_ROLE_KEY` to client
- **NEVER** use client-side storage (localStorage, sessionStorage) for sensitive tokens

## Rotation Schedule

| Secret | Rotation Frequency | Last Rotated | Next Rotation |
|--------|-------------------|--------------|---------------|
| JWT_SECRET | 6 months | - | - |
| STRIPE_SECRET_KEY | 12 months | - | - |
| SUPABASE_SERVICE_ROLE_KEY | 12 months | - | - |

## Access Control

### Who Can Access Secrets?
- **Admins**: Full access to all secrets via Supabase Dashboard
- **Developers**: Read-only access to non-production secrets
- **Edge Functions**: Automatic access via `Deno.env.get()`
- **CI/CD**: Limited access via GitHub Secrets

## Security Checklist

- [ ] All secrets stored in Supabase Secrets (not hardcoded)
- [ ] `.env` files in `.gitignore`
- [ ] No secrets in Git history (use `git-secrets` or BFG Repo-Cleaner if needed)
- [ ] Service role key NEVER exposed to client-side code
- [ ] Stripe webhook signing secret configured
- [ ] JWT secret rotation scheduled
- [ ] All API keys have minimum required permissions

## Emergency Procedures

### If a Secret is Leaked
1. **Immediately revoke** the compromised secret
2. **Generate new secret** in provider dashboard
3. **Update Supabase Secrets** with new value
4. **Redeploy** all Edge Functions
5. **Audit logs** for unauthorized access
6. **Document incident** in security log

### Secret Rotation Process
1. Generate new secret in provider dashboard
2. Update Supabase Secrets with new value
3. Test in staging environment
4. Deploy to production
5. Monitor for 24 hours
6. Archive old secret (do not delete immediately)
7. Delete old secret after 7 days

## Monitoring
- Review Supabase Edge Function logs weekly for secret access patterns
- Monitor failed authentication attempts
- Alert on suspicious API key usage

## References
- [Supabase Secrets Documentation](https://supabase.com/docs/guides/functions/secrets)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [Stripe API Key Best Practices](https://stripe.com/docs/keys)
