
import React from 'react';
import { cn } from '@/lib/utils';

interface FloatingParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
}

interface AnimatedBackgroundProps {
  className?: string;
  particleCount?: number;
}

export function AnimatedBackground({ className, particleCount = 50 }: AnimatedBackgroundProps) {
  const [particles, setParticles] = React.useState<FloatingParticle[]>([]);

  React.useEffect(() => {
    const newParticles: FloatingParticle[] = Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      speed: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.5 + 0.1
    }));
    setParticles(newParticles);
  }, [particleCount]);

  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-emerald-50 to-purple-50 animate-pulse" />
      
      {/* Floating Particles */}
      <div className="absolute inset-0">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute rounded-full bg-gradient-to-r from-indigo-400 to-emerald-400 animate-pulse"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              opacity: particle.opacity,
              animation: `float ${particle.speed}s ease-in-out infinite alternate`,
            }}
          />
        ))}
      </div>
      
      {/* Animated Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
      
      <style jsx>{`
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          100% { transform: translateY(-20px) rotate(180deg); }
        }
      `}</style>
    </div>
  );
}
