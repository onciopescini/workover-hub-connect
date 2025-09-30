import { useEffect } from 'react';

interface NavigationGuardProps {
  when: boolean;
  title?: string;
  description?: string;
}

export const NavigationGuard: React.FC<NavigationGuardProps> = ({ when, title, description }) => {
  useEffect(() => {
    if (!when) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = description ?? 'Le modifiche potrebbero non essere salvate. Confermi di voler uscire?';
      return e.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [when, description]);

  return null;
};
