import React from 'react';
import { unstable_useBlocker as useBlocker } from 'react-router';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface NavigationGuardProps {
  when: boolean;
  title?: string;
  description?: string;
}

export const NavigationGuard: React.FC<NavigationGuardProps> = ({ when, title, description }) => {
  const blocker = useBlocker(when);
  const open = blocker.state === 'blocked';

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title ?? "Vuoi lasciare questa pagina?"}</AlertDialogTitle>
          <AlertDialogDescription>
            {description ?? "Le modifiche potrebbero non essere salvate. Confermi di voler uscire?"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => blocker.reset()}>Rimani e continua</AlertDialogCancel>
          <AlertDialogAction onClick={() => blocker.proceed()}>Esci comunque</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
