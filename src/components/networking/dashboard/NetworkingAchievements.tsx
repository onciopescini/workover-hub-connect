import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Award } from 'lucide-react';
import { Achievement } from '@/types/networking-dashboard';

interface NetworkingAchievementsProps {
  achievements: Achievement[];
}

export const NetworkingAchievements = React.memo<NetworkingAchievementsProps>(({ achievements }) => {
  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Award className="h-5 w-5 text-yellow-500" />
          I tuoi Achievement
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`p-4 rounded-lg border transition-all ${
                achievement.unlocked
                  ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
                  : 'bg-muted border-border'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-full ${
                    achievement.unlocked 
                      ? 'bg-green-500' 
                      : 'bg-muted-foreground'
                  }`}
                >
                  <Award className="h-4 w-4 text-white" />
                </div>
                <div>
                  <div className="font-medium">{achievement.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {achievement.description}
                  </div>
                  {achievement.progress && !achievement.unlocked && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Progresso: {Math.round(achievement.progress)}%
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

NetworkingAchievements.displayName = 'NetworkingAchievements';