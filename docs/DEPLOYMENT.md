# 🚀 Deployment Guide - SpaceShare

Guida completa al deployment di SpaceShare in produzione.

---

## 🎯 Overview

SpaceShare è una web app React + Vite con backend Supabase. Questa guida copre:
- Deployment su Lovable (consigliato)
- Deployment su Netlify/Vercel
- Configurazione Supabase
- Setup Stripe
- DNS e dominio custom
- Monitoraggio e logging

---

## 📋 Pre-requisiti

### Account Necessari

- [ ] **Lovable Account** (per deploy su Lovable)
- [ ] **Supabase Account** (database e auth)
- [ ] **Stripe Account** (pagamenti)
- [ ] **Dominio** (opzionale ma consigliato)

### Variabili d'Ambiente Richieste

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Stripe (backend)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# PostHog (Analytics - opzionale)
VITE_POSTHOG_KEY=phc_xxx
VITE_POSTHOG_HOST=https://eu.posthog.com

# Sentry (Error tracking - opzionale)
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

---

## 🚀 Deployment su Lovable

### Step 1: Preparazione

1. **Commit delle Modifiche**:
   ```bash
   git add .
   git commit -m "Ready for production"
   ```

2. **Verifica Build Locale**:
   ```bash
   npm run build
   npm run preview
   ```

### Step 2: Deploy

1. **Click su "Deploy"** in Lovable interface
2. Lovable esegue:
   - Build del progetto
   - Deploy su CDN
   - SSL automatico
3. **URL di produzione**: `https://your-app.lovable.app`

### Step 3: Configurazione Post-Deploy

**Variabili d'Ambiente**:
1. Settings > Environment Variables
2. Aggiungi tutte le variabili necessarie
3. Redeploy per applicare

**Custom Domain**:
1. Settings > Domains
2. Aggiungi dominio (es. `spaceshare.com`)
3. Configura DNS secondo istruzioni
4. Attendi verifica SSL (5-10 min)

### Vantaggi Lovable Deploy

✅ SSL automatico
✅ CDN globale
✅ Deploy automatici da Git
✅ Rollback con un click
✅ Preview branches

---

## ☁️ Deployment su Netlify

### Step 1: Build Configuration

**netlify.toml**:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"
```

### Step 2: Deploy

**Opzione A - Git Integration**:
1. Connetti repository GitHub
2. Netlify auto-deploya su ogni push
3. Branch deploys per PR

**Opzione B - CLI**:
```bash
# Installa Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
```

### Step 3: Configurazione

**Environment Variables**:
1. Site Settings > Build & Deploy > Environment
2. Aggiungi tutte le variabili VITE_*
3. Redeploy

**Custom Domain**:
1. Domain Settings > Add custom domain
2. Configura DNS (A record o CNAME)
3. SSL automatico (Let's Encrypt)

---

## ▲ Deployment su Vercel

### Step 1: Configurazione

**vercel.json**:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

### Step 2: Deploy

**Opzione A - Git Integration**:
1. Import progetto da GitHub
2. Auto-deploy configurato
3. Preview deployments per PR

**Opzione B - CLI**:
```bash
# Installa Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

### Step 3: Environment Variables

1. Project Settings > Environment Variables
2. Aggiungi variabili per Production
3. Redeploy

---

## 🗄️ Setup Supabase Production

### Step 1: Crea Progetto

1. https://supabase.com/dashboard
2. **New Project**
3. Scegli region (EU per GDPR)
4. Set strong database password

### Step 2: Database Setup

**Opzione A - Migrations**:
```bash
# Se hai migrations in /supabase/migrations
npx supabase db push
```

**Opzione B - Manual**:
1. SQL Editor nel dashboard
2. Esegui schema da `docs/DATABASE_SCHEMA.md`

### Step 3: Row Level Security (RLS)

⚠️ **CRITICO PER SICUREZZA**

Abilita RLS su tutte le tabelle:
```sql
-- Esempio per spaces
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view active spaces"
  ON spaces FOR SELECT
  USING (status = 'active');

CREATE POLICY "Hosts can update own spaces"
  ON spaces FOR UPDATE
  USING (auth.uid() = host_id);
```

Vedi `docs/DATABASE_SCHEMA.md` per tutte le policies.

### Step 4: Storage

**Crea Buckets**:
```sql
-- Bucket per foto spazi
INSERT INTO storage.buckets (id, name, public)
VALUES ('space-images', 'space-images', true);

-- Bucket per foto profilo
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true);
```

