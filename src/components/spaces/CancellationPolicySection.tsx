import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoIcon } from 'lucide-react';
import { RulesSection } from './RulesSection';

interface CancellationPolicySectionProps {
  cancellationPolicy: string;
  rules: string;
  onInputChange: (field: string, value: any) => void;
  isSubmitting: boolean;
  errors: Record<string, string>;
}

const POLICY_DESCRIPTIONS = {
  flexible: 'Cancellazione gratuita fino a 24 ore prima del check-in',
  moderate: 'Cancellazione gratuita fino a 5 giorni prima del check-in',
  strict: 'Cancellazione gratuita fino a 14 giorni prima del check-in'
};

export function CancellationPolicySection({
  cancellationPolicy,
  rules,
  onInputChange,
  isSubmitting,
  errors
}: CancellationPolicySectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <InfoIcon className="h-5 w-5" />
          Policy e Regole
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cancellation Policy */}
        <div className="space-y-3">
          <Label htmlFor="cancellation_policy">
            Policy di Cancellazione
          </Label>
          <Select 
            value={cancellationPolicy || 'moderate'}
            onValueChange={(value) => onInputChange('cancellation_policy', value)}
            disabled={isSubmitting}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleziona una policy di cancellazione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="flexible">
                <div className="flex flex-col items-start">
                  <span className="font-medium">Flessibile</span>
                  <span className="text-xs text-muted-foreground">
                    {POLICY_DESCRIPTIONS.flexible}
                  </span>
                </div>
              </SelectItem>
              <SelectItem value="moderate">
                <div className="flex flex-col items-start">
                  <span className="font-medium">Moderata</span>
                  <span className="text-xs text-muted-foreground">
                    {POLICY_DESCRIPTIONS.moderate}
                  </span>
                </div>
              </SelectItem>
              <SelectItem value="strict">
                <div className="flex flex-col items-start">
                  <span className="font-medium">Rigida</span>
                  <span className="text-xs text-muted-foreground">
                    {POLICY_DESCRIPTIONS.strict}
                  </span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          {errors['cancellation_policy'] && (
            <p className="text-destructive text-sm">{errors['cancellation_policy']}</p>
          )}
          
          {/* Policy Description */}
          {cancellationPolicy && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Policy selezionata:</strong> {POLICY_DESCRIPTIONS[cancellationPolicy as keyof typeof POLICY_DESCRIPTIONS]}
              </p>
            </div>
          )}
        </div>

        {/* House Rules */}
        <RulesSection
          rules={rules}
          onInputChange={onInputChange}
          isSubmitting={isSubmitting}
        />
        {errors['rules'] && (
          <p className="text-destructive text-sm">{errors['rules']}</p>
        )}
      </CardContent>
    </Card>
  );
}