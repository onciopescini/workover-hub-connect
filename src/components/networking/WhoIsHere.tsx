import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Briefcase, UserPlus } from "lucide-react";
import { useWhoIsHere } from "@/hooks/useWhoIsHere";
import { useNavigate } from "react-router-dom";

export const WhoIsHere = () => {
  const { users, isLoading, currentSpace } = useWhoIsHere();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="mb-6 animate-pulse">
        <CardHeader className="pb-3">
          <div className="h-6 w-48 bg-gray-200 rounded"></div>
        </CardHeader>
        <CardContent>
          <div className="h-20 bg-gray-100 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!currentSpace) return null;

  if (users.length === 0) {
      return (
          <Card className="mb-6 bg-blue-50/50 border-blue-100">
              <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2 text-blue-800">
                      <MapPin className="h-5 w-5" />
                      Chi è qui: {currentSpace.name}
                  </CardTitle>
              </CardHeader>
              <CardContent>
                  <p className="text-sm text-blue-600">
                      Sei l'unico check-in attivo in questo spazio al momento.
                  </p>
              </CardContent>
          </Card>
      );
  }

  return (
    <Card className="mb-6 border-l-4 border-l-green-500 shadow-sm bg-gradient-to-r from-green-50/50 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <MapPin className="h-5 w-5 text-green-600" />
            </div>
            <span>Chi è qui in <span className="text-green-700 font-bold">{currentSpace.name}</span></span>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200">
            {users.length} Online
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => (
            <div key={user.id} className="flex items-start gap-3 p-3 rounded-lg bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div
                className="cursor-pointer"
                onClick={() => navigate(`/users/${user.id}`)}
              >
                <Avatar className="h-10 w-10 border border-gray-200">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback>{user.first_name[0]}{user.last_name[0]}</AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1 min-w-0">
                <h4
                  className="font-medium text-sm truncate cursor-pointer hover:text-blue-600"
                  onClick={() => navigate(`/users/${user.id}`)}
                >
                  {user.first_name} {user.last_name}
                </h4>
                {user.job_title && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                    <Briefcase className="h-3 w-3" />
                    {user.job_title}
                  </p>
                )}
                {user.city && (
                  <p className="text-xs text-gray-400 flex items-center gap-1 truncate mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {user.city}
                  </p>
                )}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                onClick={() => navigate(`/users/${user.id}`)}
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
