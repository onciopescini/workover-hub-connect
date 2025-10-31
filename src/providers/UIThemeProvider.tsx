import { PropsWithChildren, useEffect } from "react";

/**
 * UIThemeProvider
 * 
 * Gestisce il tema UI via feature flag VITE_UI_THEME=stitch
 * Supporta anche query param ?theme=stitch per testing
 */
export default function UIThemeProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    const qp = new URLSearchParams(window.location.search).get("theme");
    const isStitch = qp === "stitch" || import.meta.env.VITE_UI_THEME === "stitch";
    
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


