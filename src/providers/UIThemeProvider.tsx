import { PropsWithChildren, useEffect } from "react";

/**
 * UIThemeProvider
 * 
 * Gestisce il tema UI via feature flag VITE_UI_THEME=stitch
 * Supporta anche query param ?theme=stitch per testing
 */
export function UIThemeProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    // Check query param first (per E2E test)
    const params = new URLSearchParams(window.location.search);
    const qpTheme = params.get("theme");
    const forceStitch = qpTheme === "stitch";

    // Check env var
    const envTheme = import.meta.env['VITE_UI_THEME'];
    const isStitch = forceStitch || envTheme === "stitch";

    const html = document.documentElement;
    if (isStitch) {
      html.setAttribute("data-theme", "stitch");
    } else {
      html.removeAttribute("data-theme");
    }

    console.log(`[UIThemeProvider] Theme active: ${isStitch ? 'stitch' : 'classic'}`);
  }, []);

  return children as JSX.Element;
}

export default UIThemeProvider;
