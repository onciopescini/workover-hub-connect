import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';
import { z } from 'zod';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Password attuale obbligatoria'),
  newPassword: z.string()
    .min(8, 'La nuova password deve contenere almeno 8 caratteri')
    .regex(/[A-Z]/, 'Deve contenere almeno una maiuscola')
    .regex(/[a-z]/, 'Deve contenere almeno una minuscola')
    .regex(/[0-9]/, 'Deve contenere almeno un numero'),
  confirmPassword: z.string()
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Le password non corrispondono",
  path: ["confirmPassword"]
});

export const PasswordChangeForm = () => {
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Validazione Zod
      passwordSchema.parse(passwords);
      
      // Prima verifica password attuale
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.email) {
        throw new Error('Sessione non valida');
      }
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: session.session.user.email,
        password: passwords.currentPassword
      });
      
      if (signInError) {
        throw new Error('Password attuale non corretta');
      }
      
      // Aggiorna password
      const { error } = await supabase.auth.updateUser({
        password: passwords.newPassword
      });
      
      if (error) throw error;
      
      toast.success('Password aggiornata con successo');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setErrors({});
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          fieldErrors[err.path[0] as string] = err.message;
        });
        setErrors(fieldErrors);
      } else {
        toast.error(error instanceof Error ? error.message : 'Errore durante il cambio password');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="p-4 border rounded-lg space-y-4">
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4" />
        <h3 className="font-medium">Cambia Password</h3>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="currentPassword">Password Attuale</Label>
          <Input
            id="currentPassword"
            type="password"
            value={passwords.currentPassword}
            onChange={(e) => setPasswords(prev => ({ ...prev, currentPassword: e.target.value }))}
            className={errors['currentPassword'] ? 'border-destructive' : ''}
          />
          {errors['currentPassword'] && (
            <p className="text-sm text-destructive">{errors['currentPassword']}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="newPassword">Nuova Password</Label>
          <Input
            id="newPassword"
            type="password"
            value={passwords.newPassword}
            onChange={(e) => setPasswords(prev => ({ ...prev, newPassword: e.target.value }))}
            className={errors['newPassword'] ? 'border-destructive' : ''}
          />
          {errors['newPassword'] && (
            <p className="text-sm text-destructive">{errors['newPassword']}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Conferma Nuova Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={passwords.confirmPassword}
            onChange={(e) => setPasswords(prev => ({ ...prev, confirmPassword: e.target.value }))}
            className={errors['confirmPassword'] ? 'border-destructive' : ''}
          />
          {errors['confirmPassword'] && (
            <p className="text-sm text-destructive">{errors['confirmPassword']}</p>
          )}
        </div>
        
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? 'Aggiornamento...' : 'Aggiorna Password'}
        </Button>
      </form>
    </div>
  );
};
