
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";

interface PublishingOptionsProps {
  published: boolean;
  onInputChange: (field: string, value: any) => void;
  isSubmitting: boolean;
  stripeOnboardingStatus?: 'none' | 'pending' | 'completed' | 'restricted';
}

export const PublishingOptions = ({
  published,
  onInputChange,
  isSubmitting,
  stripeOnboardingStatus = 'none'
}: PublishingOptionsProps) => {
  const isStripeVerified = stripeOnboardingStatus === 'completed';
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Publishing Options</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isStripeVerified && (
          <div className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-md">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">
                  Per pubblicare devi completare la verifica Stripe (stato: {stripeOnboardingStatus})
                </p>
                <Link to="/host/onboarding" className="text-red-700 underline font-medium mt-1 inline-block">
                  Completa ora
                </Link>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="published" className="text-base">Publish this space</Label>
            <p className="text-sm text-gray-500">
              When published, your space will be visible to coworkers for booking
            </p>
          </div>
          <Switch
            id="published"
            checked={!!published}
            onCheckedChange={(checked) => onInputChange("published", checked)}
            disabled={isSubmitting || !isStripeVerified}
          />
        </div>
      </CardContent>
    </Card>
  );
};
