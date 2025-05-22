
import React from "react";
import { useAuth } from "@/contexts/AuthContext";

const Favorites = () => {
  const { authState } = useAuth();
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">My Favorites</h1>
        <p>Welcome, {authState.profile?.first_name || "User"}! This page is under construction.</p>
      </div>
    </div>
  );
};

export default Favorites;
