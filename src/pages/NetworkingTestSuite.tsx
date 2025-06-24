
import React, { useState } from 'react';
import { TestSuiteHeader } from "@/components/networking/test-suite/TestSuiteHeader";
import { TestSuiteTabs } from "@/components/networking/test-suite/TestSuiteTabs";
import { TestSuiteSummary } from "@/components/networking/test-suite/TestSuiteSummary";

const NetworkingTestSuite = () => {
  const [overallStatus, setOverallStatus] = useState<'unknown' | 'healthy' | 'warning' | 'critical'>('unknown');

  const runFullTestSuite = async () => {
    // Simula esecuzione completa di tutti i test
    setOverallStatus('healthy'); // Risultato ottimistico
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
