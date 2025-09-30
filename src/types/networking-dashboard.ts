export interface EnhancedNetworkingStats {
  totalConnections: number;
  pendingRequests: number;
  messagesThisWeek: number;
  profileViews: number;
  connectionRate: number;
  // Enhanced metrics
  weeklyGrowth: number;
  monthlyGrowth: number;
  engagementScore: number;
  networkingScore: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress?: number;
  icon: string;
  category: 'connections' | 'engagement' | 'activity';
}

export interface NetworkingDashboardState {
  processedStats: EnhancedNetworkingStats;
  achievements: Achievement[];
  isLoading: boolean;
  error: string | null;
}

export interface NetworkingDashboardActions {
  refreshStats: () => void;
  calculateTrends: () => void;
}

export interface NetworkingDashboardProps {
  stats: {
    totalConnections: number;
    pendingRequests: number;
    messagesThisWeek: number;
    profileViews: number;
    connectionRate: number;
  };
}