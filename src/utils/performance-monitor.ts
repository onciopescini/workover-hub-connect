import { supabase } from "@/integrations/supabase/client";
import { sreLogger } from "@/lib/sre-logger";

/**
 * Fix 3.9: Frontend Performance Monitoring
 * Monitora performance di componenti e API calls
 */

export class PerformanceMonitor {
  private static SLOW_RENDER_THRESHOLD_MS = 100;
  private static SLOW_API_THRESHOLD_MS = 1000;

  /**
   * Misura il tempo di render di un componente React
   * @param componentName Nome del componente da monitorare
   * @returns Funzione cleanup da chiamare in useEffect return
   */
  static measureComponentRender(componentName: string) {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Log se render lento
      if (duration > this.SLOW_RENDER_THRESHOLD_MS) {
        sreLogger.warn('Slow component render detected', {
          component: componentName,
          duration_ms: Math.round(duration),
          action: 'performance_monitoring',
          threshold_ms: this.SLOW_RENDER_THRESHOLD_MS
        });
      }
      
      // Invia metriche a Supabase (fire and forget)
      this.sendMetric({
        metric_type: 'component_render',
        metric_value: duration,
        component_name: componentName,
      }).catch(err => {
        console.debug('[PERF_MONITOR] Failed to send component metric:', err);
      });
    };
  }

  /**
   * Misura il tempo di una chiamata API
   * @param endpoint URL o nome dell'endpoint
   * @param method HTTP method
   * @returns Oggetto con metodo end() da chiamare dopo la response
   */
  static measureAPICall(endpoint: string, method: string = 'GET') {
    const startTime = performance.now();
    
    return {
      end: (success: boolean, statusCode?: number) => {
        const duration = performance.now() - startTime;
        
        // Log se API lenta
        if (duration > this.SLOW_API_THRESHOLD_MS) {
          sreLogger.warn('Slow API call detected', {
            endpoint,
            method,
            duration_ms: Math.round(duration),
            success,
            status_code: statusCode,
            action: 'performance_monitoring',
            threshold_ms: this.SLOW_API_THRESHOLD_MS
          });
        }
        
        // Invia metriche a Supabase
        this.sendMetric({
          metric_type: 'api_call',
          metric_value: duration,
          endpoint: endpoint,
          metadata: {
            method,
            success,
            status_code: statusCode
          }
        }).catch(err => {
          console.debug('[PERF_MONITOR] Failed to send API metric:', err);
        });
      }
    };
  }

  /**
   * Misura il tempo di caricamento di una pagina
   * @param pageName Nome della pagina
   */
  static measurePageLoad(pageName: string) {
    // Usa Navigation Timing API se disponibile
    if (typeof window !== 'undefined' && window.performance?.timing) {
      const timing = window.performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      
      if (loadTime > 0) {
        this.sendMetric({
          metric_type: 'page_load',
          metric_value: loadTime,
          page_name: pageName,
        }).catch(err => {
          console.debug('[PERF_MONITOR] Failed to send page load metric:', err);
        });
      }
    }
  }

  /**
   * Invia metrica al database Supabase
   */
  private static async sendMetric(data: {
    metric_type: string;
    metric_value: number;
    component_name?: string;
    page_name?: string;
    endpoint?: string;
    metadata?: Record<string, any>;
  }) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from('performance_metrics').insert({
        ...data,
        user_id: user?.id || null,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      // Silent fail - non bloccare l'app per metriche
      console.debug('[PERF_MONITOR] Metric send failed (non-critical):', error);
    }
  }

  /**
   * Monitora le Core Web Vitals (LCP, INP, CLS)
   */
  static monitorWebVitals() {
    if (typeof window === 'undefined') return;

    // Lazy load web-vitals library se disponibile
    import('web-vitals').then(({ onLCP, onINP, onCLS }) => {
      onLCP((metric: any) => {
        this.sendMetric({
          metric_type: 'web_vital_lcp',
          metric_value: metric.value,
          metadata: { rating: metric.rating }
        });
      });

      onINP((metric: any) => {
        this.sendMetric({
          metric_type: 'web_vital_inp',
          metric_value: metric.value,
          metadata: { rating: metric.rating }
        });
      });

      onCLS((metric: any) => {
        this.sendMetric({
          metric_type: 'web_vital_cls',
          metric_value: metric.value,
          metadata: { rating: metric.rating }
        });
      });
    }).catch(err => {
      console.debug('[PERF_MONITOR] Web vitals monitoring not available:', err);
    });
  }
}

// Auto-start web vitals monitoring
if (typeof window !== 'undefined') {
  PerformanceMonitor.monitorWebVitals();
}