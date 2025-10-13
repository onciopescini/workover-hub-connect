import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SecurityMetrics {
  failedLogins24h: number;
  rateLimitViolations24h: number;
  activeSessions: number;
  suspiciousActivity: number;
}

export const useSecurityMetrics = () => {
  return useQuery({
    queryKey: ['security-metrics'],
    queryFn: async (): Promise<SecurityMetrics> => {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Failed logins in last 24h
      const { count: failedLogins } = await supabase
        .from('failed_login_attempts')
        .select('*', { count: 'exact', head: true })
        .gte('attempt_time', last24h.toISOString());

      // Rate limit violations in last 24h
      const { count: rateLimitViolations } = await supabase
        .from('rate_limit_log')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', last24h.toISOString())
        .not('blocked_until', 'is', null);

      // Active sessions
      const { count: activeSessions } = await supabase
        .from('active_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('expires_at', now.toISOString());

      // Suspicious activity: multiple IPs for same user in last hour
      const { data: suspiciousUsers } = await supabase
        .from('active_sessions')
        .select('user_id, ip_address')
        .gte('last_activity', new Date(now.getTime() - 60 * 60 * 1000).toISOString());

      const userIpMap = new Map<string, Set<string>>();
      suspiciousUsers?.forEach(session => {
        if (!userIpMap.has(session.user_id)) {
          userIpMap.set(session.user_id, new Set());
        }
        if (session.ip_address) {
          userIpMap.get(session.user_id)?.add(String(session.ip_address));
        }
      });

      const suspiciousActivity = Array.from(userIpMap.values()).filter(ips => ips.size > 2).length;

      return {
        failedLogins24h: failedLogins || 0,
        rateLimitViolations24h: rateLimitViolations || 0,
        activeSessions: activeSessions || 0,
        suspiciousActivity
      };
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });
};
