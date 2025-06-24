
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface InteractiveCardProps {
  children: React.ReactNode;
  className?: string;
  hoverScale?: boolean;
  tiltEffect?: boolean;
  glowEffect?: boolean;
}

export function InteractiveCard({ 
  children, 
  className,
  hoverScale = true,
  tiltEffect = true,
  glowEffect = false
}: InteractiveCardProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePosition({ x, y });
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setMousePosition({ x: 0, y: 0 });
  };

  const tiltTransform = tiltEffect && isHovered 
    ? `perspective(1000px) rotateX(${(mousePosition.y - 150) * 0.1}deg) rotateY(${(mousePosition.x - 150) * 0.1}deg)`
    : 'perspective(1000px) rotateX(0deg) rotateY(0deg)';

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300 cursor-pointer",
        hoverScale && "hover:scale-105",
        glowEffect && isHovered && "shadow-2xl shadow-indigo-500/25",
        className
      )}
      style={{
        transform: tiltTransform,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {glowEffect && isHovered && (
        <div 
          className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-emerald-500/20 opacity-0 hover:opacity-100 transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(99, 102, 241, 0.3) 0%, transparent 50%)`
          }}
        />
      )}
      <CardContent className="relative z-10">
        {children}
      </CardContent>
    </Card>
  );
}
