import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Calendar, Clock, CreditCard, AlertTriangle, Loader2 } from "lucide-react";
import { DateSelectionStep } from "./DateSelectionStep";
import { TimeSlotSelectionStep } from "./TimeSlotSelectionStep";
import { BookingSummaryStep } from "./BookingSummaryStep";
import { GuestsSelector } from './GuestsSelector';
import { PolicyDisplay } from '../spaces/PolicyDisplay';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckoutFiscalFields, type CoworkerFiscalData } from './checkout/CheckoutFiscalFields';

export type BookingStep = 'DATE' | 'TIME' | 'SUMMARY';

export interface TimeSlot {
  time: string;
  available: boolean;
  reserved?: boolean;
  selected?: boolean;
}

export interface SelectedTimeRange {
  startTime: string;
  endTime: string;
  duration: number; // in hours
}

export interface BookingState {
  selectedDate: Date | null;
  availableSlots: TimeSlot[];
  selectedRange: SelectedTimeRange | null;
  guestsCount: number;
  availableSpots: number | null;
  isLoadingSlots: boolean;
  isReserving: boolean;
}

export interface TwoStepBookingFormProps {
  // Config
  spaceId: string;
  pricePerDay: number;
  pricePerHour: number;
  confirmationType: string;
  maxCapacity: number;
  cancellationPolicy?: string;
  rules?: string;
  bufferMinutes?: number;
  slotInterval?: number;
  hostStripeAccountId?: string;
  availability?: any;
  hostFiscalRegime?: string;
  timezone?: string;

  // State
  currentStep: BookingStep;
  bookingState: BookingState;
  acceptedPolicy: boolean;
  requestInvoice: boolean;
  coworkerFiscalData: CoworkerFiscalData;
  fiscalErrors: Record<string, string>;
  isReserving: boolean;
  isCheckoutLoading: boolean;
  fiscalDataPreFilled?: boolean;

  // Handlers
  onDateSelect: (date: Date) => void;
  onRangeSelect: (range: SelectedTimeRange) => void;
  onGuestsChange: (count: number) => void;
  onStepChange: (step: BookingStep) => void;
  onConfirm: () => void;
  setAcceptedPolicy: (val: boolean) => void;
  setRequestInvoice: (val: boolean) => void;
  setCoworkerFiscalData: (data: CoworkerFiscalData) => void;
}

const STEP_CONFIG = [
  { key: 'DATE', label: 'Data', icon: Calendar },
  { key: 'TIME', label: 'Orario', icon: Clock },
  { key: 'SUMMARY', label: 'Riepilogo', icon: CreditCard }
] as const;

