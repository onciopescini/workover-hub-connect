#!/bin/bash

# Deployment script for Workover application
# Usage: ./scripts/deploy.sh [environment] [--rollback]

set -e  # Exit on any error

# Configuration
ENVIRONMENTS=("staging" "production")
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Help function
show_help() {
    echo "Usage: $0 [environment] [options]"
    echo ""
    echo "Environments:"
    echo "  staging     Deploy to staging environment"
    echo "  production  Deploy to production environment"
    echo ""
    echo "Options:"
    echo "  --rollback  Rollback to previous version"
    echo "  --dry-run   Preview deployment without executing"
    echo "  --help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 staging"
    echo "  $0 production --dry-run"
    echo "  $0 production --rollback"
}

# Validate environment
validate_environment() {
    local env=$1
    if [[ ! " ${ENVIRONMENTS[@]} " =~ " ${env} " ]]; then
        log_error "Invalid environment: $env"
        log_info "Valid environments: ${ENVIRONMENTS[*]}"
        exit 1
    fi
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check if required tools are installed
    local tools=("node" "npm" "git" "supabase")
    for tool in "${tools[@]}"; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "$tool is not installed or not in PATH"
            exit 1
        fi
    done
    
    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_error "Not in a git repository"
        exit 1
    fi
    
    # Check for uncommitted changes
    if [[ -n $(git status --porcelain) ]]; then
        log_warning "You have uncommitted changes"
        read -p "Continue anyway? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    log_success "Prerequisites check passed"
}

# Load environment variables
load_environment() {
    local env=$1
    local env_file="$PROJECT_ROOT/.env.$env"
    
    if [[ -f "$env_file" ]]; then
        log_info "Loading environment variables from $env_file"
        set -a  # automatically export all variables
        source "$env_file"
        set +a
    else
        log_warning "Environment file $env_file not found"
    fi
}

# Run tests
run_tests() {
    log_info "Running tests..."
    
    cd "$PROJECT_ROOT"
    
    # Install dependencies
    npm ci
    
    # Type check
    log_info "Running type check..."
    npm run type-check
    
    # Linting
    log_info "Running linter..."
    npm run lint
    
    # Unit tests
    log_info "Running unit tests..."
    npm run test
    
    # E2E tests for staging
    if [[ "$ENVIRONMENT" == "staging" ]]; then
        log_info "Running E2E tests..."
        npm run test:e2e
    fi
    
    log_success "All tests passed"
}

# Build application
build_application() {
    log_info "Building application..."
    
    cd "$PROJECT_ROOT"
    
    # Clean previous build
    rm -rf dist/
    
    # Build
    npm run build
    
    # Verify build output
    if [[ ! -d "dist" ]]; then
        log_error "Build failed - dist directory not found"
        exit 1
    fi
    
    log_success "Application built successfully"
}

# Run database migrations
run_migrations() {
    local env=$1
    local dry_run=$2
    
    log_info "Running database migrations for $env..."
    
    if [[ "$dry_run" == "true" ]]; then
        log_info "DRY RUN: Would run migrations"
        return
    fi
    
    # Run migrations using the migration runner
    node scripts/migration-runner.js run
    
    log_success "Database migrations completed"
}

# Deploy to environment
deploy() {
    local env=$1
    local dry_run=$2
    
    log_info "Deploying to $env environment..."
    
    if [[ "$dry_run" == "true" ]]; then
        log_info "DRY RUN: Would deploy to $env"
        return
    fi
    
    # Environment-specific deployment
    case $env in
        "staging")
            deploy_staging
            ;;
        "production")
            deploy_production
            ;;
    esac
    
    log_success "Deployment to $env completed"
}

# Deploy to staging
deploy_staging() {
    log_info "Deploying to staging..."
    
    # Example: Deploy to staging server
    # rsync -avz --delete dist/ staging-server:/var/www/workover/
    
    # Or deploy to Netlify/Vercel
    # netlify deploy --prod --dir=dist
    
    log_info "Staging deployment completed"
}

