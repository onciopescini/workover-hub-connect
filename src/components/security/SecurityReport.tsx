import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, XCircle, Shield } from "lucide-react";

interface SecurityFix {
  category: string;
  description: string;
  status: 'implemented' | 'partial' | 'pending';
  impact: 'critical' | 'high' | 'medium' | 'low';
  details: string;
}

const securityFixes: SecurityFix[] = [
  {
    category: 'Data Protection',
    description: 'Fixed Rate Limiting Bypass Vulnerability',
    status: 'implemented',
    impact: 'critical',
    details: 'Removed public access to rate_limits table that allowed users to manipulate rate limiting controls.'
  },
  {
    category: 'Personal Information',
    description: 'Protected Profile Data Exposure',
    status: 'implemented',
    impact: 'critical',
    details: 'Updated RLS policies to prevent exposure of phone numbers, LinkedIn URLs, and other sensitive profile data.'
  },
  {
    category: 'Host Privacy',
    description: 'Secured Spaces Table',
    status: 'implemented',
    impact: 'high',
    details: 'Hidden host_id and sensitive location data from public space queries to protect host privacy.'
  },
  {
    category: 'Event Privacy',
    description: 'Protected Event Participants',
    status: 'implemented',
    impact: 'high',
    details: 'Restricted access to event participant lists to only event creators and participants themselves.'
  },
  {
    category: 'Payment Security',
    description: 'Secured Payment Data',
    status: 'implemented',
    impact: 'high',
    details: 'Limited payment information access to only transaction participants (payers and hosts).'
  },
  {
    category: 'Review Moderation',
    description: 'Filtered Sensitive Review Content',
    status: 'implemented',
    impact: 'medium',
    details: 'Automatically hid reviews containing contact information (email, phone, social media handles).'
  },
  {
    category: 'Database Security',
    description: 'Fixed Function Search Paths',
    status: 'partial',
    impact: 'medium',
    details: 'Updated most database functions with secure search_path settings. 2 functions still need fixing.'
  },
  {
    category: 'Authentication',
    description: 'Leaked Password Protection',
    status: 'pending',
    impact: 'medium',
    details: 'Requires manual configuration in Supabase Auth settings to enable leaked password protection.'
  },
  {
    category: 'Secure Data Access',
    description: 'Created Safe Data Access Functions',
    status: 'implemented',
    impact: 'high',
    details: 'Implemented secure RPC functions for accessing profile and space data with privacy controls.'
  }
];

export const SecurityReport: React.FC = () => {
  const getStatusIcon = (status: SecurityFix['status']) => {
    switch (status) {
      case 'implemented':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'partial':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'pending':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: SecurityFix['status']) => {
    const variants = {
      implemented: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      partial: 'bg-amber-100 text-amber-700 border-amber-200',
      pending: 'bg-red-100 text-red-700 border-red-200'
    };
    
    return (
      <Badge variant="outline" className={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getImpactBadge = (impact: SecurityFix['impact']) => {
    const variants = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      low: 'bg-blue-100 text-blue-800 border-blue-200'
    };
    
    return (
      <Badge variant="outline" className={variants[impact]}>
        {impact.charAt(0).toUpperCase() + impact.slice(1)} Impact
      </Badge>
    );
  };

  const implementedCount = securityFixes.filter(fix => fix.status === 'implemented').length;
  const totalCount = securityFixes.length;
  const completionRate = Math.round((implementedCount / totalCount) * 100);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <CardTitle>Security Remediation Report</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="text-2xl font-bold text-emerald-700">{implementedCount}</div>
              <div className="text-sm text-emerald-600">Fixes Implemented</div>
            </div>
            <div className="text-center p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="text-2xl font-bold text-primary">{completionRate}%</div>
              <div className="text-sm text-muted-foreground">Completion Rate</div>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="text-2xl font-bold text-amber-700">{totalCount - implementedCount}</div>
              <div className="text-sm text-amber-600">Remaining Items</div>
            </div>
          </div>

          <div className="space-y-4">
            {securityFixes.map((fix, index) => (
              <div key={index} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(fix.status)}
                      <h3 className="font-semibold">{fix.description}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{fix.details}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{fix.category}</Badge>
                      {getImpactBadge(fix.impact)}
                      {getStatusBadge(fix.status)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">Manual Actions Required</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Enable leaked password protection in Supabase Auth settings</li>
              <li>• Review and validate all security policies are working as expected</li>
              <li>• Set up monitoring for unusual access patterns</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};