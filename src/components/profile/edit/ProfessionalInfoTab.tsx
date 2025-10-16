
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase } from "lucide-react";
import { ProfileFormData } from "@/hooks/useProfileForm";

interface ProfessionalInfoTabProps {
  formData: ProfileFormData;
  handleInputChange: (field: keyof ProfileFormData, value: string | boolean) => void;
  errors?: Record<string, string>;
}

export const ProfessionalInfoTab: React.FC<ProfessionalInfoTabProps> = ({
  formData,
  handleInputChange,
  errors = {}
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Informazioni Professionali
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="job_title">Titolo di Lavoro</Label>
            <Input
              id="job_title"
              value={formData.job_title}
              onChange={(e) => handleInputChange('job_title', e.target.value)}
              placeholder="es. Software Developer"
              className={errors['job_title'] ? 'border-destructive' : ''}
            />
            {errors['job_title'] && (
              <p className="text-sm text-destructive">{errors['job_title']}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="profession">Professione</Label>
            <Input
              id="profession"
              value={formData.profession}
              onChange={(e) => handleInputChange('profession', e.target.value)}
              placeholder="es. Ingegnere"
              className={errors['profession'] ? 'border-destructive' : ''}
            />
            {errors['profession'] && (
              <p className="text-sm text-destructive">{errors['profession']}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="job_type">Tipo di Lavoro</Label>
            <Select value={formData.job_type} onValueChange={(value) => handleInputChange('job_type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full_time">Full Time</SelectItem>
                <SelectItem value="part_time">Part Time</SelectItem>
                <SelectItem value="freelance">Freelance</SelectItem>
                <SelectItem value="contract">Contratto</SelectItem>
                <SelectItem value="intern">Stage</SelectItem>
                <SelectItem value="unemployed">In cerca di lavoro</SelectItem>
                <SelectItem value="student">Studente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="work_style">Stile di Lavoro</Label>
            <Select value={formData.work_style} onValueChange={(value) => handleInputChange('work_style', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona stile" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="remote">Remoto</SelectItem>
                <SelectItem value="hybrid">Ibrido</SelectItem>
                <SelectItem value="office">In Ufficio</SelectItem>
                <SelectItem value="nomad">Nomade Digitale</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="skills">Competenze</Label>
          <Textarea
            id="skills"
            value={formData.skills}
            onChange={(e) => handleInputChange('skills', e.target.value)}
            rows={3}
            placeholder="Separa le competenze con virgole: JavaScript, React, Node.js..."
            className={errors['skills'] ? 'border-destructive' : ''}
          />
          {errors['skills'] && (
            <p className="text-sm text-destructive">{errors['skills']}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="interests">Interessi</Label>
          <Textarea
            id="interests"
            value={formData.interests}
            onChange={(e) => handleInputChange('interests', e.target.value)}
            rows={3}
            placeholder="I tuoi interessi e hobby..."
            className={errors['interests'] ? 'border-destructive' : ''}
          />
          {errors['interests'] && (
            <p className="text-sm text-destructive">{errors['interests']}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
