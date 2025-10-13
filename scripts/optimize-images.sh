#!/bin/bash

###############################################################################
# Image Optimization Script for WorkoverHub Connect
# 
# This script optimizes images for web delivery by:
# - Converting to WebP format (smaller file size, better compression)
# - Compressing images with quality optimization
# - Generating responsive image variants (thumbnail, medium, large)
# - Preserving originals in backup directory
#
# Usage:
#   ./scripts/optimize-images.sh [source_dir] [output_dir]
#
# Example:
#   ./scripts/optimize-images.sh ./public/images ./public/optimized
#
# Requirements:
#   - ImageMagick (convert)
#   - cwebp (WebP encoder)
#
# Install dependencies:
#   brew install imagemagick webp  # macOS
#   sudo apt install imagemagick webp  # Ubuntu/Debian
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default directories
SOURCE_DIR="${1:-./public/images}"
OUTPUT_DIR="${2:-./public/optimized}"
BACKUP_DIR="${OUTPUT_DIR}/originals"

# Image quality settings
WEBP_QUALITY=85
JPEG_QUALITY=90
PNG_COMPRESSION=9

# Responsive image sizes
SIZE_THUMBNAIL=300
SIZE_MEDIUM=800
SIZE_LARGE=1920

# Statistics
TOTAL_FILES=0
OPTIMIZED_FILES=0
TOTAL_SIZE_BEFORE=0
TOTAL_SIZE_AFTER=0

###############################################################################
# Helper Functions
###############################################################################

print_header() {
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║        WorkoverHub Image Optimization Script v1.0          ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

check_dependencies() {
    print_info "Checking dependencies..."
    
    if ! command -v convert &> /dev/null; then
        print_error "ImageMagick not found. Please install it:"
        echo "  macOS: brew install imagemagick"
        echo "  Ubuntu: sudo apt install imagemagick"
        exit 1
    fi
    
    if ! command -v cwebp &> /dev/null; then
        print_error "WebP encoder not found. Please install it:"
        echo "  macOS: brew install webp"
        echo "  Ubuntu: sudo apt install webp"
        exit 1
    fi
    
    print_success "All dependencies installed"
    echo ""
}

create_directories() {
    print_info "Creating output directories..."
    
    mkdir -p "$OUTPUT_DIR"
    mkdir -p "$BACKUP_DIR"
    mkdir -p "$OUTPUT_DIR/thumbnails"
    mkdir -p "$OUTPUT_DIR/medium"
    mkdir -p "$OUTPUT_DIR/large"
    mkdir -p "$OUTPUT_DIR/webp"
    
    print_success "Directories created"
    echo ""
}

get_file_size() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        stat -f%z "$1"
    else
        stat -c%s "$1"
    fi
}

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

optimize_image() {
    local input_file="$1"
    local filename=$(basename "$input_file")
    local name="${filename%.*}"
    local extension="${filename##*.}"
    
    # Skip if not an image
    if [[ ! "$extension" =~ ^(jpg|jpeg|png|gif)$ ]]; then
        return
    fi
    
    print_info "Optimizing: $filename"
    
    # Get original size
    local size_before=$(get_file_size "$input_file")
    TOTAL_SIZE_BEFORE=$((TOTAL_SIZE_BEFORE + size_before))
    
    # Backup original
    cp "$input_file" "$BACKUP_DIR/$filename"
    
    # Generate WebP version (highest priority for web)
    cwebp -q $WEBP_QUALITY "$input_file" -o "$OUTPUT_DIR/webp/${name}.webp" 2>/dev/null
    
    # Generate responsive variants
    # Thumbnail (300px)
    convert "$input_file" \
        -resize "${SIZE_THUMBNAIL}x${SIZE_THUMBNAIL}>" \
        -quality $JPEG_QUALITY \
        "$OUTPUT_DIR/thumbnails/${name}.jpg"
    
    # Medium (800px)
    convert "$input_file" \
        -resize "${SIZE_MEDIUM}x${SIZE_MEDIUM}>" \
        -quality $JPEG_QUALITY \
        "$OUTPUT_DIR/medium/${name}.jpg"
    
    # Large (1920px)
    convert "$input_file" \
        -resize "${SIZE_LARGE}x${SIZE_LARGE}>" \
        -quality $JPEG_QUALITY \
        "$OUTPUT_DIR/large/${name}.jpg"
    
    # Optimize original format
    if [[ "$extension" =~ ^(jpg|jpeg)$ ]]; then
        convert "$input_file" \
            -quality $JPEG_QUALITY \
            -strip \
            "$OUTPUT_DIR/${filename}"
    elif [[ "$extension" == "png" ]]; then
        convert "$input_file" \
            -quality $PNG_COMPRESSION \
            -strip \
            "$OUTPUT_DIR/${filename}"
    else
        cp "$input_file" "$OUTPUT_DIR/${filename}"
    fi
    
    # Get optimized size (WebP is usually smallest)
    local size_after=$(get_file_size "$OUTPUT_DIR/webp/${name}.webp")
    TOTAL_SIZE_AFTER=$((TOTAL_SIZE_AFTER + size_after))
    
    # Calculate savings
    local savings=$((100 - (size_after * 100 / size_before)))
    
    print_success "Saved ${savings}% ($(format_bytes $size_before) → $(format_bytes $size_after))"
    
    OPTIMIZED_FILES=$((OPTIMIZED_FILES + 1))
}

print_summary() {
    local total_savings=$((100 - (TOTAL_SIZE_AFTER * 100 / TOTAL_SIZE_BEFORE)))
    
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                    Optimization Summary                    ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Files processed:   $OPTIMIZED_FILES / $TOTAL_FILES"
    echo "  Original size:     $(format_bytes $TOTAL_SIZE_BEFORE)"
    echo "  Optimized size:    $(format_bytes $TOTAL_SIZE_AFTER)"
    echo "  Total savings:     ${total_savings}%"
    echo ""
    echo "  Output directory:  $OUTPUT_DIR"
    echo "  Backup directory:  $BACKUP_DIR"
    echo ""
    print_success "Image optimization completed!"
    echo ""
}

###############################################################################
# Main Execution
###############################################################################

main() {
    print_header
    
    # Validate source directory
    if [ ! -d "$SOURCE_DIR" ]; then
        print_error "Source directory not found: $SOURCE_DIR"
        exit 1
    fi
    
    # Check dependencies
    check_dependencies
    
    # Create output directories
    create_directories
    
    # Count total image files
    TOTAL_FILES=$(find "$SOURCE_DIR" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.gif" \) | wc -l)
    
    if [ "$TOTAL_FILES" -eq 0 ]; then
        print_warning "No images found in $SOURCE_DIR"
        exit 0
    fi
    
    print_info "Found $TOTAL_FILES images to optimize"
    echo ""
    
    # Process all images
    find "$SOURCE_DIR" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.gif" \) | while read -r file; do
        optimize_image "$file"
    done
    
    # Print summary
    print_summary
}

# Run main function
main
