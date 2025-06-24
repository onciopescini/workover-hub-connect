
import { useState, useMemo } from 'react';

interface User {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  is_suspended: boolean;
  suspension_reason: string | null;
}

export const useUserFilters = (users: User[]) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const searchTerm = searchQuery.toLowerCase();
      const fullName = `${user.first_name} ${user.last_name}`.toLowerCase();
      const matchesSearch = fullName.includes(searchTerm);

      const matchesTab = 
        activeTab === 'all' ||
        (activeTab === 'active' && !user.is_suspended) ||
        (activeTab === 'inactive' && user.is_suspended);

      return matchesSearch && matchesTab;
    });
  }, [users, searchQuery, activeTab]);

  return {
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    filteredUsers
  };
};