**Storage Policies**:
```sql
-- Users can upload to own folder
CREATE POLICY "Users can upload own files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'space-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

### Step 5: Auth Configuration

**Email Settings**:
1. Authentication > Email Templates
2. Personalizza email (signup, reset password)
3. Configura SMTP custom (opzionale)

**OAuth Providers**:
1. Authentication > Providers
2. Abilita Google OAuth
3. Configura credentials da Google Console

**Site URL**:
1. Authentication > URL Configuration
2. Set **Site URL**: `https://yourdomain.com`
3. Aggiungi **Redirect URLs**:
   - `https://yourdomain.com/auth/callback`
   - `http://localhost:5173/auth/callback` (dev)

### Step 6: API Keys

1. Settings > API
2. **Copia keys**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Aggiungi a variabili d'ambiente deploy

---

## 💳 Setup Stripe

### Step 1: Account Setup

1. https://dashboard.stripe.com
2. Completa verifica business
3. Attiva account (da Test a Live)

### Step 2: API Keys

1. Developers > API Keys
2. **Secret key**: `sk_live_xxx` → Backend env
3. **Publishable key**: `pk_live_xxx` → Frontend env

### Step 3: Stripe Connect

**Per pagamenti host**:

1. Settings > Connect
2. Abilita **Express accounts**
3. Configura branding (logo, colori)

**Onboarding URL**:
```typescript
// Edge function per creare account link
const accountLink = await stripe.accountLinks.create({
  account: hostStripeAccountId,
  refresh_url: 'https://yourdomain.com/host/stripe/refresh',
  return_url: 'https://yourdomain.com/host/stripe/return',
  type: 'account_onboarding',
});
```

### Step 4: Webhooks

**Crea Webhook**:
1. Developers > Webhooks
2. **Add endpoint**: `https://yourdomain.com/stripe-webhook`
3. **Events da ascoltare**:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `account.updated` (Connect)

**Webhook Secret**:
- Copia `whsec_xxx`
- Aggiungi a env: `STRIPE_WEBHOOK_SECRET`

**Validazione Webhook**:
```typescript
const sig = request.headers.get('stripe-signature');
const event = stripe.webhooks.constructEvent(
  body,
  sig,
  process.env.STRIPE_WEBHOOK_SECRET
);
```

### Step 5: Products & Prices

**Service Fee Product**:
```typescript
const product = await stripe.products.create({
  name: 'SpaceShare Service Fee',
  description: 'Platform commission (10%)',
});

const price = await stripe.prices.create({
  product: product.id,
  unit_amount: 1000, // $10.00
  currency: 'eur',
});
```

### Step 6: Test in Production

**Test Mode**:
- Usa test keys inizialmente
- Carte di test: `4242 4242 4242 4242`

**Go Live**:
1. Sostituisci con live keys
2. Testa con piccolo importo reale
3. Verifica webhook funzionanti

---

## 🌐 DNS Configuration

### Configurazione DNS per Custom Domain

**A Records** (Lovable/Netlify):
```
Type: A
Name: @
Value: [IP fornito da provider]
TTL: 3600
```

**CNAME Records**:
```
Type: CNAME
Name: www
Value: your-app.lovable.app
TTL: 3600
```

### SSL Certificate

