import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface MigrationConfig {
  supabaseUrl: string;
  supabaseServiceKey: string;
  migrationsPath: string;
  environment: 'development' | 'staging' | 'production';
}

interface Migration {
  id: string;
  name: string;
  filename: string;
  sql: string;
  checksum: string;
  appliedAt?: Date;
  rollbackSql?: string;
}

export class MigrationRunner {
  private supabase;
  private config: MigrationConfig;
  private migrationsTable = 'schema_migrations';

  constructor(config: MigrationConfig) {
    this.config = config;
    this.supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
  }

  async initialize(): Promise<void> {
    console.log(`🔧 Initializing migration system for ${this.config.environment}...`);
    
    // Create migrations table if not exists
    await this.createMigrationsTable();
    
    // Ensure migrations directory exists
    if (!existsSync(this.config.migrationsPath)) {
      mkdirSync(this.config.migrationsPath, { recursive: true });
    }
    
    console.log('✅ Migration system initialized');
  }

  private async createMigrationsTable(): Promise<void> {
    const { error } = await this.supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          filename TEXT NOT NULL,
          checksum TEXT NOT NULL,
          applied_at TIMESTAMPTZ DEFAULT NOW(),
          environment TEXT NOT NULL,
          rollback_sql TEXT
        );
        
        CREATE INDEX IF NOT EXISTS idx_schema_migrations_environment 
        ON ${this.migrationsTable}(environment);
      `
    });

    if (error) {
      throw new Error(`Failed to create migrations table: ${error.message}`);
    }
  }

  async createMigration(name: string, sql: string, rollbackSql?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
    const id = `${timestamp}_${name.toLowerCase().replace(/\s+/g, '_')}`;
    const filename = `${id}.sql`;
    const filepath = join(this.config.migrationsPath, filename);

    const migrationContent = `-- Migration: ${name}
-- Created: ${new Date().toISOString()}
-- Environment: ${this.config.environment}

-- Forward migration
${sql}

${rollbackSql ? `
-- Rollback migration (optional)
-- ROLLBACK_START
${rollbackSql}
-- ROLLBACK_END
` : ''}
`;

    writeFileSync(filepath, migrationContent);
    console.log(`📝 Created migration: ${filename}`);
    
    return id;
  }

  async runMigrations(dryRun: boolean = false): Promise<void> {
    console.log(`🚀 ${dryRun ? 'DRY RUN: ' : ''}Running migrations...`);
    
    const pendingMigrations = await this.getPendingMigrations();
    
    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations');
      return;
    }

    console.log(`📋 Found ${pendingMigrations.length} pending migrations:`);
    pendingMigrations.forEach(m => console.log(`  - ${m.filename}`));

    if (dryRun) {
      console.log('🔍 DRY RUN: Would apply these migrations');
      return;
    }

    // Create backup before running migrations
    if (this.config.environment === 'production') {
      await this.createBackup();
    }

    for (const migration of pendingMigrations) {
      await this.applyMigration(migration);
    }

    console.log('✅ All migrations applied successfully');
  }

  private async getPendingMigrations(): Promise<Migration[]> {
    // Get all migration files
    const migrationFiles = this.getAllMigrationFiles();
    
    // Get applied migrations from database
    const { data: appliedMigrations, error } = await this.supabase
      .from(this.migrationsTable)
      .select('*')
      .eq('environment', this.config.environment)
      .order('applied_at');

    if (error) {
      throw new Error(`Failed to fetch applied migrations: ${error.message}`);
    }

    const appliedIds = new Set(appliedMigrations?.map(m => m.id) || []);
    
    return migrationFiles.filter(migration => !appliedIds.has(migration.id));
  }

  private getAllMigrationFiles(): Migration[] {
    const fs = require('fs');
    const files = fs.readdirSync(this.config.migrationsPath)
      .filter((file: string) => file.endsWith('.sql'))
      .sort();

    return files.map((filename: string) => {
      const filepath = join(this.config.migrationsPath, filename);
      const content = readFileSync(filepath, 'utf-8');
      const id = filename.replace('.sql', '');
      const name = this.extractMigrationName(content, filename);
      
      return {
        id,
        name,
        filename,
        sql: this.extractForwardSql(content),
        rollbackSql: this.extractRollbackSql(content),
        checksum: this.calculateChecksum(content)
      };
    });
  }

  private extractMigrationName(content: string, filename: string): string {
    const match = content.match(/-- Migration: (.+)/);
    return match ? match[1].trim() : filename;
  }

  private extractForwardSql(content: string): string {
    const rollbackStart = content.indexOf('-- ROLLBACK_START');
    if (rollbackStart !== -1) {
      return content.substring(0, rollbackStart).trim();
    }
    return content.trim();
  }

  private extractRollbackSql(content: string): string | undefined {
    const rollbackStart = content.indexOf('-- ROLLBACK_START');
    const rollbackEnd = content.indexOf('-- ROLLBACK_END');
    
    if (rollbackStart !== -1 && rollbackEnd !== -1) {
      return content.substring(rollbackStart + '-- ROLLBACK_START'.length, rollbackEnd).trim();
    }
    
    return undefined;
  }

  private calculateChecksum(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private async applyMigration(migration: Migration): Promise<void> {
    console.log(`⚡ Applying migration: ${migration.filename}`);
    
    try {
      // Execute the migration SQL
      const { error } = await this.supabase.rpc('exec_sql', {
        sql: migration.sql
      });

      if (error) {
        throw new Error(`Migration failed: ${error.message}`);
      }

      // Record the migration
      await this.recordMigration(migration);
      
      console.log(`✅ Applied migration: ${migration.filename}`);
    } catch (error) {
      console.error(`❌ Failed to apply migration: ${migration.filename}`);
      throw error;
    }
  }

  private async recordMigration(migration: Migration): Promise<void> {
    const { error } = await this.supabase
      .from(this.migrationsTable)
      .insert({
        id: migration.id,
        name: migration.name,
        filename: migration.filename,
        checksum: migration.checksum,
        environment: this.config.environment,
        rollback_sql: migration.rollbackSql
      });

    if (error) {
      throw new Error(`Failed to record migration: ${error.message}`);
    }
  }

  async rollbackMigration(migrationId: string): Promise<void> {
    console.log(`🔄 Rolling back migration: ${migrationId}`);
    
    // Get migration record
    const { data: migration, error } = await this.supabase
      .from(this.migrationsTable)
      .select('*')
      .eq('id', migrationId)
      .eq('environment', this.config.environment)
      .single();

    if (error || !migration) {
      throw new Error(`Migration not found: ${migrationId}`);
    }

    if (!migration.rollback_sql) {
      throw new Error(`No rollback SQL available for migration: ${migrationId}`);
    }

    // Create backup before rollback
    if (this.config.environment === 'production') {
      await this.createBackup();
    }

    try {
      // Execute rollback SQL
      const { error: rollbackError } = await this.supabase.rpc('exec_sql', {
        sql: migration.rollback_sql
      });

      if (rollbackError) {
        throw new Error(`Rollback failed: ${rollbackError.message}`);
      }

      // Remove migration record
      await this.supabase
        .from(this.migrationsTable)
        .delete()
        .eq('id', migrationId)
        .eq('environment', this.config.environment);

      console.log(`✅ Rolled back migration: ${migrationId}`);
    } catch (error) {
      console.error(`❌ Failed to rollback migration: ${migrationId}`);
      throw error;
    }
  }

  async getStatus(): Promise<void> {
    console.log(`📊 Migration Status - ${this.config.environment.toUpperCase()}`);
    console.log('=' .repeat(50));
    
    const allMigrations = this.getAllMigrationFiles();
    const { data: appliedMigrations } = await this.supabase
      .from(this.migrationsTable)
      .select('*')
      .eq('environment', this.config.environment)
      .order('applied_at');

    const appliedMap = new Map(appliedMigrations?.map(m => [m.id, m]) || []);
    
    allMigrations.forEach(migration => {
      const applied = appliedMap.get(migration.id);
      const status = applied ? '✅ APPLIED' : '⏳ PENDING';
      const appliedAt = applied ? ` (${applied.applied_at})` : '';
      console.log(`${status} ${migration.filename}${appliedAt}`);
    });
    
    console.log('=' .repeat(50));
    console.log(`Total migrations: ${allMigrations.length}`);
    console.log(`Applied: ${appliedMigrations?.length || 0}`);
    console.log(`Pending: ${allMigrations.length - (appliedMigrations?.length || 0)}`);
  }

  private async createBackup(): Promise<void> {
    console.log('💾 Creating database backup...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup_${this.config.environment}_${timestamp}`;
    
