
import { useState, useMemo } from 'react';
import { AdminUser } from '@/types/admin-user';

export const useUserFilters = (users: AdminUser[]) => {
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
