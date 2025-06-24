
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export const MessagesUnauthenticated = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-96">
        <CardContent className="p-8 text-center">
          <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Accedi per vedere i messaggi
          </h3>
          <p className="text-gray-600">
            Devi effettuare l'accesso per visualizzare e inviare messaggi.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
