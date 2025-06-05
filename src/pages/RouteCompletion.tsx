
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Clock, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface Route {
  path: string;
  name: string;
  description: string;
  status: 'missing' | 'implemented' | 'placeholder';
  priority: 'critical' | 'nice-to-have' | 'low-priority';
}

const RouteCompletion = () => {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState<Route[]>([
    // Critical Routes
    { path: '/profile/:userId', name: 'User Profile View', description: 'View other users\' profiles', status: 'missing', priority: 'critical' },
    { path: '/about', name: 'About Page', description: 'Company information and mission', status: 'missing', priority: 'critical' },
    { path: '/faq', name: 'FAQ Page', description: 'Frequently asked questions', status: 'missing', priority: 'critical' },
    { path: '/terms', name: 'Terms of Service', description: 'Terms and conditions', status: 'missing', priority: 'critical' },
    { path: '/privacy', name: 'Privacy Policy', description: 'Privacy policy and data handling', status: 'missing', priority: 'critical' },
    { path: '/contact', name: 'Contact Page', description: 'Contact information and form', status: 'missing', priority: 'critical' },
    
    // Admin Subroutes
    { path: '/admin/users', name: 'Admin User Management', description: 'Manage platform users', status: 'missing', priority: 'critical' },
    { path: '/admin/spaces', name: 'Admin Space Management', description: 'Manage platform spaces', status: 'missing', priority: 'critical' },
    { path: '/admin/reports', name: 'Admin Report Management', description: 'Handle user reports', status: 'missing', priority: 'critical' },
    { path: '/admin/tickets', name: 'Admin Support Tickets', description: 'Manage support tickets', status: 'missing', priority: 'critical' },
    { path: '/admin/tags', name: 'Admin Tag Management', description: 'Manage global tags', status: 'missing', priority: 'critical' },
    { path: '/admin/logs', name: 'Admin Action Logs', description: 'View admin action history', status: 'missing', priority: 'critical' },

    // Nice-to-Have Routes
    { path: '/settings', name: 'User Settings', description: 'Account and preference settings', status: 'missing', priority: 'nice-to-have' },
    { path: '/notifications', name: 'Notification Center', description: 'View all notifications', status: 'missing', priority: 'nice-to-have' },
    { path: '/help', name: 'Help Documentation', description: 'User help and documentation', status: 'missing', priority: 'nice-to-have' },
    { path: '/search', name: 'Global Search', description: 'Search across the platform', status: 'missing', priority: 'nice-to-have' },
    { path: '/host/analytics', name: 'Host Analytics', description: 'Analytics for hosts', status: 'missing', priority: 'nice-to-have' },
    { path: '/host/payments', name: 'Host Payments', description: 'Payment management for hosts', status: 'missing', priority: 'nice-to-have' },
    { path: '/host/calendar', name: 'Host Calendar', description: 'Calendar view for hosts', status: 'missing', priority: 'nice-to-have' },

    // Low Priority Routes
    { path: '/maintenance', name: 'Maintenance Mode', description: 'Maintenance page', status: 'missing', priority: 'low-priority' },
    { path: '/offline', name: 'Offline Page', description: 'Offline fallback page', status: 'missing', priority: 'low-priority' },
    { path: '/unauthorized', name: 'Unauthorized Access', description: 'Access denied page', status: 'missing', priority: 'low-priority' },
    { path: '/api-docs', name: 'API Documentation', description: 'API documentation', status: 'missing', priority: 'low-priority' },
    { path: '/status', name: 'System Status', description: 'Platform status page', status: 'missing', priority: 'low-priority' },
    { path: '/pricing', name: 'Pricing Information', description: 'Pricing plans and info', status: 'missing', priority: 'low-priority' },
    { path: '/features', name: 'Features Overview', description: 'Platform features', status: 'missing', priority: 'low-priority' },
    { path: '/testimonials', name: 'User Testimonials', description: 'Customer testimonials', status: 'missing', priority: 'low-priority' },
  ]);

  const handleScaffoldRoute = (routePath: string) => {
    setRoutes(prev => 
      prev.map(route => 
        route.path === routePath 
          ? { ...route, status: 'placeholder' }
          : route
      )
    );
    toast.success(`Scaffolded placeholder for ${routePath}`);
  };

  const getStatusIcon = (status: Route['status']) => {
    switch (status) {
      case 'implemented':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'placeholder':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getPriorityColor = (priority: Route['priority']) => {
    switch (priority) {
      case 'critical':
        return 'destructive';
      case 'nice-to-have':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const groupedRoutes = routes.reduce((acc, route) => {
    if (!acc[route.priority]) {
      acc[route.priority] = [];
    }
    acc[route.priority].push(route);
    return acc;
  }, {} as Record<Route['priority'], Route[]>);

  const stats = {
    total: routes.length,
    missing: routes.filter(r => r.status === 'missing').length,
    implemented: routes.filter(r => r.status === 'implemented').length,
    placeholder: routes.filter(r => r.status === 'placeholder').length,
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Route Completion Dashboard
          </h1>
          <p className="text-gray-600 mb-6">
            Manage and implement missing routes to prevent 404 errors across the platform.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-sm text-gray-600">Total Routes</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-600">{stats.missing}</div>
                <div className="text-sm text-gray-600">Missing</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-yellow-600">{stats.placeholder}</div>
                <div className="text-sm text-gray-600">Placeholder</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">{stats.implemented}</div>
                <div className="text-sm text-gray-600">Implemented</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Route Groups */}
        {Object.entries(groupedRoutes).map(([priority, routesList]) => (
          <Card key={priority} className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {priority === 'critical' && '🚨'}
                {priority === 'nice-to-have' && '✨'}
                {priority === 'low-priority' && '📋'}
                {priority.charAt(0).toUpperCase() + priority.slice(1).replace('-', ' ')} Routes
                <Badge variant="outline">{routesList.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {routesList.map((route) => (
                  <div key={route.path} className="flex items-center justify-between p-4 bg-white rounded-lg border">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(route.status)}
                        <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                          {route.path}
                        </code>
                        <Badge variant={getPriorityColor(route.priority)} size="sm">
                          {route.priority}
                        </Badge>
                      </div>
                      <h3 className="font-medium text-gray-900">{route.name}</h3>
                      <p className="text-sm text-gray-600">{route.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {route.status === 'missing' && (
                        <Button
                          size="sm"
                          onClick={() => handleScaffoldRoute(route.path)}
                          className="bg-indigo-600 hover:bg-indigo-700"
                        >
                          Scaffold Page
                        </Button>
                      )}
                      {route.status === 'placeholder' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(route.path.replace(':userId', 'example'))}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      )}
                      {route.status === 'implemented' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(route.path.replace(':userId', 'example'))}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Visit
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button 
                onClick={() => {
                  const criticalMissing = routes.filter(r => r.priority === 'critical' && r.status === 'missing');
                  criticalMissing.forEach(route => handleScaffoldRoute(route.path));
                  toast.success(`Scaffolded ${criticalMissing.length} critical routes`);
                }}
                className="bg-red-600 hover:bg-red-700"
              >
                Scaffold All Critical Routes
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  // This would trigger a route scan in a real implementation
                  toast.info('Route scanning feature coming soon');
                }}
              >
                Scan for New Missing Routes
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/')}
              >
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RouteCompletion;
