
import React, { useState } from 'react';
import { TestSuiteHeader } from "@/components/networking/test-suite/TestSuiteHeader";
import { TestSuiteTabs } from "@/components/networking/test-suite/TestSuiteTabs";
import { TestSuiteSummary } from "@/components/networking/test-suite/TestSuiteSummary";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth/useAuth";
import { toast } from "sonner";
import { sreLogger } from '@/lib/sre-logger';

const NetworkingTestSuite = () => {
  const { authState } = useAuth();
  const [overallStatus, setOverallStatus] = useState<'unknown' | 'healthy' | 'warning' | 'critical'>('unknown');

  const runFullTestSuite = async () => {
    setOverallStatus('unknown');
    toast.info('Esecuzione test suite completa...');
    
    try {
      const testResults: { name: string; passed: boolean; error?: string }[] = [];

      // Test 1: Connettività Supabase base
      try {
        const { error: pingError } = await supabase.from('profiles').select('id').limit(1);
        testResults.push({
          name: 'Supabase Connectivity',
          passed: !pingError,
          ...(pingError?.message && { error: pingError.message })
        });
      } catch (err) {
        testResults.push({
          name: 'Supabase Connectivity',
          passed: false,
          error: (err as Error).message
        });
      }

      // Test 2: RPC networking functions (se l'utente è autenticato)
      if (authState.user?.id) {
        try {
          const { error: rpcError } = await supabase.rpc('get_networking_suggestions' as any, { 
            p_user_id: authState.user.id, 
            p_limit: 1 
          });
          testResults.push({
            name: 'Networking RPC Functions',
            passed: !rpcError,
            ...(rpcError?.message && { error: rpcError.message })
          });
        } catch (err) {
          testResults.push({
            name: 'Networking RPC Functions',
            passed: false,
            error: (err as Error).message
          });
        }

        // Test 3: Lettura connessioni
        try {
          const { error: connectionsError } = await supabase
            .from('connections')
            .select('id')
            .limit(1);
          testResults.push({
            name: 'Connections Table Access',
            passed: !connectionsError,
            ...(connectionsError?.message && { error: connectionsError.message })
          });
        } catch (err) {
          testResults.push({
            name: 'Connections Table Access',
            passed: false,
            error: (err as Error).message
          });
        }
      }

      // Calcola status finale
      const failedTests = testResults.filter(t => !t.passed);
      const passedTests = testResults.filter(t => t.passed);

      if (failedTests.length === 0) {
        setOverallStatus('healthy');
        toast.success(`✅ Tutti i test passati (${passedTests.length}/${testResults.length})`);
        sreLogger.info('✅ Full test suite completed successfully', { 
          testResults,
          totalTests: testResults.length,
          passedTests: passedTests.length
        });
      } else if (failedTests.length < testResults.length / 2) {
        setOverallStatus('warning');
        toast.warning(`⚠️ Alcuni test falliti (${passedTests.length}/${testResults.length} passati)`);
        sreLogger.warn('⚠️ Test suite completed with warnings', { 
          testResults,
          failedTests: failedTests.map(t => ({ name: t.name, error: t.error }))
        });
      } else {
        setOverallStatus('critical');
        toast.error(`❌ Test suite fallita (${failedTests.length}/${testResults.length} falliti)`);
        sreLogger.error('❌ Test suite failed critically', { 
          testResults,
          failedTests: failedTests.map(t => ({ name: t.name, error: t.error }))
        });
      }
    } catch (error) {
      setOverallStatus('critical');
      toast.error('Errore durante esecuzione test suite');
      sreLogger.error('Test suite execution error', {}, error as Error);
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <TestSuiteHeader 
        overallStatus={overallStatus}
        onRunFullTest={runFullTestSuite}
      />
      
      <TestSuiteTabs />
      
      <TestSuiteSummary />
    </div>
  );
};

export default NetworkingTestSuite;
