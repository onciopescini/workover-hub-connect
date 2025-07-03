import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, ArrowLeft, ArrowRight, Target } from "lucide-react";

interface TourStep {
  id: string;
  title: string;
  content: string;
  target: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface GuidedTourProps {
  steps: TourStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  tourId: string;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({
  steps,
  isOpen,
  onClose,
  onComplete,
  tourId
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetPosition, setTargetPosition] = useState({ top: 0, left: 0, width: 0, height: 0 });

  useEffect(() => {
    if (isOpen && steps[currentStep]) {
      updateTargetPosition();
    }
  }, [isOpen, currentStep, steps]);

  useEffect(() => {
    const handleResize = () => {
      if (isOpen) updateTargetPosition();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  const updateTargetPosition = () => {
    const step = steps[currentStep];
    if (!step) return;

    const element = document.querySelector(step.target);
    if (element) {
      const rect = element.getBoundingClientRect();
      setTargetPosition({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height
      });
      
      // Scroll to element if needed
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    // Mark tour as completed in localStorage
    localStorage.setItem(`tour_completed_${tourId}`, 'true');
    onComplete?.();
    onClose();
  };

  const getTooltipPosition = () => {
    const step = steps[currentStep];
    if (!step) return {};

    const margin = 16;
    let style: React.CSSProperties = {
      position: 'absolute',
      zIndex: 9999,
    };

    switch (step.position) {
      case 'top':
        style.top = targetPosition.top - margin;
        style.left = targetPosition.left + (targetPosition.width / 2);
        style.transform = 'translate(-50%, -100%)';
        break;
      case 'bottom':
        style.top = targetPosition.top + targetPosition.height + margin;
        style.left = targetPosition.left + (targetPosition.width / 2);
        style.transform = 'translateX(-50%)';
        break;
      case 'left':
        style.top = targetPosition.top + (targetPosition.height / 2);
        style.left = targetPosition.left - margin;
        style.transform = 'translate(-100%, -50%)';
        break;
      case 'right':
        style.top = targetPosition.top + (targetPosition.height / 2);
        style.left = targetPosition.left + targetPosition.width + margin;
        style.transform = 'translateY(-50%)';
        break;
    }

    return style;
  };

  if (!isOpen || !steps[currentStep]) return null;

  const currentStepData = steps[currentStep];

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-[9998]" onClick={onClose} />
      
      {/* Highlight target element */}
      <div
        className="fixed border-4 border-primary rounded-lg pointer-events-none z-[9998]"
        style={{
          top: targetPosition.top - 4,
          left: targetPosition.left - 4,
          width: targetPosition.width + 8,
          height: targetPosition.height + 8,
        }}
      />

      {/* Tooltip */}
      <Card className="w-80 shadow-xl z-[9999]" style={getTooltipPosition()}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-primary" />
              <Badge variant="secondary" className="text-xs">
                {currentStep + 1} di {steps.length}
              </Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-lg">{currentStepData.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {currentStepData.content}
            </p>

            {currentStepData.action && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={currentStepData.action.onClick}
              >
                {currentStepData.action.label}
              </Button>
            )}

            <div className="flex justify-between items-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevious}
                disabled={currentStep === 0}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Indietro
              </Button>

              <div className="flex space-x-2">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full ${
                      index === currentStep ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>

              <Button size="sm" onClick={handleNext}>
                {currentStep === steps.length - 1 ? 'Completa' : 'Avanti'}
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};