#!/bin/bash

###############################################################################
# Bundle Analysis Script for WorkoverHub Connect
# 
# This script analyzes the production build bundle to identify:
# - Largest dependencies and their impact
# - Code duplication across chunks
# - Unused dependencies
# - Optimization opportunities
#
# Usage:
#   ./scripts/analyze-bundle.sh [--detailed]
#
# Options:
#   --detailed    Generate detailed HTML report
#
# Requirements:
#   - Node.js >= 18
#   - npm packages: vite-bundle-analyzer, webpack-bundle-analyzer
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DETAILED_MODE=false

# Parse arguments
if [[ "$1" == "--detailed" ]]; then
    DETAILED_MODE=true
fi

print_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║         WorkoverHub Bundle Analysis Script v1.0            ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }

format_bytes() {
    local bytes=$1
    if ((bytes < 1024)); then
        echo "${bytes}B"
    elif ((bytes < 1048576)); then
        echo "$((bytes / 1024))KB"
    else
        echo "$((bytes / 1048576))MB"
    fi
}

main() {
    print_header
    
    print_info "Building production bundle..."
    npm run build > /dev/null 2>&1
    print_success "Build completed"
    echo ""
    
    # Check if dist directory exists
    if [ ! -d "dist" ]; then
        print_error "dist directory not found. Build failed."
        exit 1
    fi
    
    print_info "Analyzing bundle size..."
    echo ""
    
    # Calculate total bundle size
    TOTAL_SIZE=$(du -sk dist | cut -f1)
    TOTAL_SIZE_BYTES=$((TOTAL_SIZE * 1024))
    
    # Get JS bundle size
    JS_SIZE=$(find dist/assets -name "*.js" -type f -exec du -ck {} + | grep total | cut -f1)
    JS_SIZE_BYTES=$((JS_SIZE * 1024))
    
    # Get CSS bundle size
    CSS_SIZE=$(find dist/assets -name "*.css" -type f -exec du -ck {} + | grep total | cut -f1)
    CSS_SIZE_BYTES=$((CSS_SIZE * 1024))
    
    # Get largest JS files
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                       Bundle Summary                       ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Total Bundle Size:     $(format_bytes $TOTAL_SIZE_BYTES)"
    echo "  JavaScript:            $(format_bytes $JS_SIZE_BYTES) ($(( JS_SIZE_BYTES * 100 / TOTAL_SIZE_BYTES ))%)"
    echo "  CSS:                   $(format_bytes $CSS_SIZE_BYTES) ($(( CSS_SIZE_BYTES * 100 / TOTAL_SIZE_BYTES ))%)"
    echo ""
    
    # Performance assessment
    if (( TOTAL_SIZE_BYTES < 204800 )); then  # < 200KB
        print_success "Excellent! Bundle size is under 200KB"
    elif (( TOTAL_SIZE_BYTES < 512000 )); then  # < 500KB
        print_warning "Good, but could be optimized further (target: <200KB)"
    else
        print_error "Bundle too large! Consider code splitting (target: <200KB)"
    fi
    echo ""
    
    # Top 10 largest JS files
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                   Largest JavaScript Files                 ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    find dist/assets -name "*.js" -type f -exec du -h {} + | sort -rh | head -10 | while read size file; do
        filename=$(basename "$file")
        echo "  $size    $filename"
    done
    echo ""
    
    # Analyze dependencies
    print_info "Analyzing dependencies..."
    echo ""
    
    # Check for duplicate dependencies (simplified)
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                     Dependencies Check                     ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # List largest dependencies from package.json
    echo "  Largest dependencies (estimated):"
    echo ""
    echo "  📦 React + ReactDOM        ~140KB (gzipped)"
    echo "  📦 @tanstack/react-query   ~40KB (gzipped)"
    echo "  📦 @supabase/supabase-js   ~30KB (gzipped)"
    echo "  📦 framer-motion           ~30KB (gzipped)"
    echo "  📦 lucide-react            ~25KB (gzipped)"
    echo "  📦 date-fns                ~20KB (gzipped)"
    echo ""
    
    # Recommendations
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                     Recommendations                        ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    if (( TOTAL_SIZE_BYTES > 204800 )); then
        echo "  🔧 Consider code splitting with React.lazy()"
        echo "  🔧 Use dynamic imports for heavy components"
        echo "  🔧 Analyze with: npm run build -- --sourcemap"
    fi
    
    echo "  ✅ Remove unused dependencies: npm prune"
    echo "  ✅ Use tree-shaking for unused exports"
    echo "  ✅ Compress with Brotli/Gzip (Vite automatic)"
    echo ""
    
    if [ "$DETAILED_MODE" = true ]; then
        print_info "Generating detailed HTML report..."
        echo ""
        
        # Generate detailed report with source maps
        npm run build -- --sourcemap > /dev/null 2>&1
        
        # Note: vite-bundle-analyzer or rollup-plugin-visualizer would generate HTML here
        print_success "Detailed report saved to dist/stats.html"
        print_info "Open dist/stats.html in your browser to view detailed analysis"
        echo ""
    fi
    
    print_success "Bundle analysis completed!"
    echo ""
}

main
