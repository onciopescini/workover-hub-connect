import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

type EnvMap = Record<string, string>;

const MIGRATION_ID = '20251112100000_fix_public_listing';
const MIGRATION_PATH = join('supabase', 'migrations', `${MIGRATION_ID}.sql`);

function parseEnvFile(path: string): EnvMap {
  if (!existsSync(path)) {
    return {};
  }

  const content = readFileSync(path, 'utf-8');
  const lines = content.split(/\r?\n/);
  const result: EnvMap = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();
    value = value.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    result[key] = value;
  }

  return result;
}

function getEnvValue(env: EnvMap, key: string): string | undefined {
  return process.env[key] || env[key];
}

function isMissingError(message: string): boolean {
  return (
    message.includes('does not exist') ||
    message.includes('relation') ||
    message.includes('Could not find the table') ||
    message.includes('function')
  );
}

async function checkRelation(client: ReturnType<typeof createClient>, name: string): Promise<boolean> {
  const { error } = await client.from(name).select('id').limit(1);
  if (error) {
    if (isMissingError(error.message)) {
      return false;
    }
    throw error;
  }
  return true;
}

async function checkRpc(
  client: ReturnType<typeof createClient>,
  name: string,
  params: Record<string, unknown>
): Promise<boolean> {
  const { error } = await client.rpc(name, params);
  if (error) {
    if (isMissingError(error.message)) {
      return false;
    }
    throw error;
  }
  return true;
}

async function applyMigration(client: ReturnType<typeof createClient>, sql: string): Promise<void> {
  const { error } = await client.rpc('exec_sql', { sql });
  if (error) {
    throw error;
  }
}

async function main() {
  const envFromFile = parseEnvFile('.env');
  const supabaseUrl =
    getEnvValue(envFromFile, 'SUPABASE_URL') ||
    getEnvValue(envFromFile, 'VITE_SUPABASE_URL');
  const serviceRoleKey = getEnvValue(envFromFile, 'SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = getEnvValue(envFromFile, 'VITE_SUPABASE_ANON_KEY');

  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL or VITE_SUPABASE_URL in environment.');
  }

  const authKey = serviceRoleKey || anonKey;
  if (!authKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY.');
  }

  const client = createClient(supabaseUrl, authKey);

  console.log(`🔎 Checking migration ${MIGRATION_ID} on ${supabaseUrl}...`);

  const [workspacesOk, viewOk, radiusOk, textOk] = await Promise.all([
    checkRelation(client, 'workspaces'),
    checkRelation(client, 'spaces_public_safe'),
    checkRpc(client, 'search_spaces_by_radius', {
      p_lat: 0,
      p_lng: 0,
      p_limit: 1
    }),
    checkRpc(client, 'search_spaces_by_location_text', {
      p_search_text: 'test',
      p_limit: 1
    })
  ]);

  const missing = [
    !workspacesOk && 'table public.workspaces',
    !viewOk && 'view public.spaces_public_safe',
    !radiusOk && 'rpc public.search_spaces_by_radius',
    !textOk && 'rpc public.search_spaces_by_location_text'
  ].filter(Boolean);

  if (missing.length === 0) {
    console.log('✅ Migration effects detected: workspaces table, view, and RPCs are available.');
    return;
  }

  console.warn(`⚠️ Missing objects: ${missing.join(', ')}.`);

  if (!serviceRoleKey) {
    console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY not available. Skipping migration apply.');
    return;
  }

  if (!existsSync(MIGRATION_PATH)) {
    throw new Error(`Migration file not found: ${MIGRATION_PATH}`);
  }

  const migrationSql = readFileSync(MIGRATION_PATH, 'utf-8');
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  console.log(`🚀 Applying migration ${MIGRATION_ID}...`);
  await applyMigration(adminClient, migrationSql);
  console.log('✅ Migration applied. Re-checking objects...');

  const [workspacesAfter, viewAfter, radiusAfter, textAfter] = await Promise.all([
    checkRelation(adminClient, 'workspaces'),
    checkRelation(adminClient, 'spaces_public_safe'),
    checkRpc(adminClient, 'search_spaces_by_radius', {
      p_lat: 0,
      p_lng: 0,
      p_limit: 1
    }),
    checkRpc(adminClient, 'search_spaces_by_location_text', {
      p_search_text: 'test',
      p_limit: 1
    })
  ]);

  const stillMissing = [
    !workspacesAfter && 'table public.workspaces',
    !viewAfter && 'view public.spaces_public_safe',
    !radiusAfter && 'rpc public.search_spaces_by_radius',
    !textAfter && 'rpc public.search_spaces_by_location_text'
  ].filter(Boolean);

  if (stillMissing.length === 0) {
    console.log('✅ Migration verified after apply.');
    return;
  }

  console.warn(`❌ Objects still missing after apply: ${stillMissing.join(', ')}.`);
}

main().catch((error) => {
  console.error('❌ Preview migration check failed:', error.message);
  process.exit(1);
});
