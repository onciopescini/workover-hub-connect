
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConnectionsList } from "@/components/networking/ConnectionsList";
import { ConnectionSuggestions } from "@/components/networking/ConnectionSuggestions";
import { Users, UserPlus, MessageSquare } from "lucide-react";

export default function NetworkingAdvanced() {
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
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Chat Private</span>
            <span className="sm:hidden">Chat</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="space-y-6">
          <ConnectionsList />
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-6">
          <ConnectionSuggestions />
        </TabsContent>

        <TabsContent value="messages" className="space-y-6">
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Chat Private
            </h3>
            <p className="text-gray-600 mb-4">
              Le tue conversazioni private sono disponibili in una sezione dedicata
            </p>
            <a 
              href="/private-chats"
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              Vai alle Chat Private
            </a>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
