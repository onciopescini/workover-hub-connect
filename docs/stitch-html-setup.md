# Setup File HTML Stitch

## 📋 File Richiesti

Crea/popola la cartella `stitch_html/` alla radice del repo con i seguenti file:

1. **workover_landing_page.html** - Landing page hero + features + search
2. **why_workover_section.html** - Sezione "Perché WorkOver" (4 feature cards)
3. **workover_spaces_catalog.html** - Catalogo spazi (header + breadcrumb + filtri + grid)
4. **space_detail_and_booking_flow.html** - Dettaglio spazio + hero + booking calculator
5. **coworker_experience.html** - Esperienza coworker (opzionale, per insights)
6. **host_dashboard.html** - Dashboard host (KPI cards + charts + spaces list)
7. **centro_messaggi.html** - Centro messaggi (2-col layout: conversations + chat)
8. **area_admin_and_compliance.html** - Area admin (DAC7 + moderazione + verifiche)
9. **observability_and_sre.html** - Observability showcase (opzionale, metrics display)

---

## 📦 Estrazione da ZIP

Se hai lo ZIP `stitch_workover_landing_page.zip` fornito da Stitch:

```bash
# Estrai tutto
unzip stitch_workover_landing_page.zip -d /tmp/stitch_extracted

# Crea cartella nel repo
mkdir -p stitch_html

# Copia/rinomina i file code.html
cp /tmp/stitch_extracted/workover_landing_page/code.html stitch_html/workover_landing_page.html
cp /tmp/stitch_extracted/why_workover_section/code.html stitch_html/why_workover_section.html
cp /tmp/stitch_extracted/workover_spaces_catalog/code.html stitch_html/workover_spaces_catalog.html
cp /tmp/stitch_extracted/space_detail_and_booking_flow/code.html stitch_html/space_detail_and_booking_flow.html
cp /tmp/stitch_extracted/coworker_experience/code.html stitch_html/coworker_experience.html
cp /tmp/stitch_extracted/host_dashboard/code.html stitch_html/host_dashboard.html
cp /tmp/stitch_extracted/centro_messaggi/code.html stitch_html/centro_messaggi.html
cp /tmp/stitch_extracted/area_admin_and_compliance/code.html stitch_html/area_admin_and_compliance.html
cp /tmp/stitch_extracted/observability_and_sre/code.html stitch_html/observability_and_sre.html

# Verifica
ls -lh stitch_html/
```

---

## 🔧 Esecuzione Estrazione Token

### Prerequisiti

```bash
# Verifica ts-node installato (già presente in package.json)
pnpm list ts-node
```

### Estrazione Base (solo token CSS)

```bash
pnpm extract:stitch
```

**Output atteso**:
- ✅ `src/styles/tokens.css` aggiornato con valori reali
- ✅ `docs/ui-stitch-tokens.md` creato con tabella mapping
- ✅ `src/theme/tokens.generated.json` esportato

### Estrazione Completa (token + asset)

```bash
pnpm extract:stitch:assets
```

**Output aggiuntivo**:
- ✅ `public/assets/stitch/*.svg` (placeholder generati)
- ✅ Asset remoti scaricati (se URL validi)
- ✅ Mapping asset in `docs/ui-stitch-tokens.md`

---

## 📊 Cosa Viene Estratto

### Design Token

| Categoria | Pattern Estratti | Token Generati |
|-----------|------------------|----------------|
| **Colori** | `#hex`, `rgb()`, `rgba()`, `hsl()` | `--color-bg`, `--color-surface`, `--color-text`, `--color-muted`, `--color-brand`, `--color-accent`, `--color-success`, `--color-error` |
| **Font Family** | `font-family: ...` | `--font-display`, `--font-body` |
| **Font Size** | `font-size: ...` | `--font-size-hero`, `--font-size-h1/h2/h3`, `--font-size-body`, `--font-size-small` |
| **Border Radius** | `border-radius: ...` | `--radius-xl`, `--radius-lg`, `--radius-md` |
| **Box Shadow** | `box-shadow: ...` | `--shadow-card`, `--shadow-elevated`, `--shadow-glow` |
| **Spacing** | `padding`, `margin` | `--space-section`, `--space-card`, `--space-element` |

### Asset

| Tipo | Pattern | Output |
|------|---------|--------|
| **Immagini** | `<img src="...">` | `public/assets/stitch/*.{svg,png,webp}` |
| **Background** | `url(...)` | `public/assets/stitch/*.{svg,png,webp}` |
| **Placeholder** | Se asset non disponibile | SVG generato con dimensioni appropriate |

---

## 🎨 Placeholder SVG

Lo script genera automaticamente placeholder SVG con:

- **Hero/Background**: 1600×900px
- **Feature Images**: 1200×800px
- **Gallery/Thumbs**: 800×600px
- **Icons**: 64×64px

**Esempio placeholder**:
```svg
<svg width="1600" height="900">
  <rect fill="url(#gradient)"/>
  <text>[hero-illustration]</text>
  <text>1600×900 placeholder</text>
</svg>
```

---

## ✅ Verifica Post-Estrazione

### 1. Controllo Token CSS

```bash
# Verifica che i TODO siano stati sostituiti
grep "TODO" src/styles/tokens.css
# Output atteso: nessuna occorrenza (o solo commenti non critici)
```

### 2. Controllo Asset

```bash
# Conta asset generati
ls -1 public/assets/stitch/ | wc -l

# Verifica placeholder
file public/assets/stitch/*.svg
```

### 3. Controllo Documentazione

```bash
# Verifica mapping generato
head -n 30 docs/ui-stitch-tokens.md

# Verifica JSON export
jq '.[] | select(.frequency > 10)' src/theme/tokens.generated.json
```

### 4. Test Visivo