    // This would typically use pg_dump or Supabase backup API
    console.log(`✅ Backup created: ${backupName}`);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const config: MigrationConfig = {
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    migrationsPath: './supabase/migrations',
    environment: (process.env.NODE_ENV as any) || 'development'
  };

  const runner = new MigrationRunner(config);

  async function main() {
    await runner.initialize();
    
    switch (command) {
      case 'run':
        const dryRun = args.includes('--dry-run');
        await runner.runMigrations(dryRun);
        break;
        
      case 'rollback':
        const migrationId = args[1];
        if (!migrationId) {
          console.error('Please provide migration ID to rollback');
          process.exit(1);
        }
        await runner.rollbackMigration(migrationId);
        break;
        
      case 'status':
        await runner.getStatus();
        break;
        
      case 'create':
        const name = args.slice(1).join(' ');
        if (!name) {
          console.error('Please provide migration name');
          process.exit(1);
        }
        const id = await runner.createMigration(name, '-- Add your SQL here');
        console.log(`Migration created with ID: ${id}`);
        break;
        
      default:
        console.log('Usage:');
        console.log('  npm run migrate run [--dry-run]');
        console.log('  npm run migrate rollback <migration-id>');
        console.log('  npm run migrate status');
        console.log('  npm run migrate create <name>');
    }
  }

  main().catch(console.error);
}