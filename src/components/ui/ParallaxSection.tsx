
import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface ParallaxSectionProps {
  children: React.ReactNode;
  className?: string;
  speed?: number;
  direction?: 'up' | 'down';
}

export function ParallaxSection({ 
  children, 
  className, 
  speed = 0.5,
  direction = 'up'
}: ParallaxSectionProps) {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const transform = direction === 'up' 
    ? `translateY(${scrollY * speed}px)`
    : `translateY(${-scrollY * speed}px)`;

  return (
    <div 
      className={cn("relative", className)}
      style={{ transform }}
    >
      {children}
    </div>
  );
}