```bash
# Build senza errori
pnpm typecheck
pnpm build

# Test locale
pnpm dev
# Apri http://localhost:5173/?theme=stitch
```

---

## 🔄 Re-estrazione (dopo update HTML)

Se ricevi nuovi file HTML Stitch aggiornati:

```bash
# 1. Sostituisci i file in stitch_html/
cp /path/to/new/workover_landing_page.html stitch_html/

# 2. Riesegui estrazione
pnpm extract:stitch:assets

# 3. Verifica diff
git diff src/styles/tokens.css
git diff docs/ui-stitch-tokens.md

# 4. Commit se ok
git add src/styles/tokens.css docs/ui-stitch-tokens.md src/theme/tokens.generated.json public/assets/stitch/
git commit -m "chore: update Stitch tokens from latest HTML"
```

---

## 🐛 Troubleshooting

### Errore: "Directory stitch_html/ not found"

```bash
# Crea la cartella
mkdir -p stitch_html

# Aggiungi almeno un file HTML (anche vuoto per test)
touch stitch_html/workover_landing_page.html
```

### Errore: "No tokens extracted"

**Causa**: File HTML vuoti o senza stili inline.

**Soluzione**: Verifica che i file HTML contengano il markup completo di Stitch (non solo scheletri).

```bash
# Controlla dimensione file
du -h stitch_html/*.html
# Ogni file dovrebbe essere almeno 10-50KB
```

### Errore: "ts-node command not found"

**Soluzione**:

```bash
# Reinstalla dipendenze
pnpm install

# Alternativa: usa node diretto
pnpm tsc scripts/extractStitchTokens.ts --outDir scripts/
node scripts/extractStitchTokens.js
```

### Warning: "Asset download failed"

**Causa**: URL remoti non raggiungibili o HTTPS redirect.

**Effetto**: Verrà generato un placeholder SVG (previsto).

**Soluzione**: Sostituisci manualmente i placeholder in `public/assets/stitch/` con asset reali.

---

---

## 🔄 How to Rerun Extraction

Dopo aver aggiornato i file HTML in `stitch_html/`, riesegui l'estrazione:

### Solo Token (rapido)
```bash
pnpm extract:stitch
```

**Cosa aggiorna**:
- ✅ `src/styles/tokens.css`
- ✅ `docs/ui-stitch-tokens.md`
- ✅ `src/theme/tokens.generated.json`

### Token + Asset (completo)
```bash
pnpm extract:stitch:assets
```

**Cosa aggiorna**:
- ✅ Tutto quanto sopra
- ✅ `public/assets/stitch/*` (download + placeholder)

### Verifica Risultati
```bash
# Check diff
git diff src/styles/tokens.css docs/ui-stitch-tokens.md

# Test visivi
pnpm dev
# Apri http://localhost:5173/?theme=stitch

# Test E2E
pnpm test:e2e:stitch -- --update-snapshots
pnpm test:e2e:stitch
```

---

## ✅ Definition of Done

### Funzionale
- [ ] `pnpm extract:stitch` eseguito con successo
- [ ] `src/styles/tokens.css` senza TODO non risolti
- [ ] Tutti i wrapper Stitch usano `var(--token-name)` (no hex inline)
- [ ] `public/assets/stitch/` contiene asset o placeholder documentati
- [ ] `docs/ui-stitch-tokens.md` con tabella mapping completa

### Test
- [ ] `pnpm typecheck` → 0 errori
- [ ] `pnpm lint` → 0 warning critici
- [ ] `pnpm build` → success
- [ ] `pnpm test:e2e:stitch` → 5+ test verdi con snapshot

### Visual
- [ ] `VITE_UI_THEME=stitch` attiva tema su tutte le pagine
- [ ] `?theme=stitch` override funzionante
- [ ] Pagine testate: `/`, `/spaces`, `/spaces/:id`, `/messages`, `/host/dashboard`
- [ ] Classic theme invariato (regression test verde)

### Performance
- [ ] Bundle size delta < 50KB rispetto a classic
- [ ] Lazy loading wrapper non impatta TTI
- [ ] Nessun layout shift visibile (CLS < 0.1)

### Documentazione
- [ ] `docs/ui-stitch-tokens.md` con:
  - Tabella colori (valore → token → frequenza → file origine)
  - Tabella font (family, size)
  - Tabella radius/shadows
  - Lista asset (src → path locale → status)
- [ ] `docs/stitch-html-setup.md` con istruzioni complete
- [ ] `README.md` aggiornato con feature flag `VITE_UI_THEME`

---

## 📚 File di Riferimento

- **Script estrazione**: `scripts/extractStitchTokens.ts`
- **Output CSS**: `src/styles/tokens.css`
- **Documentazione mapping**: `docs/ui-stitch-tokens.md`
- **Export JSON**: `src/theme/tokens.generated.json`
- **Asset placeholder**: `public/assets/stitch/*.svg`

---

## 🎯 Prossimi Step

Dopo aver eseguito l'estrazione:

1. ✅ Verifica `docs/ui-stitch-tokens.md` per mapping completo
2. ✅ Sostituisci placeholder SVG con asset reali (opzionale)
3. ✅ Testa visivamente con `?theme=stitch` su `/`, `/spaces`, `/spaces/:id`
4. ✅ Esegui test E2E: `pnpm test:e2e`
5. ✅ Build production: `pnpm build`

---

## 💡 Note Importanti

- **Non committare** i file HTML originali di Stitch se contengono dati sensibili
- I **placeholder SVG sono ottimali** per development, sostituisci solo se necessario per production
- Lo script è **idempotente**: puoi rieseguirlo più volte senza side effect
- Il **mapping token è euristico**: verifica manualmente i colori principali

---

**Ultima revisione**: 2025-10-31
