#!/usr/bin/env ts-node

import { execSync } from 'child_process';
import chalk from 'chalk';

interface TestSuite {
  name: string;
  command: string;
  description: string;
  critical: boolean;
}

const TEST_SUITES: TestSuite[] = [
  {
    name: 'Permission Functions',
    command: 'npm run test -- tests/security/permission-functions.test.ts',
    description: 'Tests for has_role(), is_admin(), is_moderator(), can_moderate_content()',
    critical: true,
  },
  {
    name: 'RLS Policies',
    command: 'npm run test -- tests/security/rls-policies.test.ts',
    description: 'Tests for Row-Level Security policies on critical tables',
    critical: true,
  },
  {
    name: 'Admin Flows E2E',
    command: 'npm run test:e2e -- tests/security/admin-flows.test.ts',
    description: 'End-to-end tests for admin security flows',
    critical: true,
  },
  {
    name: 'Moderator Flows E2E',
    command: 'npm run test:e2e -- tests/security/moderator-flows.test.ts',
    description: 'End-to-end tests for moderator security flows',
    critical: true,
  },
];

interface TestResult {
  suite: TestSuite;
  passed: boolean;
  duration: number;
  error?: string;
}

async function runTestSuite(suite: TestSuite): Promise<TestResult> {
  const startTime = Date.now();

  console.log(chalk.blue(`\n🧪 Running: ${suite.name}`));
  console.log(chalk.gray(`   ${suite.description}`));

  try {
    execSync(suite.command, {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'test' },
    });

    const duration = Date.now() - startTime;
    console.log(chalk.green(`✅ ${suite.name} passed (${duration}ms)`));

    return {
      suite,
      passed: true,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(chalk.red(`❌ ${suite.name} failed (${duration}ms)`));

    return {
      suite,
      passed: false,
      duration,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function main() {
  console.log(chalk.bold.cyan('\n🛡️  SECURITY TESTING SUITE\n'));
  console.log(chalk.gray('Running comprehensive security tests...\n'));

  const results: TestResult[] = [];
  let criticalFailures = 0;

  for (const suite of TEST_SUITES) {
    const result = await runTestSuite(suite);
    results.push(result);

    if (!result.passed && suite.critical) {
      criticalFailures++;
    }
  }

  // Print summary
  console.log(chalk.bold.cyan('\n\n📊 TEST SUMMARY\n'));
  console.log(chalk.gray('─'.repeat(60)));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`\n${chalk.green('✅ Passed:')} ${passed}/${results.length}`);
  console.log(`${chalk.red('❌ Failed:')} ${failed}/${results.length}`);
  console.log(`${chalk.yellow('⏱️  Total Duration:')} ${totalDuration}ms\n`);

  // Detailed results
  console.log(chalk.bold('Detailed Results:\n'));
  results.forEach((result) => {
    const icon = result.passed ? chalk.green('✅') : chalk.red('❌');
    const status = result.passed ? chalk.green('PASS') : chalk.red('FAIL');
    const critical = result.suite.critical ? chalk.red('[CRITICAL]') : '';

    console.log(`${icon} ${result.suite.name} ${critical}`);
    console.log(`   Status: ${status}`);
    console.log(`   Duration: ${result.duration}ms`);

    if (result.error) {
      console.log(chalk.red(`   Error: ${result.error}`));
    }

    console.log('');
  });

  // Critical failures warning
  if (criticalFailures > 0) {
    console.log(chalk.bold.red('\n⚠️  CRITICAL SECURITY TESTS FAILED\n'));
    console.log(
      chalk.yellow(
        `${criticalFailures} critical security test(s) failed. These MUST be fixed before deploying to production.`
      )
    );
    console.log(
      chalk.yellow(
        '\nCritical tests ensure that:'
      )
    );
    console.log(chalk.yellow('  • RLS policies prevent unauthorized access'));
    console.log(chalk.yellow('  • Permission functions work correctly'));
    console.log(chalk.yellow('  • Admin/moderator privileges are properly enforced'));
    console.log(chalk.yellow('  • Privilege escalation attacks are prevented\n'));

    process.exit(1);
  }

  // Success
  console.log(chalk.bold.green('\n✨ ALL SECURITY TESTS PASSED!\n'));
  console.log(
    chalk.green(
      'Your application security layer has been validated. Safe to deploy. 🚀'
    )
  );

  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error(chalk.red('\n❌ Security test runner failed:'));
    console.error(error);
    process.exit(1);
  });
}

export { runTestSuite, TEST_SUITES };
