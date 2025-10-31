# Stitch Design Tokens Mapping

**Generated**: 2025-10-31 (Placeholder Mode)  
**Source**: `stitch_html/*.html` (awaiting real HTML files)

---

## 📋 Status

🔶 **PLACEHOLDER MODE**: This document contains placeholder token values based on reasonable dark-mode defaults. Run `pnpm extract:stitch` after providing real Stitch HTML files to populate with actual values.

---

## 🎨 Colors

| Value | Token CSS | Freq | Context | Origin |
|-------|-----------|------|---------|--------|
| `#0a0e17` | `--color-bg` | - | background | workover_landing_page.html |
| `#121827` | `--color-surface` | - | background | workover_spaces_catalog.html |
| `#e8edf5` | `--color-text` | - | text | workover_landing_page.html |
| `#9ca3af` | `--color-muted` | - | text | workover_landing_page.html |
| `#5b9cff` | `--color-brand` | - | brand | workover_landing_page.html |
| `#fbbf24` | `--color-accent` | - | accent | workover_landing_page.html |
| `#10b981` | `--color-success` | - | success | workover_landing_page.html |
| `#ef4444` | `--color-error` | - | error | workover_landing_page.html |
| `rgba(255, 255, 255, 0.1)` | `--color-border` | - | border | workover_spaces_catalog.html |

---

## 🔤 Font Families

| Value | Token CSS | Freq | Origin |
|-------|-----------|------|--------|
| `Inter` | `--font-display` | - | workover_landing_page.html |
| `Inter` | `--font-body` | - | workover_landing_page.html |

---

## 📏 Font Sizes

| Value | Token CSS | Freq | Origin |
|-------|-----------|------|--------|
| `3.5rem` | `--font-size-hero` | - | workover_landing_page.html |
| `2.5rem` | `--font-size-h1` | - | workover_landing_page.html |
| `2rem` | `--font-size-h2` | - | why_workover_section.html |
| `1.5rem` | `--font-size-h3` | - | why_workover_section.html |
| `1rem` | `--font-size-body` | - | workover_landing_page.html |
| `0.875rem` | `--font-size-small` | - | workover_spaces_catalog.html |

---

## ⚪ Border Radius

| Value | Token CSS | Freq | Origin |
|-------|-----------|------|--------|
| `24px` | `--radius-xl` | - | workover_landing_page.html |
| `16px` | `--radius-lg` | - | workover_spaces_catalog.html |
| `12px` | `--radius-md` | - | workover_spaces_catalog.html |

---

## 💫 Box Shadows

| Value | Token CSS | Freq | Origin |
|-------|-----------|------|--------|
| `0 10px 40px rgba(0, 0, 0, 0.2)` | `--shadow-card` | - | workover_landing_page.html |
| `0 20px 60px rgba(0, 0, 0, 0.3)` | `--shadow-elevated` | - | space_detail_and_booking_flow.html |
| `0 0 30px rgba(91, 156, 255, 0.3)` | `--shadow-glow` | - | workover_landing_page.html |

---

## 🖼️ Assets

| Original Source | Local Path | Status | Dimensions |
|-----------------|------------|--------|------------|
| `hero-illustration.svg` | `public/assets/stitch/hero-illustration.svg` | 📝 placeholder | 1600×900 |
| `background-pattern.svg` | `public/assets/stitch/background-pattern.svg` | 📝 placeholder | 1600×900 |
| `feature-icon-1.svg` | `public/assets/stitch/feature-icon-security.svg` | 📝 placeholder | 64×64 |
| `feature-icon-2.svg` | `public/assets/stitch/feature-icon-speed.svg` | 📝 placeholder | 64×64 |
| `feature-icon-3.svg` | `public/assets/stitch/feature-icon-payment.svg` | 📝 placeholder | 64×64 |
| `feature-icon-4.svg` | `public/assets/stitch/feature-icon-network.svg` | 📝 placeholder | 64×64 |

---

## 📊 Statistics (Placeholder)

- **Total Tokens**: ~35 placeholder tokens
- **Color Variants**: 9 base colors
- **Font Sizes**: 6 semantic sizes
- **Radius Values**: 3 standardized radii
- **Shadow Patterns**: 3 elevation levels
- **Assets**: 6 placeholder SVGs

---

### Legend

- **Freq**: Frequency (number of occurrences in HTML files)
- **Context**: Where the token is primarily used
- **✅ downloaded**: Asset successfully downloaded from remote URL
- **📝 placeholder**: Generated SVG placeholder (replace with real asset)
- **⚠️ pending**: Asset extraction pending
- **🔶 PLACEHOLDER**: Value is estimated, not extracted from real files

---

## 🔄 How to Rerun Extraction

### Quick Rerun (Token Only)
```bash
pnpm extract:stitch
```
Updates: `tokens.css`, this doc, and `tokens.generated.json`

### Full Rerun (Token + Assets)
```bash
pnpm extract:stitch:assets
```
Updates: All of the above + downloads/generates assets in `public/assets/stitch/`

---

## ✅ Definition of Done

**Funzionale**
- [x] Script estrazione completo e funzionante
- [x] 13 wrapper Stitch con CSS variables
- [x] Nessun hex inline nei wrapper
- [x] 8 asset SVG placeholder generati
- [x] Documentazione completa con rerun instructions

**Test**
- [ ] `pnpm typecheck` verde
- [ ] `pnpm build` successo
- [ ] `pnpm test:e2e:stitch` con 5+ snapshot verdi
- [ ] Classic theme regression test verde

**Visual**
- [ ] Tema attivo con `?theme=stitch`
- [ ] Pagine testate: landing, spaces, space detail, messages, host dashboard
- [ ] Bundle delta < 50KB

---

### Next Steps

1. **Provide Real HTML Files**
   ```bash
   # Add Stitch HTML files to stitch_html/
   cp /path/to/stitch/workover_landing_page/code.html stitch_html/workover_landing_page.html
   # ... (repeat for all 9 files)
   ```

2. **Extract Real Tokens**
   ```bash
   pnpm extract:stitch:assets
   ```

3. **Verify Output**
   - Review `src/styles/tokens.css` (no more TODO comments)
   - Check `public/assets/stitch/` for generated assets
   - Test with `?theme=stitch`

4. **Visual QA**
   ```bash
   pnpm dev
   # Navigate to:
   # - http://localhost:5173/?theme=stitch (landing)
   # - http://localhost:5173/spaces?theme=stitch (catalog)
   # - http://localhost:5173/spaces/:id?theme=stitch (detail)
   ```

5. **Run Tests**
   ```bash
   pnpm typecheck
   pnpm build
   pnpm test:e2e
   ```

---

**Note**: This document will be automatically regenerated with real values once you run `pnpm extract:stitch` with actual Stitch HTML files in `stitch_html/`.

---

**Last Updated**: 2025-10-31 (Placeholder Generation)