# Deploy to production
deploy_production() {
    log_info "Deploying to production..."
    
    # Create a deployment tag
    local tag="deploy-$(date +%Y%m%d-%H%M%S)"
    git tag "$tag"
    git push origin "$tag"
    
    # Example: Deploy to production server
    # rsync -avz --delete dist/ production-server:/var/www/workover/
    
    # Or deploy to Netlify/Vercel
    # netlify deploy --prod --dir=dist
    
    log_info "Production deployment completed"
}

# Post-deployment verification
verify_deployment() {
    local env=$1
    
    log_info "Verifying deployment..."
    
    # Health check
    local health_url
    case $env in
        "staging")
            health_url="https://staging.workover.app/health"
            ;;
        "production")
            health_url="https://workover.app/health"
            ;;
    esac
    
    if [[ -n "$health_url" ]]; then
        log_info "Checking health endpoint: $health_url"
        
        # Wait for deployment to be available
        sleep 10
        
        local max_attempts=5
        local attempt=1
        
        while [ $attempt -le $max_attempts ]; do
            if curl -f -s "$health_url" > /dev/null; then
                log_success "Health check passed"
                break
            else
                log_warning "Health check failed (attempt $attempt/$max_attempts)"
                if [ $attempt -eq $max_attempts ]; then
                    log_error "Health check failed after $max_attempts attempts"
                    return 1
                fi
                sleep 10
                ((attempt++))
            fi
        done
    fi
    
    log_success "Deployment verification completed"
}

# Rollback deployment
rollback_deployment() {
    local env=$1
    
    log_info "Rolling back deployment in $env..."
    
    # Get the previous deployment tag
    local previous_tag=$(git tag -l "deploy-*" | sort -V | tail -2 | head -1)
    
    if [[ -z "$previous_tag" ]]; then
        log_error "No previous deployment tag found"
        exit 1
    fi
    
    log_info "Rolling back to $previous_tag"
    
    # Checkout previous version
    git checkout "$previous_tag"
    
    # Rebuild and redeploy
    build_application
    deploy "$env" false
    
    # Switch back to main branch
    git checkout main
    
    log_success "Rollback completed"
}

# Send notifications
send_notifications() {
    local env=$1
    local status=$2
    
    log_info "Sending deployment notifications..."
    
    # Example: Send Slack notification
    if [[ -n "$SLACK_WEBHOOK_URL" ]]; then
        local message="Deployment to $env: $status"
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" \
            "$SLACK_WEBHOOK_URL"
    fi
    
    # Example: Send email notification
    # echo "$message" | mail -s "Workover Deployment" team@workover.app
    
    log_info "Notifications sent"
}

# Main deployment flow
main() {
    local environment=""
    local rollback=false
    local dry_run=false
    
    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            staging|production)
                environment="$1"
                shift
                ;;
            --rollback)
                rollback=true
                shift
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Validate arguments
    if [[ -z "$environment" ]]; then
        log_error "Environment is required"
        show_help
        exit 1
    fi
    
    validate_environment "$environment"
    
    # Set global variables
    ENVIRONMENT="$environment"
    
    log_info "Starting deployment to $environment"
    log_info "Rollback: $rollback"
    log_info "Dry run: $dry_run"
    
    # Load environment configuration
    load_environment "$environment"
    
    if [[ "$rollback" == "true" ]]; then
        rollback_deployment "$environment"
        send_notifications "$environment" "rollback completed"
        return
    fi
    
    # Run deployment steps
    check_prerequisites
    
    if [[ "$dry_run" != "true" ]]; then
        run_tests
    fi
    
    build_application
    run_migrations "$environment" "$dry_run"
    deploy "$environment" "$dry_run"
    
    if [[ "$dry_run" != "true" ]]; then
        verify_deployment "$environment"
        send_notifications "$environment" "success"
    fi
    
    log_success "Deployment process completed successfully!"
}

# Run main function
main "$@"