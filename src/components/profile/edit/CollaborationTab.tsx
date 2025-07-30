import React from 'react';
import { ProfileFormData } from "@/hooks/useProfileForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Users, Calendar, MapPin, MessageSquare } from "lucide-react";

interface CollaborationTabProps {
  formData: ProfileFormData;
  handleInputChange: (field: keyof ProfileFormData, value: string | boolean | string[]) => void;
}

const collaborationTypeOptions = [
  { value: 'progetti', label: 'Progetti' },
  { value: 'consulenza', label: 'Consulenza' },
  { value: 'freelancing', label: 'Freelancing' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'mentoring', label: 'Mentoring' }
];

const availabilityOptions = [
  { value: 'available', label: 'Disponibile', description: 'Attivamente in cerca di collaborazioni' },
  { value: 'busy', label: 'Occupato', description: 'Disponibile solo per progetti eccezionali' },
  { value: 'not_available', label: 'Non Disponibile', description: 'Non cerco collaborazioni al momento' }
];

const workModeOptions = [
  { value: 'remoto', label: 'Remoto', description: 'Preferisco lavorare da remoto' },
  { value: 'presenza', label: 'In Presenza', description: 'Preferisco lavorare di persona' },
  { value: 'ibrido', label: 'Ibrido', description: 'Mix di remoto e presenza' },
  { value: 'flessibile', label: 'Flessibile', description: 'Adattabile alle esigenze del progetto' }
];

export const CollaborationTab: React.FC<CollaborationTabProps> = ({
  formData,
  handleInputChange
}) => {
  const handleCollaborationTypesChange = (type: string, checked: boolean) => {
    const currentTypes = formData.collaboration_types || [];
    const newTypes = checked
      ? [...currentTypes, type]
      : currentTypes.filter(t => t !== type);
    
    handleInputChange('collaboration_types', newTypes);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Disponibilità Collaborazioni
        </CardTitle>
        <CardDescription>
          Condividi la tua disponibilità per collaborazioni e progetti con altri coworker
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stato Disponibilità */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Stato Disponibilità
          </Label>
          <Select
            value={formData.collaboration_availability}
            onValueChange={(value) => handleInputChange('collaboration_availability', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleziona il tuo stato" />
            </SelectTrigger>
            <SelectContent>
              {availabilityOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{option.label}</span>
                    <span className="text-sm text-muted-foreground">{option.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tipi di Collaborazione */}
        <div className="space-y-3">
          <Label>Tipi di Collaborazione</Label>
          <div className="grid grid-cols-2 gap-3">
            {collaborationTypeOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={option.value}
                  checked={formData.collaboration_types?.includes(option.value) || false}
                  onCheckedChange={(checked) => 
                    handleCollaborationTypesChange(option.value, checked as boolean)
                  }
                />
                <Label
                  htmlFor={option.value}
                  className="text-sm font-normal cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Modalità di Lavoro Preferita */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Modalità di Lavoro Preferita
          </Label>
          <RadioGroup
            value={formData.preferred_work_mode}
            onValueChange={(value) => handleInputChange('preferred_work_mode', value)}
            className="grid grid-cols-1 gap-3"
          >
            {workModeOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <RadioGroupItem value={option.value} id={option.value} />
                <Label htmlFor={option.value} className="flex flex-col cursor-pointer">
                  <span className="font-medium">{option.label}</span>
                  <span className="text-sm text-muted-foreground">{option.description}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Descrizione Collaborazioni */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Descrizione delle Collaborazioni Cercate
          </Label>
          <Textarea
            placeholder="Descrivi che tipo di collaborazioni stai cercando, i tuoi obiettivi e cosa puoi offrire..."
            value={formData.collaboration_description}
            onChange={(e) => handleInputChange('collaboration_description', e.target.value)}
            rows={4}
            maxLength={500}
          />
          <p className="text-sm text-muted-foreground">
            {formData.collaboration_description?.length || 0}/500 caratteri
          </p>
        </div>
      </CardContent>
    </Card>
  );
};