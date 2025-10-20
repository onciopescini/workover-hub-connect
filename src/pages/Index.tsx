
import React, { lazy, Suspense } from 'react';
import { AnimatedHeroSection } from '@/components/landing/AnimatedHeroSection';
import { BetaNotice } from '@/components/beta/BetaNotice';

// Lazy load below-the-fold sections for better LCP
const InteractiveFeaturesSection = lazy(() => 
  import('@/components/landing/InteractiveFeaturesSection').then(m => ({ default: m.InteractiveFeaturesSection }))
);
const VisualWorkflowSection = lazy(() => 
  import('@/components/landing/VisualWorkflowSection').then(m => ({ default: m.VisualWorkflowSection }))
);
const SpacesGallerySection = lazy(() => 
  import('@/components/landing/SpacesGallerySection').then(m => ({ default: m.SpacesGallerySection }))
);
const InnovativeCTASection = lazy(() => 
  import('@/components/landing/InnovativeCTASection').then(m => ({ default: m.InnovativeCTASection }))
);

const Index = () => {
  return (
    <>
      <div className="container mx-auto px-4 pt-6">
        <BetaNotice />
      </div>
      <AnimatedHeroSection />
      <Suspense fallback={<div className="min-h-screen" />}>
        <InteractiveFeaturesSection />
        <VisualWorkflowSection />
        <SpacesGallerySection />
        <InnovativeCTASection />
      </Suspense>
    </>
  );
};

export default Index;
