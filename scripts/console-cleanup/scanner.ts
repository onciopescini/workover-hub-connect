/**
 * Console Cleanup Scanner - Node.js Implementation
 * 
 * Pure Node.js version of the console scanner with filesystem access.
 * This runs outside the browser bundle for CLI and CI/CD usage.
 */

import { promises as fs } from 'fs';
import path from 'path';

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

export class ConsoleCleanupScanner {
  private allowedFiles = [
    'src/lib/logger.ts',
    'src/lib/console-logger-bridge.ts',
    'src/utils/logger-cleanup.ts',
    'jest.config.js',
    'playwright.config.ts',
    'scripts/console-cleanup',
  ];

  private consoleRegex = /console\.(log|info|warn|error|debug|trace|table|time|timeEnd)\s*\(/g;

  async scanProject(rootDir: string = 'src'): Promise<ScanResult> {
    const result: ScanResult = {
      totalFiles: 0,
      totalConsoleUsages: 0,
      usagesByType: {},
      usagesByFile: {},
      productionRiskFiles: [],
    };

    const files = await this.getAllFiles(rootDir);
    result.totalFiles = files.length;

    for (const file of files) {
      if (this.isAllowedFile(file)) continue;

      const usages = await this.scanFile(file);
      if (usages.length > 0) {
        result.usagesByFile[file] = usages;
        result.totalConsoleUsages += usages.length;
        
        // Track production risk files
        if (!this.isDevelopmentOnlyFile(file)) {
          result.productionRiskFiles.push(file);
        }

        // Count by type
        usages.forEach(usage => {
          result.usagesByType[usage.type] = (result.usagesByType[usage.type] || 0) + 1;
        });
      }
    }

    return result;
  }

  async scanFile(filePath: string): Promise<ConsoleUsage[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      const usages: ConsoleUsage[] = [];

      lines.forEach((line, lineIndex) => {
        let match;
        this.consoleRegex.lastIndex = 0;
        
        while ((match = this.consoleRegex.exec(line)) !== null) {
          usages.push({
            file: filePath,
            line: lineIndex + 1,
            column: match.index + 1,
            type: match[1] as any,
            content: line.trim(),
            context: this.getContext(lines, lineIndex),
          });
        }
      });

      return usages;
    } catch (error) {
      console.warn(`Failed to scan file ${filePath}:`, error);
      return [];
    }
  }

  async generateReplacementSuggestions(usages: ConsoleUsage[]): Promise<string[]> {
    return usages.map(usage => {
      const loggerMethod = this.getLoggerMethod(usage.type);
      const componentName = this.extractComponentName(usage.file);
      
      return `// ${usage.file}:${usage.line}\n` +
             `// Replace: ${usage.content}\n` +
             `// With: logger.${loggerMethod}('${this.generateMessage(usage.content)}', { component: '${componentName}' });`;
    });
  }

  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    async function readDirectory(currentDir: string) {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          await readDirectory(fullPath);
        } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
          files.push(fullPath);
        }
      }
    }
    
    await readDirectory(dir);
    return files;
  }

  private isAllowedFile(filePath: string): boolean {
    return this.allowedFiles.some(allowed => filePath.includes(allowed));
  }

  private isDevelopmentOnlyFile(filePath: string): boolean {
    const devPatterns = [
      '/test/',
      '/tests/',
      '.test.',
      '.spec.',
      '/dev/',
      '/debug/',
    ];
    
    return devPatterns.some(pattern => filePath.includes(pattern));
  }

  private getContext(lines: string[], lineIndex: number): string {
    const start = Math.max(0, lineIndex - 2);
    const end = Math.min(lines.length, lineIndex + 3);
    return lines.slice(start, end).join('\n');
  }

  private getLoggerMethod(consoleType: string): string {
    switch (consoleType) {
      case 'log': return 'debug';
      case 'info': return 'info';
      case 'warn': return 'warn';
      case 'error': return 'error';
      case 'debug': return 'debug';
      default: return 'info';
    }
  }

  private extractComponentName(filePath: string): string {
    const fileName = path.basename(filePath, path.extname(filePath));
    return fileName.charAt(0).toUpperCase() + fileName.slice(1);
  }

  private generateMessage(consoleContent: string): string {
    // Extract meaningful message from console call
    const match = consoleContent.match(/console\.\w+\s*\(\s*['"`]([^'"`]*)/);
    return match?.[1] || 'Operation completed';
  }
}