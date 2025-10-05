import { useEffect, useRef, useState, RefObject } from 'react';

interface IntersectionObserverOptions {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
  freezeOnceVisible?: boolean;
}

/**
 * Hook per Intersection Observer
 * Utile per lazy loading immagini, infinite scroll, animazioni on-scroll
 */
export function useIntersectionObserver<T extends HTMLElement = HTMLDivElement>(
  options: IntersectionObserverOptions = {}
): [RefObject<T>, boolean, IntersectionObserverEntry | null] {
  const {
    threshold = 0,
    root = null,
    rootMargin = '0px',
    freezeOnceVisible = false,
  } = options;

  const elementRef = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Se già visibile e freeze è attivo, non fare nulla
    if (freezeOnceVisible && isVisible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        
        const isIntersecting = entry.isIntersecting;
        setIsVisible(isIntersecting);
        setEntry(entry);

        // Se freeze è attivo e diventa visibile, disconnetti observer
        if (freezeOnceVisible && isIntersecting && observer) {
          observer.disconnect();
        }
      },
      { threshold, root, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold, root, rootMargin, freezeOnceVisible, isVisible]);

  return [elementRef, isVisible, entry];
}

/**
 * Hook semplificato per lazy loading immagini
 */
export function useLazyImage(src: string): [RefObject<HTMLImageElement>, string | null] {
  const [imgRef, isVisible] = useIntersectionObserver<HTMLImageElement>({
    threshold: 0.01,
    freezeOnceVisible: true,
    rootMargin: '100px', // Preload 100px prima che entri in viewport
  });

  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);

  useEffect(() => {
    if (isVisible && !loadedSrc) {
      setLoadedSrc(src);
    }
  }, [isVisible, src, loadedSrc]);

  return [imgRef, loadedSrc];
}

/**
 * Hook per animazioni triggered da scroll
 */
export function useScrollAnimation<T extends HTMLElement = HTMLDivElement>(
  options: IntersectionObserverOptions = {}
): [RefObject<T>, boolean] {
  const [ref, isVisible] = useIntersectionObserver<T>({
    threshold: 0.2,
    freezeOnceVisible: true,
    ...options,
  });

  return [ref, isVisible];
}

/**
 * Hook per infinite scroll
 */
export function useInfiniteScroll<T extends HTMLElement = HTMLDivElement>(
  onLoadMore: () => void,
  options: IntersectionObserverOptions & { disabled?: boolean } = {}
): RefObject<T> {
  const { disabled = false, ...observerOptions } = options;
  
  const [ref, isVisible] = useIntersectionObserver<T>({
    threshold: 0,
    rootMargin: '100px',
    ...observerOptions,
  });

  useEffect(() => {
    if (isVisible && !disabled) {
      onLoadMore();
    }
  }, [isVisible, disabled, onLoadMore]);

  return ref;
}

/**
 * Esempio di utilizzo LazyImage:
 * 
 * ```tsx
 * import { useLazyImage } from '@/hooks/useIntersectionObserver';
 * 
 * const [imgRef, loadedSrc] = useLazyImage(imageSrc);
 * 
 * <img
 *   ref={imgRef}
 *   src={loadedSrc || placeholderSrc}
 *   alt="description"
 *   className="transition-opacity"
 * />
 * ```
 */
