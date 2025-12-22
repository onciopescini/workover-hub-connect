
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ConnectionsList } from "@/components/networking/ConnectionsList";
import { ConnectionSuggestions } from "@/components/networking/ConnectionSuggestions";
import { Users, UserPlus, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function NetworkingAdvanced() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Networking Professionale
        </h1>
        <p className="text-gray-600">
          Connettiti con altri professionisti, espandi la tua rete e collabora
        </p>
      </div>

      <Tabs defaultValue="connections" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="connections" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Le Tue Connessioni</span>
            <span className="sm:hidden">Connessioni</span>
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Scopri Persone</span>
            <span className="sm:hidden">Scopri</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="space-y-6">
          <ConnectionsList />
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-6">
          <ConnectionSuggestions />
        </TabsContent>
      </Tabs>
    </div>
  );
}
