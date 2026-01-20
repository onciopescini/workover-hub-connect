import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Circle, Star, Trophy, Target, Zap } from "lucide-react";
import { useAuth } from "@/hooks/auth/useAuth";
import { useNavigate } from "react-router-dom";
import { useHostProgress } from "@/hooks/useHostProgress";

interface ProgressStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
  action?: () => void;
  actionLabel?: string;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  achieved: boolean;
  progress: number;
  target: number;
  reward?: string;
}

export const HostProgressTracker: React.FC = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const { data: progressData, isLoading } = useHostProgress({
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000 // 30 seconds to ensure we get fresh data after webhook updates
  });

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-32 bg-muted rounded"></div>
      <div className="h-64 bg-muted rounded"></div>
    </div>;
  }

  const steps: ProgressStep[] = [
    {
      id: 'profile',
      title: 'Profilo Completo',
      description: 'Completa tutte le informazioni del profilo',
      completed: progressData?.profileComplete ?? false,
      required: true,
      action: () => navigate('/profile/edit'),
      actionLabel: 'Completa Profilo'
    },
    {
      id: 'first_space',
      title: 'Primo Spazio',
      description: 'Pubblica il tuo primo spazio',
      completed: (progressData?.publishedSpacesCount ?? 0) > 0,
      required: true,
      action: () => navigate('/host/space/new'),
      actionLabel: 'Crea Spazio'
    },
    {
      id: 'stripe',
      title: 'Metodo di Accredito',
      description: 'Collega il tuo conto per ricevere i pagamenti',
      completed: progressData?.stripeConnected ?? false,
      required: true,
      action: () => navigate('/host/dashboard'),
      actionLabel: 'Collega Conto'
    }
  ];

  const milestones: Milestone[] = [
    {
      id: 'starter',
      title: 'Host Starter',
      description: 'Completa il setup base',
      icon: Star,
      achieved: steps.filter(s => s.required).every(s => s.completed),
      progress: steps.filter(s => s.required && s.completed).length,
      target: steps.filter(s => s.required).length,
      reward: 'Badge Host Verificato'
    },
    {
      id: 'professional',
      title: 'Host Professional',
      description: 'Completa tutto il profilo',
      icon: Trophy,
      achieved: steps.every(s => s.completed),
      progress: steps.filter(s => s.completed).length,
      target: steps.length,
      reward: 'Priorità nei risultati di ricerca'
    },
    {
      id: 'first_booking',
      title: 'Prima Prenotazione',
      description: 'Ricevi la tua prima prenotazione',
      icon: Target,
      achieved: (progressData?.totalBookings ?? 0) > 0,
      progress: Math.min(progressData?.totalBookings ?? 0, 1),
      target: 1,
      reward: 'Commissione ridotta per 30 giorni'
    },
    {
      id: 'top_host',
      title: 'Top Host',
      description: 'Raggiungi 10 prenotazioni',
      icon: Zap,
      achieved: (progressData?.completedBookings ?? 0) >= 10,
      progress: Math.min(progressData?.completedBookings ?? 0, 10),
      target: 10,
      reward: 'Badge Top Host + Visibilità Premium'
    }
  ];

  const completedSteps = steps.filter(s => s.completed).length;
  const totalSteps = steps.length;
  const completionPercentage = (completedSteps / totalSteps) * 100;

  const requiredSteps = steps.filter(s => s.required);
  const completedRequiredSteps = requiredSteps.filter(s => s.completed).length;
  const isBasicSetupComplete = completedRequiredSteps === requiredSteps.length;

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                Progresso Host
              </CardTitle>
              <CardDescription>
                {completedSteps}/{totalSteps} passaggi completati
              </CardDescription>
            </div>
            <Badge variant={isBasicSetupComplete ? "default" : "secondary"} className="text-sm">
              {isBasicSetupComplete ? "Setup Completo" : "In Corso"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Completamento Generale</span>
                <span>{completionPercentage.toFixed(0)}%</span>
              </div>
              <Progress value={completionPercentage} className="h-3" />
            </div>
            
            {!isBasicSetupComplete && (
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <p className="text-amber-800 font-medium text-sm">
                  ⚠️ Completa i passaggi obbligatori per attivare il tuo profilo host
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Steps Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Checklist Setup</CardTitle>
          <CardDescription>Completa questi passaggi per ottimizzare il tuo profilo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {steps.map((step) => (
              <div key={step.id} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center space-x-3">
                  {step.completed ? (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  ) : (
                    <Circle className="w-6 h-6 text-muted-foreground" />
                  )}
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{step.title}</h4>
                      {step.required && (
                        <Badge variant="outline" className="text-xs">Obbligatorio</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </div>
                
                {!step.completed && step.action && (
                  <Button variant="outline" size="sm" onClick={step.action}>
                    {step.actionLabel}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Milestones */}
      <Card>
        <CardHeader>
          <CardTitle>Traguardi e Rewards</CardTitle>
          <CardDescription>Sblocca badge e vantaggi completando i traguardi</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {milestones.map((milestone) => {
              const Icon = milestone.icon;
              const progressPercentage = (milestone.progress / milestone.target) * 100;
              
              return (
                <div key={milestone.id} className="p-4 rounded-lg border">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`p-2 rounded-full ${
                      milestone.achieved ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-medium">{milestone.title}</h4>
                      <p className="text-sm text-muted-foreground">{milestone.description}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progresso</span>
                      <span>{milestone.progress}/{milestone.target}</span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                    
                    {milestone.reward && (
                      <div className="text-xs text-muted-foreground">
                        🎁 <strong>Reward:</strong> {milestone.reward}
                      </div>
                    )}
                  </div>
                  
                  {milestone.achieved && (
                    <Badge className="mt-2 bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Completato
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
