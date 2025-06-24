
import React from 'react';
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search } from "lucide-react";

interface UserSearchAndFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const UserSearchAndFilters: React.FC<UserSearchAndFiltersProps> = ({
  searchQuery,
  setSearchQuery,
  activeTab,
  setActiveTab
}) => {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          placeholder="Cerca utenti..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="all" className="flex-1">Tutti</TabsTrigger>
          <TabsTrigger value="active" className="flex-1">Attivi</TabsTrigger>
          <TabsTrigger value="inactive" className="flex-1">Sospesi</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};
