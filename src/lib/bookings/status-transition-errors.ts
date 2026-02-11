interface ApiLikeError {
  message?: string;
  details?: string;
  code?: string;
  status?: number;
}

const INVALID_STATUS_TRANSITION_TEXT = 'Invalid status transition';

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (isRecord(error)) {
    const apiError = error as ApiLikeError;
    if (typeof apiError.message === 'string') {
      return apiError.message;
    }

    if (typeof apiError.details === 'string') {
      return apiError.details;
    }
  }

  return '';
};

const containsInvalidStatusTransition = (message: string): boolean => {
  return message.toLowerCase().includes(INVALID_STATUS_TRANSITION_TEXT.toLowerCase());
};

export const isInvalidStatusTransitionError = (error: unknown): boolean => {
  if (isRecord(error)) {
    const apiError = error as ApiLikeError;
    if (apiError.code === 'P0001') {
      return true;
    }

    if (typeof apiError.message === 'string' && containsInvalidStatusTransition(apiError.message)) {
      return true;
    }

    if (typeof apiError.details === 'string' && containsInvalidStatusTransition(apiError.details)) {
      return true;
    }
  }

  return containsInvalidStatusTransition(extractErrorMessage(error));
};

export const STATUS_TRANSITION_ERROR_TOAST_MESSAGE =
  'Azione non consentita per lo stato attuale della prenotazione';
