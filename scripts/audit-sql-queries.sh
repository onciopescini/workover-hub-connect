#!/bin/bash
echo "🔍 Auditing SQL queries for injection vulnerabilities..."

# Search for dangerous SQL patterns
grep -r -n "EXECUTE.*||" supabase/ src/ --include="*.sql" --include="*.ts" --include="*.tsx" || echo "✅ No EXECUTE with concatenation found"
grep -r -n "query.*\+" supabase/ src/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" || echo "✅ No query string concatenation found"

echo "✅ SQL Injection audit complete"
