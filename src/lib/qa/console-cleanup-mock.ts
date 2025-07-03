/**
 * Console Cleanup Scanner - Browser Mock
 * 
 * Browser-safe mock data for the QA Dashboard.
 * The actual scanning happens via the CLI tool.
 */

export interface ConsoleUsage {
  file: string;
  line: number;
  column: number;
  type: 'log' | 'info' | 'warn' | 'error' | 'debug';
  content: string;
  context: string;
}

export interface ScanResult {
  totalFiles: number;
  totalConsoleUsages: number;
  usagesByType: Record<string, number>;
  usagesByFile: Record<string, ConsoleUsage[]>;
  productionRiskFiles: string[];
}

class ConsoleCleanupMockScanner {
  async scanProject(): Promise<ScanResult> {
    // Mock data for demonstration purposes
    // Real scanning should be done via the CLI tool
    return {
      totalFiles: 159,
      totalConsoleUsages: 12,
      usagesByType: {
        'log': 8,
        'error': 3,
        'warn': 1,
      },
      usagesByFile: {
        'src/components/admin/AdminDashboard.tsx': [
          {
            file: 'src/components/admin/AdminDashboard.tsx',
            line: 45,
            column: 8,
            type: 'log',
            content: '    console.log("Admin action completed");',
            context: '    const handleAction = () => {\n      console.log("Admin action completed");\n      setLoading(false);\n    };'
          }
        ],
        'src/hooks/useAsyncOperation.ts': [
          {
            file: 'src/hooks/useAsyncOperation.ts',
            line: 23,
            column: 12,
            type: 'error',
            content: '      console.error("Operation failed:", error);',
            context: '    } catch (error) {\n      console.error("Operation failed:", error);\n      setError(error);\n    }'
          }
        ]
      },
      productionRiskFiles: [
        'src/components/admin/AdminDashboard.tsx',
        'src/hooks/useAsyncOperation.ts'
      ],
    };
  }

  async generateReplacementSuggestions(usages: ConsoleUsage[]): Promise<string[]> {
    return [
      '// src/components/admin/AdminDashboard.tsx:45\n// Replace: console.log("Admin action completed");\n// With: logger.debug("Admin action completed", { component: "AdminDashboard" });',
      '// src/hooks/useAsyncOperation.ts:23\n// Replace: console.error("Operation failed:", error);\n// With: logger.error("Operation failed", { error, component: "UseAsyncOperation" });'
    ];
  }

  async generateCleanupReport(scanResult: ScanResult): Promise<string> {
    return `
# Console Cleanup Report (Mock Data)
Generated: ${new Date().toISOString()}

## 🚨 Note: This is mock data for demo purposes
**For real console scanning, use the CLI tool:**
\`\`\`bash
npm run console-cleanup
\`\`\`

## 📊 Mock Results
- **${scanResult.totalConsoleUsages} console statements** found across ${Object.keys(scanResult.usagesByFile).length} files
- **${scanResult.productionRiskFiles.length} production risk files** with console usage
- **${scanResult.totalFiles} total files** scanned

## 🎯 Real Usage
Run the CLI tool for actual scanning:
\`\`\`bash
# Basic scan
npm run console-cleanup

# Show fixes
npm run console-cleanup -- --fix

# Save report
npm run console-cleanup -- --output cleanup-report.md
\`\`\`
    `.trim();
  }
}

export const consoleCleanupScanner = new ConsoleCleanupMockScanner();