
import React from 'react';
import { AnimatedHeroSection } from '@/components/landing/AnimatedHeroSection';
import { InteractiveFeaturesSection } from '@/components/landing/InteractiveFeaturesSection';
import { VisualWorkflowSection } from '@/components/landing/VisualWorkflowSection';
import { SpacesGallerySection } from '@/components/landing/SpacesGallerySection';
import { InnovativeCTASection } from '@/components/landing/InnovativeCTASection';

const Index = () => {
  return (
    <>
      <AnimatedHeroSection />
      <InteractiveFeaturesSection />
      <VisualWorkflowSection />
      <SpacesGallerySection />
      <InnovativeCTASection />
    </>
  );
};

export default Index;