export function TwoStepBookingForm({ 
  // Config
  spaceId, 
  pricePerDay, 
  pricePerHour,
  confirmationType,
  maxCapacity,
  cancellationPolicy,
  rules,
  bufferMinutes = 0,
  slotInterval = 30,
  hostStripeAccountId,
  availability,
  hostFiscalRegime,
  
  // State
  currentStep,
  bookingState,
  acceptedPolicy,
  requestInvoice,
  coworkerFiscalData,
  fiscalErrors,
  isReserving,
  isCheckoutLoading,
  fiscalDataPreFilled = false,

  // Handlers
  onDateSelect,
  onRangeSelect,
  onGuestsChange,
  onStepChange,
  onConfirm,
  setAcceptedPolicy,
  setRequestInvoice,
  setCoworkerFiscalData
}: TwoStepBookingFormProps) {

  const progressValue = {
    'DATE': 33,
    'TIME': 66,
    'SUMMARY': 100
  }[currentStep];

  const canGoBack = currentStep !== 'DATE';
  const canContinue = {
    'DATE': bookingState.selectedDate !== null,
    'TIME': bookingState.selectedRange !== null,
    'SUMMARY': true
  }[currentStep];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          {confirmationType === 'instant' ? 'Prenota Subito' : 'Richiedi Prenotazione'}
        </CardTitle>
        
        {/* Breadcrumb Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            {STEP_CONFIG.map((step, index) => (
              <div 
                key={step.key}
                className={`flex items-center gap-2 ${
                  currentStep === step.key ? 'text-primary font-medium' : 'text-muted-foreground'
                }`}
                aria-current={currentStep === step.key ? 'step' : undefined}
              >
                <step.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{step.label}</span>
              </div>
            ))}
          </div>
          <Progress value={progressValue} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Step Content */}
        {currentStep === 'DATE' && (
          <DateSelectionStep
            selectedDate={bookingState.selectedDate}
            onDateSelect={onDateSelect}
            spaceId={spaceId}
            availability={availability}
          />
        )}
        
        {currentStep === 'TIME' && (
          <div className="space-y-6">
            <TimeSlotSelectionStep
              selectedDate={bookingState.selectedDate!}
              availableSlots={bookingState.availableSlots}
              selectedRange={bookingState.selectedRange}
              onRangeSelect={onRangeSelect}
              isLoading={bookingState.isLoadingSlots}
              pricePerHour={pricePerHour}
              pricePerDay={pricePerDay}
              bufferMinutes={bufferMinutes}
              slotInterval={slotInterval}
            />
            
            {bookingState.selectedRange && (
              <GuestsSelector
                guestsCount={bookingState.guestsCount}
                maxCapacity={maxCapacity}
                onGuestsChange={onGuestsChange}
                availableSpots={bookingState.availableSpots ?? maxCapacity}
              />
            )}
          </div>
        )}
        
        {currentStep === 'SUMMARY' && (
          <>
            <BookingSummaryStep
              selectedDate={bookingState.selectedDate!}
              selectedRange={bookingState.selectedRange!}
              pricePerHour={pricePerHour}
              pricePerDay={pricePerDay}
              confirmationType={confirmationType}
              guestsCount={bookingState.guestsCount}
            />
            
            {/* Fiscal Fields for Invoice Request */}
            {hostFiscalRegime && hostFiscalRegime !== 'privato' && (
              <CheckoutFiscalFields
                requestInvoice={requestInvoice}
                onToggleInvoice={setRequestInvoice}
                fiscalData={coworkerFiscalData}
                onFiscalDataChange={setCoworkerFiscalData}
                hostHasVat={hostFiscalRegime !== 'privato'}
                errors={fiscalErrors}
                isPreFilled={fiscalDataPreFilled}
              />
            )}
            
            {/* Policy and Rules Display */}
            {(cancellationPolicy || rules) && (
              <div className="mt-6">
                <PolicyDisplay 
                  cancellationPolicy={cancellationPolicy}
                  rules={rules || ''}
                />
                
                {/* Policy Acceptance */}
                <div className="mt-4 p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="accept-policy"
                      checked={acceptedPolicy}
                      onCheckedChange={(checked: boolean) => setAcceptedPolicy(checked)}
                    />
                    <div className="flex-1">
                      <label
                        htmlFor="accept-policy"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        Accetto le policy di cancellazione e le regole della casa
                      </label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Confermo di aver letto e accettato le condizioni di prenotazione
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Navigation */}
        <div className="flex gap-3 pt-4">
          {canGoBack && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const prevStep = {
                  'TIME': 'DATE',
                  'SUMMARY': 'TIME'
                }[currentStep] as BookingStep;
                onStepChange(prevStep);
              }}
              disabled={isReserving}
            >
              Indietro
            </Button>
          )}
          
          <div className="flex-1" />
          
          {currentStep === 'DATE' && (
            <Button
              type="button"
              onClick={() => {
                if (bookingState.selectedDate) {
                  onStepChange('TIME');
                }
              }}
              disabled={!canContinue}
              data-testid="date-step-continue"
            >
              Continua
            </Button>
          )}
          
          {currentStep === 'TIME' && (
            <Button
              type="button"
              onClick={() => onStepChange('SUMMARY')}
              disabled={!canContinue}
            >
              Continua
            </Button>
          )}
          
          {currentStep === 'SUMMARY' && (
            <>
              {!hostStripeAccountId && (
                <div className="text-sm text-muted-foreground mb-2 text-center">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Host non collegato a Stripe
                </div>
              )}
              <Button
                type="button"
                onClick={onConfirm}
                disabled={isReserving || isCheckoutLoading || (!hostStripeAccountId && confirmationType === 'instant')}
                className="min-w-32"
              >
                {isReserving || isCheckoutLoading ? (
                  <>
                    <span data-testid="checkout-loading-spinner" className="sr-only">loading</span>
                    Prenotando...
                  </>
                ) : (
                  <>Conferma</>
                )}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
