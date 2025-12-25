
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/auth/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, ArrowLeft } from "lucide-react";
import { useBookingReviews } from "@/hooks/queries/useBookingReviews";
import { ReviewCard } from "@/components/reviews/ReviewCard";
import { StarRating } from "@/components/ui/StarRating";

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Caricamento...</h2>
      <p className="text-gray-600">Stiamo caricando le tue recensioni.</p>
    </div>
  </div>
);

export default function Reviews() {
  const navigate = useNavigate();
  const { authState } = useAuth();

  // Use the new hook
  const { received, given, isLoading, refetch } = useBookingReviews(authState.user?.id);

  const calculateAverage = (reviews: any[]) => {
    if (!reviews.length) return null;
    return reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length;
  };

  const averageRating = calculateAverage(received);

  const EmptyState = ({ type }: { type: 'given' | 'received' }) => (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <MessageSquare className="w-16 h-16 text-gray-300 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {type === 'given' ? 'Nessuna recensione scritta' : 'Nessuna recensione ricevuta'}
      </h3>
      <p className="text-gray-600 text-center mb-4">
        {type === 'given' 
          ? 'Non hai ancora scritto recensioni. Completa una prenotazione per poter lasciare una recensione.' 
          : 'Non hai ancora ricevuto recensioni. Completa più prenotazioni per ricevere feedback dai tuoi ospiti.'}
      </p>
      <Button 
        variant="outline" 
        onClick={() => navigate('/dashboard')}
        className="text-sm"
      >
        Vai al Dashboard
      </Button>
    </div>
  );

  if (authState.isLoading || isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="p-4">
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Le mie recensioni</h1>
              <p className="text-sm text-gray-600">Gestisci le tue recensioni e feedback</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Card */}
      {averageRating !== null && (
        <div className="p-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Media voti ricevuti</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <StarRating rating={Math.round(averageRating)} readOnly size="md" />
                    <span className="text-lg font-semibold text-gray-900">
                      {averageRating.toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Totale recensioni</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {received.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-2xl mx-auto px-4 pb-4">
        <Tabs defaultValue="received" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="received" className="text-sm">
              Ricevute ({received.length})
            </TabsTrigger>
            <TabsTrigger value="given" className="text-sm">
              Date ({given.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="received" className="space-y-4">
            {received.length === 0 ? (
              <EmptyState type="received" />
            ) : (
              received.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={{ ...review, type: 'booking' }}
                  onRefresh={refetch}
                />
              ))
            )}
          </TabsContent>
          
          <TabsContent value="given" className="space-y-4">
            {given.length === 0 ? (
              <EmptyState type="given" />
            ) : (
              given.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={{ ...review, type: 'booking' }}
                  onRefresh={refetch}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
