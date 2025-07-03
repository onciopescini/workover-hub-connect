
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Clock, X } from "lucide-react";
import { joinSpaceWaitlist, joinEventWaitlist, leaveWaitlist, isInSpaceWaitlist, isInEventWaitlist } from "@/lib/waitlist-utils";

interface WaitlistButtonProps {
  type: "space" | "event";
  targetId: string;
  disabled?: boolean;
  className?: string;
}

const WaitlistButton = ({ type, targetId, disabled = false, className }: WaitlistButtonProps) => {
  const [isInWaitlist, setIsInWaitlist] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [waitlistId, setWaitlistId] = useState<string | null>(null);

  useEffect(() => {
    checkWaitlistStatus();
  }, [targetId, type]);

  const checkWaitlistStatus = async () => {
    if (type === "space") {
      const waitlistIdResult = await isInSpaceWaitlist(targetId);
      const inWaitlist = waitlistIdResult !== null;
      setIsInWaitlist(inWaitlist);
      setWaitlistId(waitlistIdResult);
    } else {
      const waitlistIdResult = await isInEventWaitlist(targetId);
      const inWaitlist = waitlistIdResult !== null;
      setIsInWaitlist(inWaitlist);
      setWaitlistId(waitlistIdResult);
    }
  };

  const handleWaitlistAction = async () => {
    setIsLoading(true);
    
    try {
      if (isInWaitlist && waitlistId) {
        const success = await leaveWaitlist(waitlistId);
        if (success) {
          setIsInWaitlist(false);
          setWaitlistId(null);
        }
      } else {
        let success = false;
        if (type === "space") {
          success = await joinSpaceWaitlist(targetId);
        } else {
          success = await joinEventWaitlist(targetId);
        }
        
        if (success) {
          setIsInWaitlist(true);
          await checkWaitlistStatus();
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={isInWaitlist ? "outline" : "default"}
      onClick={handleWaitlistAction}
      disabled={disabled || isLoading}
      className={className}
    >
      {isInWaitlist ? (
        <>
          <X className="w-4 h-4 mr-2" />
          Esci dalla lista d'attesa
        </>
      ) : (
        <>
          <Clock className="w-4 h-4 mr-2" />
          Lista d'attesa
        </>
      )}
    </Button>
  );
};

export default WaitlistButton;
