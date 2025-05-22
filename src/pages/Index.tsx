
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center text-center pt-16">
          <h1 className="text-5xl font-bold text-blue-900 mb-6">WorkOver Hub Connect</h1>
          <p className="text-xl text-gray-700 max-w-2xl mb-8">
            Find and book flexible workspaces for professionals on the go.
            Connect with like-minded individuals in comfortable, productive environments.
          </p>
          <div className="flex gap-4">
            <Button 
              onClick={() => navigate("/signup")}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700"
            >
              Get Started
            </Button>
            <Button 
              onClick={() => navigate("/login")}
              variant="outline"
              size="lg"
            >
              Sign In
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