- **Lovable**: Automatico (Let's Encrypt)
- **Netlify**: Automatico
- **Vercel**: Automatico
- **Custom**: Use Cloudflare (gratis)

### Propagazione

- Tempo: 24-48 ore
- Check: `dig yourdomain.com`
- Tool: https://dnschecker.org

---

## 📊 Monitoring & Logging

### Sentry (Error Tracking)

**Setup**:
```bash
npm install @sentry/react @sentry/tracing
```

**Configuration**:
```typescript
// src/main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  tracesSampleRate: 1.0,
});
```

### PostHog (Product Analytics)

**Setup**:
```typescript
import posthog from 'posthog-js';

posthog.init(
  import.meta.env.VITE_POSTHOG_KEY,
  {
    api_host: import.meta.env.VITE_POSTHOG_HOST,
  }
);
```

**Track Events**:
```typescript
posthog.capture('booking_created', {
  space_id: spaceId,
  amount: totalPrice,
});
```

### Supabase Logs

**Access Logs**:
1. Dashboard > Logs
2. Filtra per tipo:
   - API Logs
   - Database Logs
   - Auth Logs
   - Realtime Logs

**Edge Function Logs**:
```bash
npx supabase functions logs stripe-webhook
```

---

## 🔒 Security Checklist

### Pre-Deploy

- [ ] RLS abilitato su tutte le tabelle
- [ ] Policies testate per ogni ruolo
- [ ] HTTPS forzato (redirect HTTP → HTTPS)
- [ ] API keys in env variables (mai in codice)
- [ ] CORS configurato correttamente
- [ ] Rate limiting attivo
- [ ] Input validation su tutti i form
- [ ] SQL injection protetta (Supabase client)
- [ ] XSS protetta (React escape automatico)

### Post-Deploy

- [ ] SSL certificate valido
- [ ] Security headers configurati
- [ ] Database backup automatici attivi
- [ ] Monitoring errori attivo
- [ ] Alerts configurati per downtime

### Headers Sicurezza

**netlify.toml** / **vercel.json**:
```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com;"
```

---

## 🧪 Testing Pre-Deploy

### Testing Checklist

**Funzionalità Core**:
- [ ] Registrazione e login
- [ ] Ricerca spazi
- [ ] Creazione prenotazione
- [ ] Pagamento Stripe
- [ ] Notifiche email
- [ ] Upload immagini
- [ ] Messaggistica
- [ ] Recensioni

**Performance**:
- [ ] Lighthouse score > 90
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3.5s

**Browser Testing**:
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge
- [ ] Mobile browsers

**Device Testing**:
- [ ] Desktop (1920x1080)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

---

## 🚨 Rollback Procedure

### Lovable

1. Deploy History
2. Click su versione precedente
3. **Rollback** → Instant

### Netlify/Vercel

1. Deployments
2. Seleziona deploy precedente
3. **Publish deploy** → Rollback

### Database

⚠️ **Database rollback più complesso**

**Opzione A - Point-in-time Recovery**:
1. Supabase Dashboard > Database > Backups
2. Restore to specific timestamp

**Opzione B - Migration Reverse**:
```bash
npx supabase db reset --db-url "postgres://..."
```

---

## 📈 Post-Deploy Tasks

### Day 1

- [ ] Verifica tutti gli endpoints funzionanti
- [ ] Test pagamento reale (piccolo importo)
- [ ] Monitora logs per errori
- [ ] Check analytics tracciati
- [ ] Notifica utenti beta (se applicabile)

### Week 1

- [ ] Analizza metriche performance
- [ ] Verifica email delivery rate
- [ ] Check Stripe payouts
- [ ] Review error rate Sentry
- [ ] Feedback users

### Month 1

- [ ] Review database growth
- [ ] Ottimizza query lente
- [ ] Scale resources se necessario
- [ ] A/B testing funzionalità
- [ ] Report stakeholders

---

## 🛠️ Troubleshooting Deploy

### Build Fails

**Error: "Module not found"**:
```bash
# Pulisci cache
rm -rf node_modules
npm ci
npm run build
```

**TypeScript errors**:
```bash
# Check types
npm run type-check
```

### Deploy Success ma App Non Funziona

**Check 1 - Environment Variables**:
- Verifica tutte le var sono impostate
- Restart deploy dopo aggiunta var

**Check 2 - API Endpoints**:
- Verifica Supabase URL corretto
- Test API key con `curl`

**Check 3 - CORS**:
- Aggiungi dominio a Supabase allowed origins
- Authentication > URL Configuration

### Pagamenti Non Funzionano

**Check 1 - Webhook**:
```bash
stripe listen --forward-to localhost:3000/webhook
```

**Check 2 - Keys**:
- Verifica live keys (non test)
- Check secret key nel backend

**Check 3 - Connect**:
- Verifica host hanno completato onboarding
- Check account status in Stripe

---

## 📞 Support

**Problemi Deploy**:
- Lovable Support: support@lovable.dev
- Netlify Support: support.netlify.com
- Vercel Support: vercel.com/support

**Problemi Supabase**:
- Support: support.supabase.com
- Discord: discord.supabase.com

**Problemi Stripe**:
- Support: support.stripe.com
- Discord: discord.gg/stripe

---

## 🎉 Congratulazioni!

La tua app SpaceShare è ora in produzione! 🚀

**Next Steps**:
1. Marketing e acquisizione utenti
2. Monitoraggio continuo performance
3. Iterazione basata su feedback
4. Scale infrastructure quando necessario

**Buon lancio! 🎊**
