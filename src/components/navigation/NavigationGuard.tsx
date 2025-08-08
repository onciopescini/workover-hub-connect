import React, { useContext, useEffect, useRef, useState } from 'react';
import { UNSAFE_NavigationContext } from 'react-router-dom';
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
  const { navigator } = useContext(UNSAFE_NavigationContext) as any;
  const [blocked, setBlocked] = useState(false);
  const txRef = useRef<any>(null);
  const unblockRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    if (!when) {
      if (unblockRef.current) {
        unblockRef.current();
        unblockRef.current = null;
      }
      txRef.current = null;
      setBlocked(false);
      return;
    }
    if (!navigator) return;
    unblockRef.current = (navigator as any).block((tx: any) => {
      txRef.current = tx;
      setBlocked(true);
    });
    return () => {
      if (unblockRef.current) {
        unblockRef.current();
        unblockRef.current = null;
      }
      txRef.current = null;
      setBlocked(false);
    };
  }, [navigator, when]);

  const open = blocked;

  const handleCancel = () => {
    txRef.current = null;
    setBlocked(false);
  };

  const handleProceed = () => {
    const tx = txRef.current;
    if (tx) {
      txRef.current = null;
      if (unblockRef.current) {
        unblockRef.current();
        unblockRef.current = null;
      }
      setBlocked(false);
      tx.retry();
    }
  };

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
          <AlertDialogCancel onClick={handleCancel}>Rimani e continua</AlertDialogCancel>
          <AlertDialogAction onClick={handleProceed}>Esci comunque</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
