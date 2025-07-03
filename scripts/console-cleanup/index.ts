#!/usr/bin/env ts-node

/**
 * Console Cleanup CLI Tool
 * 
 * Scans TypeScript React codebase for console.* statements and generates cleanup reports.
 * Designed for Node.js CLI execution, CI/CD integration, and developer tools.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { ConsoleCleanupScanner } from './scanner.js';
import { generateMarkdownReport, generateJsonReport } from './reporter.js';

const program = new Command();

program
  .name('console-cleanup')
  .description('Scan TypeScript React codebase for console.* statements')
  .version('1.0.0');

program
  .command('scan')
  .description('Scan for console statements and generate report')
  .option('-o, --output <path>', 'Output file path for report')
  .option('-j, --json', 'Output in JSON format')
  .option('--fix', 'Show suggested logger replacements')
  .option('--dry-run', 'Show what would be changed without making changes')
  .option('--fail-on-production', 'Exit with code 1 if production risk files found', true)
  .action(async (options) => {
    const scanner = new ConsoleCleanupScanner();
    
    console.log(chalk.cyan('🔍 Scanning for console statements...\n'));
    
    try {
      const result = await scanner.scanProject('src');
      
      // Generate appropriate report
      const report = options.json 
        ? generateJsonReport(result)
        : generateMarkdownReport(result);
      
      if (options.output) {
        const fs = await import('fs');
        await fs.promises.writeFile(options.output, report);
        console.log(chalk.green(`📄 Report saved to: ${options.output}`));
      } else {
        console.log(report);
      }
      
      // Show fix suggestions if requested
      if (options.fix) {
        console.log(chalk.yellow('\n🔧 Suggested Fixes:'));
        const allUsages = Object.values(result.usagesByFile).flat();
        const suggestions = await scanner.generateReplacementSuggestions(allUsages);
        suggestions.slice(0, 5).forEach(suggestion => {
          console.log(chalk.dim(suggestion));
        });
        if (suggestions.length > 5) {
          console.log(chalk.dim(`... and ${suggestions.length - 5} more suggestions`));
        }
      }
      
      // Summary
      console.log(chalk.cyan('\n📊 Summary:'));
      console.log(`Total console statements: ${chalk.yellow(result.totalConsoleUsages)}`);
      console.log(`Production risk files: ${chalk.red(result.productionRiskFiles.length)}`);
      console.log(`Files scanned: ${chalk.blue(result.totalFiles)}`);
      
      // Exit with error code if production risks found and flag is set
      if (options.failOnProduction && result.productionRiskFiles.length > 0) {
        console.log(chalk.red('\n🚨 Production risk console statements detected!'));
        process.exit(1);
      }
      
      if (result.totalConsoleUsages === 0) {
        console.log(chalk.green('\n✅ No console statements found - codebase is clean!'));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Scan failed:'), error);
      process.exit(1);
    }
  });

// Default to scan command if no command specified
if (process.argv.length === 2) {
  program.parse(['scan'], { from: 'user' });
} else {
  program.parse();
}