
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

// Lazy load Stitch wrappers
const LandingHeroStitch = lazy(() => import('@/feature/landing/LandingHeroStitch'));
const WhyWorkOverStitch = lazy(() => import('@/feature/landing/WhyWorkOverStitch'));
const SpacesGalleryStitch = lazy(() => import('@/feature/landing/SpacesGalleryStitch'));
const VisualWorkflowStitch = lazy(() => import('@/feature/landing/VisualWorkflowStitch'));
const InnovativeCTAStitch = lazy(() => import('@/feature/landing/InnovativeCTAStitch'));

const Index = () => {
  const isStitch = import.meta.env.VITE_UI_THEME === 'stitch';

  return (
    <>
      <div className="container mx-auto px-4 pt-6">
        <BetaNotice />
      </div>

      {isStitch ? (
        <Suspense fallback={<div className="min-h-screen" />}>
          <LandingHeroStitch>
            <AnimatedHeroSection />
          </LandingHeroStitch>
          <WhyWorkOverStitch />
          <SpacesGalleryStitch>
            <SpacesGallerySection />
          </SpacesGalleryStitch>
          <VisualWorkflowStitch>
            <VisualWorkflowSection />
          </VisualWorkflowStitch>
          <InnovativeCTAStitch>
            <InnovativeCTASection />
          </InnovativeCTAStitch>
        </Suspense>
      ) : (
        <>
          <AnimatedHeroSection />
          <Suspense fallback={<div className="min-h-screen" />}>
            <InteractiveFeaturesSection />
            <VisualWorkflowSection />
            <SpacesGallerySection />
            <InnovativeCTASection />
          </Suspense>
        </>
      )}
    </>
  );
};

export default Index;
