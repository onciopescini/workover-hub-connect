import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { Link } from "react-router-dom";

export const HostWelcomeBanner = () => {
  return (
    <div className="container mx-auto py-12 px-4">
      <Card className="max-w-2xl mx-auto border-dashed border-2">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <UserPlus className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Benvenuto su Pescini!</CardTitle>
          <CardDescription className="text-lg">
            Per iniziare a ospitare e creare il tuo primo annuncio, abbiamo bisogno di completare il tuo profilo.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-8">
          <Button asChild size="lg" className="gap-2">
            <Link to="/profile">
              Completa il Profilo
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
