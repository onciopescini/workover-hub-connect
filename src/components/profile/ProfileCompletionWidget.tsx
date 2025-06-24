
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle, Circle, AlertCircle } from "lucide-react";
import { Profile } from "@/types/auth";
import { useNavigate } from "react-router-dom";

interface ProfileCompletionWidgetProps {
  profile: Profile;
}

export function ProfileCompletionWidget({ profile }: ProfileCompletionWidgetProps) {
  const navigate = useNavigate();

  const completionItems = [
    {
      key: 'basic_info',
      label: 'Informazioni di base',
      completed: !!(profile.first_name && profile.last_name),
      action: () => navigate('/profile/edit'),
      priority: 'high'
    },
    {
      key: 'profile_photo',
      label: 'Foto profilo',
      completed: !!profile.profile_photo_url,
      action: () => navigate('/profile/edit'),
      priority: 'high'
    },
    {
      key: 'bio',
      label: 'Biografia',
      completed: !!profile.bio,
      action: () => navigate('/profile/edit'),
      priority: 'medium'
    },
    {
      key: 'location',
      label: 'Località',
      completed: !!profile.location,
      action: () => navigate('/profile/edit'),
      priority: 'medium'
    },
    {
      key: 'job_title',
      label: 'Titolo di lavoro',
      completed: !!profile.job_title,
      action: () => navigate('/profile/edit'),
      priority: 'medium'
    },
    {
      key: 'skills',
      label: 'Competenze',
      completed: !!(profile.skills || (profile.competencies && profile.competencies.length > 0)),
      action: () => navigate('/profile/edit'),
      priority: 'low'
    }
  ];

  const completedCount = completionItems.filter(item => item.completed).length;
  const completionPercentage = Math.round((completedCount / completionItems.length) * 100);
  
  const incompletePriorityItems = completionItems
    .filter(item => !item.completed)
    .sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    })
    .slice(0, 3);

  if (completionPercentage === 100) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-900">Profilo Completo!</h3>
              <p className="text-sm text-green-700">
                Ottimo lavoro! Il tuo profilo è completo al 100%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-blue-600" />
          Completa il tuo Profilo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">
              Completamento: {completionPercentage}%
            </span>
            <span className="text-sm text-gray-500">
              {completedCount}/{completionItems.length}
            </span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">
            Prossimi passi suggeriti:
          </h4>
          <div className="space-y-2">
            {incompletePriorityItems.map((item) => (
              <div key={item.key} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Circle className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-700">{item.label}</span>
                  {item.priority === 'high' && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                      Priorità Alta
                    </span>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={item.action}
                  className="text-blue-600 hover:text-blue-700"
                >
                  Completa
                </Button>
              </div>
            ))}
          </div>
        </div>

        {completionPercentage < 50 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              💡 <strong>Suggerimento:</strong> Un profilo completo aumenta la fiducia degli altri utenti del 60%!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
