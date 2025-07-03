
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORY_OPTIONS } from "@/types/space";

interface BasicInformationProps {
  title: string;
  description: string;
  category: string;
  onInputChange: (field: string, value: any) => void;
  errors: Record<string, string>;
  isSubmitting: boolean;
}

export const BasicInformation = ({
  title,
  description,
  category,
  onInputChange,
  errors,
  isSubmitting
}: BasicInformationProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">
            Space Title <span className="text-red-500">*</span>
          </Label>
          <Input
            id="title"
            value={title || ""}
            onChange={(e) => onInputChange("title", e.target.value)}
            placeholder="E.g., Bright Home Office in Downtown"
            disabled={isSubmitting}
          />
          {errors['title'] && (
            <p className="text-sm text-red-500">{errors['title']}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">
            Description <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="description"
            value={description || ""}
            onChange={(e) => onInputChange("description", e.target.value)}
            placeholder="Describe your space, amenities, and the work atmosphere"
            className="min-h-[100px]"
            disabled={isSubmitting}
          />
          {errors['description'] && (
            <p className="text-sm text-red-500">{errors['description']}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">
            Category <span className="text-red-500">*</span>
          </Label>
          <RadioGroup
            value={category || "home"}
            onValueChange={(value) => onInputChange("category", value)}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2"
          >
            {CATEGORY_OPTIONS.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem id={`category-${option.value}`} value={option.value} />
                <Label htmlFor={`category-${option.value}`} className="cursor-pointer">
                  <div className="font-medium">{option.label}</div>
                  <div className="text-sm text-gray-500">{option.description}</div>
                </Label>
              </div>
            ))}
          </RadioGroup>
          {errors['category'] && (
            <p className="text-sm text-red-500">{errors['category']}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
