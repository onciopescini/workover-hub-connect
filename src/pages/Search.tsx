
import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search as SearchIcon, MapPin, Calendar, Users, Building2, User } from "lucide-react";

const Search = () => {
  const [searchQuery, setSearchQuery] = useState("");

  // Placeholder search results
  const searchResults = {
    spaces: [
      {
        id: 1,
        name: "Spazio Milano Centro",
        description: "Moderno spazio coworking nel cuore di Milano",
        location: "Milano, Lombardia",
        price: "€25/giorno",
        rating: 4.8,
        type: "Coworking"
      },
      {
        id: 2,
        name: "Hub Innovazione Roma",
        description: "Spazio dedicato a startup e freelancer",
        location: "Roma, Lazio",
        price: "€30/giorno",
        rating: 4.6,
        type: "Hub"
      }
    ],
    events: [
      {
        id: 1,
        name: "Networking per Startup",
        description: "Evento di networking per imprenditori e startup",
        date: "15 Gennaio 2024",
        location: "Milano Centro",
        attendees: 45
      },
      {
        id: 2,
        name: "Workshop Design Thinking",
        description: "Workshop pratico su metodologie di design thinking",
        date: "20 Gennaio 2024",
        location: "Roma Hub",
        attendees: 25
      }
    ],
    users: [
      {
        id: 1,
        name: "Marco Rossi",
        role: "UX Designer",
        location: "Milano",
        skills: ["UI/UX", "Figma", "Prototipazione"]
      },
      {
        id: 2,
        name: "Sara Bianchi",
        role: "Developer",
        location: "Roma",
        skills: ["React", "Node.js", "TypeScript"]
      }
    ]
  };

  return (
    <AppLayout
      title="Ricerca Globale"
      subtitle="Trova spazi, eventi e persone nella community"
    >
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Search Bar */}
        <Card>
          <CardContent className="p-6">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Cerca spazi, eventi, persone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 text-lg h-12"
              />
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge variant="secondary" className="cursor-pointer">Milano</Badge>
              <Badge variant="secondary" className="cursor-pointer">Roma</Badge>
              <Badge variant="secondary" className="cursor-pointer">Coworking</Badge>
              <Badge variant="secondary" className="cursor-pointer">Design</Badge>
              <Badge variant="secondary" className="cursor-pointer">Startup</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Search Results */}
        {searchQuery && (
          <div className="mb-4">
            <p className="text-gray-600">
              Risultati per "<strong>{searchQuery}</strong>" - {
                searchResults.spaces.length + searchResults.events.length + searchResults.users.length
              } trovati
            </p>
          </div>
        )}

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">Tutti</TabsTrigger>
            <TabsTrigger value="spaces">Spazi</TabsTrigger>
            <TabsTrigger value="events">Eventi</TabsTrigger>
            <TabsTrigger value="people">Persone</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            {/* Spaces Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Building2 className="h-5 w-5 mr-2" />
                Spazi ({searchResults.spaces.length})
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {searchResults.spaces.map((space) => (
                  <Card key={space.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{space.name}</CardTitle>
                          <CardDescription className="flex items-center mt-1">
                            <MapPin className="h-4 w-4 mr-1" />
                            {space.location}
                          </CardDescription>
                        </div>
                        <Badge>{space.type}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 mb-3">{space.description}</p>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-green-600">{space.price}</span>
                        <span className="text-sm text-gray-500">★ {space.rating}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Events Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Eventi ({searchResults.events.length})
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {searchResults.events.map((event) => (
                  <Card key={event.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">{event.name}</CardTitle>
                      <CardDescription className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {event.date} • {event.location}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 mb-3">{event.description}</p>
                      <div className="flex items-center text-sm text-gray-500">
                        <Users className="h-4 w-4 mr-1" />
                        {event.attendees} partecipanti
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* People Section */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <User className="h-5 w-5 mr-2" />
                Persone ({searchResults.users.length})
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {searchResults.users.map((user) => (
                  <Card key={user.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="h-6 w-6 text-gray-500" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{user.name}</CardTitle>
                          <CardDescription>{user.role} • {user.location}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1">
                        {user.skills.map((skill, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="spaces">
            <div className="grid gap-4 md:grid-cols-2">
              {searchResults.spaces.map((space) => (
                <Card key={space.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{space.name}</CardTitle>
                        <CardDescription className="flex items-center mt-1">
                          <MapPin className="h-4 w-4 mr-1" />
                          {space.location}
                        </CardDescription>
                      </div>
                      <Badge>{space.type}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-3">{space.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-green-600">{space.price}</span>
                      <span className="text-sm text-gray-500">★ {space.rating}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="events">
            <div className="grid gap-4 md:grid-cols-2">
              {searchResults.events.map((event) => (
                <Card key={event.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{event.name}</CardTitle>
                    <CardDescription className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      {event.date} • {event.location}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-3">{event.description}</p>
                    <div className="flex items-center text-sm text-gray-500">
                      <Users className="h-4 w-4 mr-1" />
                      {event.attendees} partecipanti
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="people">
            <div className="grid gap-4 md:grid-cols-2">
              {searchResults.users.map((user) => (
                <Card key={user.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-gray-500" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{user.name}</CardTitle>
                        <CardDescription>{user.role} • {user.location}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {user.skills.map((skill, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Empty State */}
        {!searchQuery && (
          <Card>
            <CardContent className="p-8 text-center">
              <SearchIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Inizia la tua ricerca
              </h3>
              <p className="text-gray-600">
                Digita nella barra di ricerca per trovare spazi, eventi e persone nella community.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default Search;
