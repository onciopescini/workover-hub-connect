import { supabase } from "@/integrations/supabase/client";

export interface NetworkingStats {
  totalConnections: number;
  pendingRequests: number;
  messagesThisWeek: number;
  eventsAttended: number;
  profileViews: number;
  connectionRate: number;
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

export const getNetworkingStats = async (userId: string): Promise<NetworkingStats> => {
  try {
    // Get user's connections
    const { data: connections, error: connectionsError } = await supabase
      .from('connections')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq('status', 'accepted');

    if (connectionsError) throw connectionsError;

    // Get pending requests sent by user
    const { data: pendingRequests, error: pendingError } = await supabase
      .from('connections')
      .select('*')
      .eq('sender_id', userId)
      .eq('status', 'pending');

    if (pendingError) throw pendingError;

    // Get user's private messages from this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data: messages, error: messagesError } = await supabase
      .from('private_messages')
      .select(`
        *,
        private_chats!inner (
          participant_1_id,
          participant_2_id
        )
      `)
      .eq('sender_id', userId)
      .gte('created_at', oneWeekAgo.toISOString());

    if (messagesError) throw messagesError;

    // Events feature removed: no query for event participation

    // Calculate metrics
    const totalConnections = connections?.length || 0;
    const pendingCount = pendingRequests?.length || 0;
    const messagesThisWeek = messages?.length || 0;
    const eventsAttended = 0;

    // Mock profile views (in real app, you'd track this)
    const profileViews = Math.floor(Math.random() * 50) + totalConnections * 2;

    // Calculate connection rate (connections vs total requests)
    const totalRequests = totalConnections + pendingCount;
    const connectionRate = totalRequests > 0 ? Math.round((totalConnections / totalRequests) * 100) : 0;

    // Calculate growth metrics
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const { data: lastMonthConnections } = await supabase
      .from('connections')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq('status', 'accepted')
      .gte('created_at', lastMonth.toISOString());

    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);

    const { data: lastWeekConnections } = await supabase
      .from('connections')
      .select('*')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq('status', 'accepted')
      .gte('created_at', lastWeek.toISOString());

    const monthlyGrowth = lastMonthConnections?.length || 0;
    const weeklyGrowth = lastWeekConnections?.length || 0;

    // Calculate engagement score based on activity
    const engagementScore = Math.min(100, Math.floor(
      (messagesThisWeek * 3 + weeklyGrowth * 2 + profileViews * 0.5)
    ));

    // Calculate networking score
    const networkingScore = Math.min(100, Math.floor(
      (totalConnections * 2 + connectionRate + weeklyGrowth * 3 + engagementScore) / 4
    ));

    return {
      totalConnections,
      pendingRequests: pendingCount,
      messagesThisWeek,
      eventsAttended,
      profileViews,
      connectionRate,
      weeklyGrowth,
      monthlyGrowth,
      engagementScore,
      networkingScore
    };

  } catch (error) {
    console.error('Error fetching networking stats:', error);
    return {
      totalConnections: 0,
      pendingRequests: 0,
      messagesThisWeek: 0,
      eventsAttended: 0,
      profileViews: 0,
      connectionRate: 0,
      weeklyGrowth: 0,
      monthlyGrowth: 0,
      engagementScore: 0,
      networkingScore: 0
    };
  }
};

export const calculateAchievements = (stats: NetworkingStats): Achievement[] => {
  return [
    {
      id: '1',
      title: 'First Steps',
      description: 'Prima connessione',
      unlocked: stats.totalConnections >= 1,
      progress: stats.totalConnections >= 1 ? 100 : 0,
      icon: 'users',
      category: 'connections'
    },
    {
      id: '2',
      title: 'Network Builder',
      description: '10+ connessioni',
      unlocked: stats.totalConnections >= 10,
      progress: Math.min(100, (stats.totalConnections / 10) * 100),
      icon: 'users',
      category: 'connections'
    },
    {
      id: '3',
      title: 'Super Connector',
      description: '50+ connessioni',
      unlocked: stats.totalConnections >= 50,
      progress: Math.min(100, (stats.totalConnections / 50) * 100),
      icon: 'award',
      category: 'connections'
    },
    {
      id: '4',
      title: 'Space Explorer',
      description: '5+ nuove connessioni questa settimana',
      unlocked: stats.weeklyGrowth >= 5,
      progress: Math.min(100, (stats.weeklyGrowth / 5) * 100),
      icon: 'map',
      category: 'activity'
    },
    {
      id: '5',
      title: 'Social Butterfly',
      description: '20+ messaggi questa settimana',
      unlocked: stats.messagesThisWeek >= 20,
      progress: Math.min(100, (stats.messagesThisWeek / 20) * 100),
      icon: 'message-square',
      category: 'engagement'
    },
    {
      id: '6',
      title: 'Popular Profile',
      description: '100+ visualizzazioni profilo',
      unlocked: stats.profileViews >= 100,
      progress: Math.min(100, (stats.profileViews / 100) * 100),
      icon: 'eye',
      category: 'engagement'
    },
    {
      id: '7',
      title: 'Growth Master',
      description: '5+ nuove connessioni questa settimana',
      unlocked: stats.weeklyGrowth >= 5,
      progress: Math.min(100, (stats.weeklyGrowth / 5) * 100),
      icon: 'trending-up',
      category: 'connections'
    },
    {
      id: '8',
      title: 'Networking Expert',
      description: 'Score networking 90+',
      unlocked: stats.networkingScore >= 90,
      progress: Math.min(100, (stats.networkingScore / 90) * 100),
      icon: 'star',
      category: 'engagement'
    }
  ];
};