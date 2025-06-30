
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Settings, Trash2 } from 'lucide-react';

interface AutoApprovalRule {
  id: string;
  name: string;
  isActive: boolean;
  conditions: {
    minRating?: number;
    maxBookings?: number;
    timeFrame?: 'immediate' | 'business_hours' | 'weekdays';
    spaceTypes?: string[];
    userVerification?: boolean;
  };
  actions: {
    autoApprove: boolean;
    requireDeposit: boolean;
    sendWelcomeMessage: boolean;
    notifyHost: boolean;
  };
}

interface AutoApprovalRulesEngineProps {
  rules: AutoApprovalRule[];
  onUpdateRules: (rules: AutoApprovalRule[]) => void;
}

export const AutoApprovalRulesEngine: React.FC<AutoApprovalRulesEngineProps> = ({
  rules,
  onUpdateRules
}) => {
  const [editingRule, setEditingRule] = useState<AutoApprovalRule | null>(null);
  const [isCreatingRule, setIsCreatingRule] = useState(false);

  const createNewRule = (): AutoApprovalRule => ({
    id: Date.now().toString(),
    name: 'Nuova Regola',
    isActive: true,
    conditions: {
      minRating: 4.0,
      timeFrame: 'immediate',
      userVerification: true
    },
    actions: {
      autoApprove: true,
      requireDeposit: false,
      sendWelcomeMessage: true,
      notifyHost: true
    }
  });

  const handleCreateRule = () => {
    const newRule = createNewRule();
    setEditingRule(newRule);
    setIsCreatingRule(true);
  };

  const handleSaveRule = () => {
    if (editingRule) {
      const updatedRules = isCreatingRule 
        ? [...rules, editingRule]
        : rules.map(rule => rule.id === editingRule.id ? editingRule : rule);
      
      onUpdateRules(updatedRules);
      setEditingRule(null);
      setIsCreatingRule(false);
    }
  };

  const handleDeleteRule = (ruleId: string) => {
    const updatedRules = rules.filter(rule => rule.id !== ruleId);
    onUpdateRules(updatedRules);
  };

  const handleToggleRule = (ruleId: string) => {
    const updatedRules = rules.map(rule => 
      rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
    );
    onUpdateRules(updatedRules);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Regole di Approvazione Automatica
          </CardTitle>
          <Button onClick={handleCreateRule}>
            <Plus className="h-4 w-4 mr-2" />
            Nuova Regola
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {rules.map((rule) => (
            <div key={rule.id} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={rule.isActive}
                    onCheckedChange={() => handleToggleRule(rule.id)}
                  />
                  <h3 className="font-medium">{rule.name}</h3>
                  <Badge variant={rule.isActive ? "default" : "secondary"}>
                    {rule.isActive ? 'Attiva' : 'Inattiva'}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingRule(rule)}
                  >
                    Modifica
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteRule(rule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium mb-1">Condizioni:</p>
                  <ul className="space-y-1 text-gray-600">
                    {rule.conditions.minRating && (
                      <li>• Rating minimo: {rule.conditions.minRating}</li>
                    )}
                    {rule.conditions.timeFrame && (
                      <li>• Orario: {rule.conditions.timeFrame}</li>
                    )}
                    {rule.conditions.userVerification && (
                      <li>• Utente verificato richiesto</li>
                    )}
                  </ul>
                </div>
                <div>
                  <p className="font-medium mb-1">Azioni:</p>
                  <ul className="space-y-1 text-gray-600">
                    {rule.actions.autoApprove && <li>• Approvazione automatica</li>}
                    {rule.actions.requireDeposit && <li>• Deposito richiesto</li>}
                    {rule.actions.sendWelcomeMessage && <li>• Messaggio di benvenuto</li>}
                    {rule.actions.notifyHost && <li>• Notifica host</li>}
                  </ul>
                </div>
              </div>
            </div>
          ))}

          {rules.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Settings className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>Nessuna regola configurata</p>
              <p className="text-sm">Crea la tua prima regola per automatizzare le approvazioni</p>
            </div>
          )}
        </div>

        {/* Rule Editor Modal */}
        {editingRule && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
              <h3 className="text-lg font-semibold mb-4">
                {isCreatingRule ? 'Crea Nuova Regola' : 'Modifica Regola'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label>Nome Regola</Label>
                  <Input
                    value={editingRule.name}
                    onChange={(e) => setEditingRule({
                      ...editingRule,
                      name: e.target.value
                    })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Rating Minimo</Label>
                    <Input
                      type="number"
                      min="1"
                      max="5"
                      step="0.1"
                      value={editingRule.conditions.minRating || ''}
                      onChange={(e) => setEditingRule({
                        ...editingRule,
                        conditions: {
                          ...editingRule.conditions,
                          minRating: parseFloat(e.target.value)
                        }
                      })}
                    />
                  </div>
                  
                  <div>
                    <Label>Orario</Label>
                    <Select
                      value={editingRule.conditions.timeFrame}
                      onValueChange={(value) => setEditingRule({
                        ...editingRule,
                        conditions: {
                          ...editingRule.conditions,
                          timeFrame: value as any
                        }
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Immediato</SelectItem>
                        <SelectItem value="business_hours">Orari ufficio</SelectItem>
                        <SelectItem value="weekdays">Solo giorni feriali</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Azioni</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={editingRule.actions.autoApprove}
                        onCheckedChange={(checked) => setEditingRule({
                          ...editingRule,
                          actions: { ...editingRule.actions, autoApprove: checked }
                        })}
                      />
                      <Label>Approvazione automatica</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={editingRule.actions.sendWelcomeMessage}
                        onCheckedChange={(checked) => setEditingRule({
                          ...editingRule,
                          actions: { ...editingRule.actions, sendWelcomeMessage: checked }
                        })}
                      />
                      <Label>Invia messaggio di benvenuto</Label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => {
                  setEditingRule(null);
                  setIsCreatingRule(false);
                }}>
                  Annulla
                </Button>
                <Button onClick={handleSaveRule}>
                  Salva
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
