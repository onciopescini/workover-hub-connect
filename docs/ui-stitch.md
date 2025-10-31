# UI Stitch Theme - Documentazione

## Attivazione

### Development
```bash
# .env.local
VITE_UI_THEME=stitch
```

### Testing (query param)
```
http://localhost:3000/?theme=stitch
```

## Token Extraction Guide

### Step 1: Apri i file HTML Stitch
- `stitch_workover_landing_page/workover_landing_page/code.html`
- Cerca inline styles: `style="background: #0a0e17;"` → estrai hex
- Cerca font: `<link href="...">`

### Step 2: Aggiorna tokens.css
Sostituisci i placeholder `/* TODO: extract */` con i valori reali.

### Step 3: Asset Migration
Sposta immagini/icone in `public/assets/stitch/` e aggiorna path nei wrapper.

## File Map

| File | Responsabilità |
|------|----------------|
| `src/styles/tokens.css` | CSS vars Stitch |
| `src/providers/UIThemeProvider.tsx` | Feature flag logic |
| `src/feature/landing/LandingHeroStitch.tsx` | Hero wrapper |
| `src/feature/spaces/CatalogHeaderStitch.tsx` | Catalog header |
| `src/feature/spaces/CatalogFiltersStitch.tsx` | Filters bar wrapper |
| `src/feature/spaces/SpaceHeroStitch.tsx` | Space detail hero |
| `src/feature/spaces/BookingStepsStitch.tsx` | Booking layout |
| `src/feature/messaging/ThreadsLayoutStitch.tsx` | Messages 2-col |
| `src/feature/host/HostDashboardLayoutStitch.tsx` | Host dashboard |
| `src/feature/admin/AdminOverviewStitch.tsx` | Admin overview |
| `src/feature/ops/ObservabilityShowcaseStitch.tsx` | SRE showcase |

## Wrapper Pattern

```tsx
// Wrapper presentazionale (solo skin)
export default function MyStitch({ children }: PropsWithChildren) {
  return (
    <section className="bg-stitch-bg text-stitch-text">
      <div className="container mx-auto px-4 py-stitch-section">
        {/* Layout Stitch */}
        {children /* Componenti funzionali esistenti */}
      </div>
    </section>
  );
}
```

## Testing

```bash
# Visual regression
pnpm test:e2e -- ui-stitch.spec.ts

# Update snapshots
pnpm test:e2e -- ui-stitch.spec.ts --update-snapshots
```

## Performance Checklist

- [ ] Lighthouse LCP < 2.5s (landing)
- [ ] CLS < 0.1
- [ ] INP < 200ms
- [ ] Bundle size delta < 50KB

## Critical Rules

1. **NO logic changes**: Props/types/hooks/RLS/Edge Functions invariati
2. **NO inline hex**: Usa solo CSS vars tramite classi Tailwind
3. **NO duplicate filters**: PublicSpacesContent già compone filtri
4. **NO MapboxTokenProvider touch**: Provider mappa intatto
5. **YES lazy wrappers**: Tutti i Stitch* wrapper sono lazy-loaded
6. **YES children pattern**: Wrapper = skin, children = logica esistente
7. **YES flag guard**: Ogni switch usa `import.meta.env.VITE_UI_THEME === 'stitch'`
