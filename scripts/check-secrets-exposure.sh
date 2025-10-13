#!/bin/bash

# Script to check for exposed secrets in codebase
# Usage: ./scripts/check-secrets-exposure.sh

echo "🔍 Checking for exposed secrets..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Patterns to search for
PATTERNS=(
  "SUPABASE_SERVICE_ROLE_KEY.*=.*[a-zA-Z0-9]"
  "STRIPE_SECRET_KEY.*=.*sk_live_"
  "STRIPE_SECRET_KEY.*=.*sk_test_"
  "JWT_SECRET.*=.*[a-zA-Z0-9]"
  "password.*=.*['\"][^'\"]{8,}"
  "api[_-]?key.*=.*['\"][a-zA-Z0-9]{20,}"
)

FOUND_SECRETS=false

# Search for patterns in codebase (exclude node_modules, .git, dist)
for pattern in "${PATTERNS[@]}"; do
  echo -e "${YELLOW}Searching for pattern: $pattern${NC}"
  
  results=$(grep -r -E -i "$pattern" \
    --exclude-dir={node_modules,.git,dist,build,.next,coverage} \
    --exclude={"*.lock","*.log","check-secrets-exposure.sh"} \
    . 2>/dev/null)
  
  if [ -n "$results" ]; then
    echo -e "${RED}⚠️  POTENTIAL SECRET FOUND:${NC}"
    echo "$results"
    FOUND_SECRETS=true
  fi
done

# Check for .env files not in .gitignore
echo -e "\n${YELLOW}Checking for .env files...${NC}"
ENV_FILES=$(find . -name ".env*" -not -path "*/node_modules/*" -not -path "*/.git/*")

if [ -n "$ENV_FILES" ]; then
  echo -e "${YELLOW}Found .env files:${NC}"
  echo "$ENV_FILES"
  
  # Check if they're in .gitignore
  while IFS= read -r env_file; do
    if git check-ignore -q "$env_file"; then
      echo -e "${GREEN}✅ $env_file is in .gitignore${NC}"
    else
      echo -e "${RED}❌ $env_file is NOT in .gitignore!${NC}"
      FOUND_SECRETS=true
    fi
  done <<< "$ENV_FILES"
fi

# Check git history for secrets (last 100 commits)
echo -e "\n${YELLOW}Checking recent git history...${NC}"
GIT_SECRETS=$(git log -p -100 --all | grep -E -i "(password|secret|key).*=.*['\"][a-zA-Z0-9]{10,}" | head -5)

if [ -n "$GIT_SECRETS" ]; then
  echo -e "${RED}⚠️  POTENTIAL SECRETS IN GIT HISTORY:${NC}"
  echo "$GIT_SECRETS"
  echo -e "${YELLOW}Consider using BFG Repo-Cleaner to remove sensitive data${NC}"
  FOUND_SECRETS=true
fi

# Final summary
echo -e "\n============================================"
if [ "$FOUND_SECRETS" = true ]; then
  echo -e "${RED}❌ SECRETS EXPOSURE DETECTED${NC}"
  echo -e "${YELLOW}Action Required:${NC}"
  echo "1. Remove hardcoded secrets from code"
  echo "2. Move secrets to Supabase Secrets"
  echo "3. Ensure .env files are in .gitignore"
  echo "4. Rotate exposed secrets immediately"
  exit 1
else
  echo -e "${GREEN}✅ NO SECRETS EXPOSURE DETECTED${NC}"
  echo "All checks passed!"
  exit 0
fi
