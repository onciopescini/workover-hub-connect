import React, { useEffect, useState } from 'react';
import { useBlocker } from 'react-router-dom';
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
  const [showDialog, setShowDialog] = useState(false);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      when && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setShowDialog(true);
    }
  }, [blocker.state]);

  const handleCancel = () => {
    setShowDialog(false);
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  };

  const handleProceed = () => {
    setShowDialog(false);
    if (blocker.state === 'blocked') {
      blocker.proceed();
    }
  };

  return (
    <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title ?? "Vuoi lasciare questa pagina?"}</AlertDialogTitle>
          <AlertDialogDescription>
            {description ?? "Le modifiche potrebbero non essere salvate. Confermi di voler uscire?"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Rimani e continua</AlertDialogCancel>
          <AlertDialogAction onClick={handleProceed}>Esci comunque</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
