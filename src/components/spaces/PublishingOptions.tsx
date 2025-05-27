
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PublishingOptionsProps {
  published: boolean;
  onInputChange: (field: string, value: any) => void;
  isSubmitting: boolean;
}

export const PublishingOptions = ({
  published,
  onInputChange,
  isSubmitting
}: PublishingOptionsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Publishing Options</CardTitle>
      </CardHeader>
      <CardContent>
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
            disabled={isSubmitting}
          />
        </div>
      </CardContent>
    </Card>
  );
};
