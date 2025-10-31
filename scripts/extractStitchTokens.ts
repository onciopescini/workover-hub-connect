#!/usr/bin/env ts-node
/**
 * extractStitchTokens.ts
 * 
 * Automated Stitch Design Token Extraction Tool
 * 
 * Analyzes HTML files in stitch_html/ and extracts:
 * - Colors (hex, rgb, rgba, hsl)
 * - Font families and sizes
 * - Border radius values
 * - Box shadows
 * - Spacing patterns
 * 
 * Output:
 * 1. Updates src/styles/tokens.css with extracted values
 * 2. Generates docs/ui-stitch-tokens.md with mapping table
 * 3. Exports src/theme/tokens.generated.json for version control
 * 4. Downloads/generates assets in public/assets/stitch/
 * 
 * Usage:
 *   pnpm extract:stitch
 *   pnpm extract:stitch:assets  (with asset download)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface ExtractedToken {
  value: string;
  token: string;
  category: 'color' | 'font-family' | 'font-size' | 'radius' | 'shadow' | 'spacing';
  sources: string[];
  frequency: number;
  context?: string; // e.g., "background", "text", "border"
}

interface ExtractedAsset {
  type: 'image' | 'icon' | 'background';
  originalSrc: string;
  localPath: string;
  usages: string[];
  status: 'pending' | 'downloaded' | 'placeholder' | 'error';
}

// ============================================================================
// Regex Patterns
// ============================================================================

const COLOR_PATTERNS = {
  hex: /#[0-9a-fA-F]{3,8}\b/g,
  rgb: /rgba?\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+\s*)?\)/g,
  hsl: /hsla?\s*\(\s*\d+\s*,\s*[\d.]+%\s*,\s*[\d.]+%\s*(?:,\s*[\d.]+\s*)?\)/g,
};

const FONT_PATTERNS = {
  family: /font-family:\s*([^;]+)/gi,
  size: /font-size:\s*([^;]+)/gi,
};

const RADIUS_PATTERN = /border-radius:\s*([^;]+)/gi;
const SHADOW_PATTERN = /box-shadow:\s*([^;]+)/gi;
const SPACING_PATTERN = /(?:padding|margin):\s*([^;]+)/gi;

const ASSET_PATTERNS = {
  img: /<img[^>]+src=["']([^"']+)["']/gi,
  bgUrl: /url\(["']?([^)"']+)["']?\)/gi,
};

// ============================================================================
// Color Normalization
// ============================================================================

function normalizeColor(color: string): string {
  color = color.toLowerCase().trim();
  
  // Expand short hex: #fff → #ffffff
  if (/^#[0-9a-f]{3}$/.test(color)) {
    const [r, g, b] = color.slice(1).split('');
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  
  // Normalize whitespace in rgb/rgba/hsl/hsla
  color = color.replace(/\s+/g, ' ');
  
  return color;
}

function inferColorContext(line: string, color: string): string {
  const lower = line.toLowerCase();
  if (lower.includes('background')) return 'background';
  if (lower.includes('color:') && !lower.includes('background')) return 'text';
  if (lower.includes('border')) return 'border';
  if (lower.includes('shadow')) return 'shadow';
  return 'unknown';
}

// ============================================================================
// Token Name Inference (Heuristic)
// ============================================================================

function inferColorTokenName(value: string, context: string, frequency: number): string {
  const normalized = normalizeColor(value);
  
  // Dark colors (likely backgrounds)
  if (normalized.startsWith('#0') || normalized.startsWith('#1')) {
    if (frequency > 50) return '--color-bg';
    if (frequency > 20) return '--color-surface';
    return '--color-bg-secondary';
  }
  
  // Light colors (likely text)
  if (normalized.startsWith('#e') || normalized.startsWith('#f')) {
    if (context === 'text' || frequency > 80) return '--color-text';
    return '--color-text-secondary';
  }
  
  // Mid-range grays (likely muted text)
  if (normalized.startsWith('#9') || normalized.startsWith('#a')) {
    return '--color-muted';
  }
  
  // Blues (brand colors)
  if (normalized.includes('5b') || normalized.includes('9c') || normalized.includes('ff')) {
    if (frequency > 15) return '--color-brand';
    return '--color-brand-secondary';
  }
  
  // Yellows/Oranges (accent)
  if (normalized.includes('fb') || normalized.includes('f2')) {
    return '--color-accent';
  }
  
  // Greens (success)
  if (normalized.includes('10b') || normalized.includes('98')) {
    return '--color-success';
  }
  
  // Reds (error)
  if (normalized.includes('ef') || normalized.includes('44')) {
    return '--color-error';
  }
  
  return '--color-custom';
}

function inferFontSizeTokenName(value: string, frequency: number): string {
  const size = parseFloat(value);
  const unit = value.replace(/[\d.]/g, '');
  
  if (unit === 'rem') {
    if (size >= 3.0) return '--font-size-hero';
    if (size >= 2.5) return '--font-size-h1';
    if (size >= 2.0) return '--font-size-h2';
    if (size >= 1.5) return '--font-size-h3';
    if (size >= 1.0) return '--font-size-body';
    return '--font-size-small';
  }
  
  if (unit === 'px') {
    if (size >= 48) return '--font-size-hero';
    if (size >= 40) return '--font-size-h1';
    if (size >= 32) return '--font-size-h2';
    if (size >= 24) return '--font-size-h3';
    if (size >= 16) return '--font-size-body';
    return '--font-size-small';
  }
  
  return '--font-size-custom';
}

function inferRadiusTokenName(value: string): string {
  const size = parseFloat(value);
  const unit = value.replace(/[\d.]/g, '');
  
  if (unit === 'px') {
    if (size >= 20) return '--radius-xl';
    if (size >= 12) return '--radius-lg';
    return '--radius-md';
  }
  
  if (unit === 'rem') {
    if (size >= 1.5) return '--radius-xl';
    if (size >= 1.0) return '--radius-lg';
    return '--radius-md';
  }
  
  return '--radius-custom';
}

// ============================================================================
// Token Extraction Engine
// ============================================================================

function extractTokens(htmlDir: string): Map<string, ExtractedToken> {
  const tokens = new Map<string, ExtractedToken>();
  
  if (!fs.existsSync(htmlDir)) {
    console.error(`❌ Directory ${htmlDir} not found!`);
    return tokens;
  }
  
  const files = fs.readdirSync(htmlDir).filter(f => f.endsWith('.html'));
  
  if (files.length === 0) {
    console.warn(`⚠️  No HTML files found in ${htmlDir}`);
    return tokens;
  }
  
  console.log(`🔍 Scanning ${files.length} HTML files...`);
  
  files.forEach(filename => {
    const content = fs.readFileSync(path.join(htmlDir, filename), 'utf-8');
    const lines = content.split('\n');
    
    lines.forEach((line, idx) => {
      // Extract colors
      Object.values(COLOR_PATTERNS).forEach(pattern => {
        const matches = line.matchAll(pattern);
        for (const match of matches) {
          const color = match[0];
          const normalized = normalizeColor(color);
          const context = inferColorContext(line, color);
          
          const existing = tokens.get(normalized);
          if (existing) {
            existing.frequency++;
            existing.sources.push(`${filename}:${idx + 1}`);
          } else {
            tokens.set(normalized, {
              value: normalized,
              token: inferColorTokenName(normalized, context, 1),
              category: 'color',
              sources: [`${filename}:${idx + 1}`],
              frequency: 1,
              context,
            });
          }
        }
      });
      
      // Extract font-family
      const fontFamilyMatches = line.matchAll(FONT_PATTERNS.family);
      for (const match of fontFamilyMatches) {
        const value = match[1].trim().replace(/['"]/g, '');
        const normalized = value.split(',')[0].trim(); // Take first font
        
        const existing = tokens.get(normalized);
        if (existing) {
          existing.frequency++;
          existing.sources.push(`${filename}:${idx + 1}`);
        } else {
          tokens.set(normalized, {
            value: normalized,
            token: '--font-display',
            category: 'font-family',
            sources: [`${filename}:${idx + 1}`],
            frequency: 1,
          });
        }
      }
      
      // Extract font-size
      const fontSizeMatches = line.matchAll(FONT_PATTERNS.size);
      for (const match of fontSizeMatches) {
        const value = match[1].trim();
        
        const existing = tokens.get(value);
        if (existing) {
          existing.frequency++;
          existing.sources.push(`${filename}:${idx + 1}`);
        } else {
          tokens.set(value, {
            value,
            token: inferFontSizeTokenName(value, 1),
            category: 'font-size',
            sources: [`${filename}:${idx + 1}`],
            frequency: 1,
          });
        }
      }
      
      // Extract border-radius
      const radiusMatches = line.matchAll(RADIUS_PATTERN);
      for (const match of radiusMatches) {
        const value = match[1].trim();
        
        const existing = tokens.get(value);
        if (existing) {
          existing.frequency++;
          existing.sources.push(`${filename}:${idx + 1}`);
        } else {
          tokens.set(value, {
            value,
            token: inferRadiusTokenName(value),
            category: 'radius',
            sources: [`${filename}:${idx + 1}`],
            frequency: 1,
          });
        }
      }
      
      // Extract box-shadow
      const shadowMatches = line.matchAll(SHADOW_PATTERN);
      for (const match of shadowMatches) {
        const value = match[1].trim();
        
        const existing = tokens.get(value);
        if (existing) {
          existing.frequency++;
          existing.sources.push(`${filename}:${idx + 1}`);
        } else {
          const tokenName = value.includes('rgba') && value.includes('0.2') 
            ? '--shadow-card'
            : value.includes('0.3') 
            ? '--shadow-elevated'
            : '--shadow-glow';
          
          tokens.set(value, {
            value,
            token: tokenName,
            category: 'shadow',
            sources: [`${filename}:${idx + 1}`],
            frequency: 1,
          });
        }
      }
    });
  });
  
  // Refine token names based on frequency
  tokens.forEach((token, key) => {
    if (token.category === 'color') {
      token.token = inferColorTokenName(key, token.context || 'unknown', token.frequency);
    }
    if (token.category === 'font-size') {
      token.token = inferFontSizeTokenName(key, token.frequency);
    }
  });
  
  console.log(`✅ Extracted ${tokens.size} unique tokens`);
  
  return tokens;
}

// ============================================================================
// Asset Extraction
// ============================================================================

function extractAssets(htmlDir: string): ExtractedAsset[] {
  const assets: ExtractedAsset[] = [];
  const seen = new Set<string>();
  
  if (!fs.existsSync(htmlDir)) return assets;
  
  const files = fs.readdirSync(htmlDir).filter(f => f.endsWith('.html'));
  
  files.forEach(filename => {
    const content = fs.readFileSync(path.join(htmlDir, filename), 'utf-8');
    
    // Extract <img src="...">
    const imgMatches = content.matchAll(ASSET_PATTERNS.img);
    for (const match of imgMatches) {
      const src = match[1];
      if (seen.has(src)) continue;
      seen.add(src);
      
      assets.push({
        type: 'image',
        originalSrc: src,
        localPath: inferLocalAssetPath(src),
        usages: [filename],
        status: 'pending',
      });
    }
    
    // Extract url(...)
    const bgMatches = content.matchAll(ASSET_PATTERNS.bgUrl);
    for (const match of bgMatches) {
      const src = match[1];
      if (seen.has(src) || src.startsWith('data:')) continue;
      seen.add(src);
      
      assets.push({
        type: 'background',
        originalSrc: src,
        localPath: inferLocalAssetPath(src),
        usages: [filename],
        status: 'pending',
      });
    }
  });
  
  console.log(`🖼️  Extracted ${assets.length} asset references`);
  
  return assets;
}

function inferLocalAssetPath(src: string): string {
  const filename = src.split('/').pop() || 'asset.webp';
  const cleanName = filename.split('?')[0]; // Remove query params
  return `public/assets/stitch/${cleanName}`;
}

// ============================================================================
// Asset Download/Generation
// ============================================================================

async function downloadAsset(url: string, dest: string): Promise<boolean> {
  return new Promise((resolve) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(true);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      console.error(`   ❌ Download failed: ${err.message}`);
      resolve(false);
    });
  });
}

function generatePlaceholderSVG(name: string, width: number, height: number): string {
  const text = name.replace(/\.(svg|png|jpg|webp)$/i, '').replace(/[-_]/g, ' ');
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#5b9cff;stop-opacity:0.3" />
      <stop offset="100%" style="stop-color:#1a1f2e;stop-opacity:0.5" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#grad)"/>
  <text x="50%" y="50%" font-family="Inter, sans-serif" font-size="${Math.min(width, height) / 20}" fill="#e8edf5" text-anchor="middle" dominant-baseline="middle" opacity="0.7">
    [${text}]
  </text>
  <text x="50%" y="60%" font-family="Inter, sans-serif" font-size="${Math.min(width, height) / 30}" fill="#9ca3af" text-anchor="middle" dominant-baseline="middle" opacity="0.5">
    ${width}×${height} placeholder
  </text>
</svg>`;
}

async function processAssets(assets: ExtractedAsset[]): Promise<void> {
  const assetsDir = path.join(process.cwd(), 'public/assets/stitch');
  
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  
  console.log(`📦 Processing ${assets.length} assets...`);
  
  for (const asset of assets) {
    const dest = path.join(process.cwd(), asset.localPath);
    const filename = path.basename(dest);
    
    // Determine placeholder dimensions based on filename/type
    let width = 800, height = 600;
    if (filename.includes('hero') || filename.includes('background')) {
      width = 1600;
      height = 900;
    } else if (filename.includes('icon')) {
      width = 64;
      height = 64;
    } else if (filename.includes('feature')) {
      width = 1200;
      height = 800;
    }
    
    // Try download if remote URL
    if (asset.originalSrc.startsWith('http')) {
      const success = await downloadAsset(asset.originalSrc, dest);
      if (success) {
        asset.status = 'downloaded';
        console.log(`   ✅ Downloaded: ${filename}`);
        continue;
      }
    }
    
    // Generate placeholder SVG
    const placeholderPath = dest.replace(/\.(png|jpg|jpeg|webp)$/i, '.svg');
    const svg = generatePlaceholderSVG(filename, width, height);
    fs.writeFileSync(placeholderPath, svg);
    asset.localPath = placeholderPath.replace(process.cwd() + '/', '');
    asset.status = 'placeholder';
    console.log(`   📝 Placeholder: ${path.basename(placeholderPath)} (${width}×${height})`);
  }
}

// ============================================================================
// CSS Update
// ============================================================================

function updateTokensCSS(tokens: Map<string, ExtractedToken>): void {
  const cssPath = path.join(process.cwd(), 'src/styles/tokens.css');
  let content = fs.readFileSync(cssPath, 'utf-8');
  
  let replacements = 0;
  
  // Group tokens by category and token name
  const tokenMap = new Map<string, string>();
  tokens.forEach(token => {
    // Use most frequent value for each token name
    if (!tokenMap.has(token.token) || 
        (tokenMap.get(token.token) && token.frequency > 10)) {
      tokenMap.set(token.token, token.value);
    }
  });
  
  // Replace placeholders
  tokenMap.forEach((value, token) => {
    // Match: --token-name: VALUE; /* TODO: ... */
    const pattern = new RegExp(
      `(${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:\\s*)([^;]+)(;[^\\n]*\\/\\* TODO[^\\*]*\\*\\/)?`,
      'g'
    );
    
    const before = content;
    content = content.replace(pattern, `$1${value}$3`);
    
    if (before !== content) {
      replacements++;
    }
  });
  
  fs.writeFileSync(cssPath, content);
  console.log(`✅ Updated ${cssPath} (${replacements} tokens replaced)`);
}

// ============================================================================
// Documentation Generation
// ============================================================================

function generateTokensDoc(tokens: Map<string, ExtractedToken>, assets: ExtractedAsset[]): void {
  const docPath = path.join(process.cwd(), 'docs/ui-stitch-tokens.md');
  let markdown = `# Stitch Design Tokens Mapping\n\n`;
  markdown += `**Generated**: ${new Date().toISOString()}\n`;
  markdown += `**Source**: \`stitch_html/*.html\`\n\n`;
  markdown += `---\n\n`;
  
  // Group by category
  const byCategory = new Map<string, ExtractedToken[]>();
  tokens.forEach(token => {
    const cat = byCategory.get(token.category) || [];
    cat.push(token);
    byCategory.set(token.category, cat);
  });
  
  // Colors
  if (byCategory.has('color')) {
    markdown += `## 🎨 Colors\n\n`;
    markdown += `| Value | Token CSS | Freq | Context | Origin |\n`;
    markdown += `|-------|-----------|------|---------|--------|\n`;
    byCategory.get('color')!
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 20) // Top 20
      .forEach(token => {
        const origins = token.sources.slice(0, 2).join(', ');
        markdown += `| \`${token.value}\` | \`${token.token}\` | ${token.frequency} | ${token.context || 'N/A'} | ${origins} |\n`;
      });
    markdown += `\n`;
  }
  
  // Font Family
  if (byCategory.has('font-family')) {
    markdown += `## 🔤 Font Families\n\n`;
    markdown += `| Value | Token CSS | Freq | Origin |\n`;
    markdown += `|-------|-----------|------|--------|\n`;
    byCategory.get('font-family')!
      .sort((a, b) => b.frequency - a.frequency)
      .forEach(token => {
        markdown += `| \`${token.value}\` | \`${token.token}\` | ${token.frequency} | ${token.sources[0]} |\n`;
      });
    markdown += `\n`;
  }
  
  // Font Sizes
  if (byCategory.has('font-size')) {
    markdown += `## 📏 Font Sizes\n\n`;
    markdown += `| Value | Token CSS | Freq | Origin |\n`;
    markdown += `|-------|-----------|------|--------|\n`;
    byCategory.get('font-size')!
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10)
      .forEach(token => {
        markdown += `| \`${token.value}\` | \`${token.token}\` | ${token.frequency} | ${token.sources[0]} |\n`;
      });
    markdown += `\n`;
  }
  
  // Border Radius
  if (byCategory.has('radius')) {
    markdown += `## ⚪ Border Radius\n\n`;
    markdown += `| Value | Token CSS | Freq | Origin |\n`;
    markdown += `|-------|-----------|------|--------|\n`;
    byCategory.get('radius')!
      .sort((a, b) => b.frequency - a.frequency)
      .forEach(token => {
        markdown += `| \`${token.value}\` | \`${token.token}\` | ${token.frequency} | ${token.sources[0]} |\n`;
      });
    markdown += `\n`;
  }
  
  // Box Shadows
  if (byCategory.has('shadow')) {
    markdown += `## 💫 Box Shadows\n\n`;
    markdown += `| Value | Token CSS | Freq | Origin |\n`;
    markdown += `|-------|-----------|------|--------|\n`;
    byCategory.get('shadow')!
      .sort((a, b) => b.frequency - a.frequency)
      .forEach(token => {
        const shortValue = token.value.length > 50 ? token.value.slice(0, 47) + '...' : token.value;
        markdown += `| \`${shortValue}\` | \`${token.token}\` | ${token.frequency} | ${token.sources[0]} |\n`;
      });
    markdown += `\n`;
  }
  
  // Assets
  if (assets.length > 0) {
    markdown += `## 🖼️ Assets\n\n`;
    markdown += `| Original Source | Local Path | Status | Dimensions |\n`;
    markdown += `|-----------------|------------|--------|------------|\n`;
    assets.forEach(asset => {
      const shortSrc = asset.originalSrc.length > 40 ? '...' + asset.originalSrc.slice(-37) : asset.originalSrc;
      const statusEmoji = asset.status === 'downloaded' ? '✅' : asset.status === 'placeholder' ? '📝' : '⚠️';
      const dims = asset.localPath.includes('hero') ? '1600×900' :
                   asset.localPath.includes('icon') ? '64×64' :
                   asset.localPath.includes('feature') ? '1200×800' : '800×600';
      markdown += `| \`${shortSrc}\` | \`${asset.localPath}\` | ${statusEmoji} ${asset.status} | ${dims} |\n`;
    });
    markdown += `\n`;
  }
  
  markdown += `---\n\n`;
  markdown += `### Legend\n\n`;
  markdown += `- **Freq**: Frequency (number of occurrences in HTML files)\n`;
  markdown += `- **Context**: Where the token is primarily used\n`;
  markdown += `- **✅ downloaded**: Asset successfully downloaded from remote URL\n`;
  markdown += `- **📝 placeholder**: Generated SVG placeholder (replace with real asset)\n`;
  markdown += `- **⚠️ pending**: Asset extraction pending\n\n`;
  markdown += `### Next Steps\n\n`;
  markdown += `1. Review extracted tokens in \`src/styles/tokens.css\`\n`;
  markdown += `2. Replace SVG placeholders with real assets\n`;
  markdown += `3. Run \`pnpm typecheck && pnpm build\` to verify\n`;
  markdown += `4. Test visually with \`?theme=stitch\`\n`;
  
  fs.writeFileSync(docPath, markdown);
  console.log(`✅ Generated ${docPath}`);
}

// ============================================================================
// JSON Export
// ============================================================================

function exportJSON(tokens: Map<string, ExtractedToken>): void {
  const jsonPath = path.join(process.cwd(), 'src/theme/tokens.generated.json');
  
  // Ensure directory exists
  const dir = path.dirname(jsonPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const data = Array.from(tokens.values()).map(token => ({
    value: token.value,
    token: token.token,
    category: token.category,
    frequency: token.frequency,
    context: token.context,
    sources: token.sources.slice(0, 5), // Limit sources for readability
  }));
  
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  console.log(`✅ Exported ${jsonPath}`);
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  console.log(`\n🎨 Stitch Token Extraction Tool\n`);
  
  const htmlDir = path.join(process.cwd(), 'stitch_html');
  const withAssets = process.argv.includes('--with-assets');
  
  // Check if HTML directory exists
  if (!fs.existsSync(htmlDir)) {
    console.error(`❌ Directory ${htmlDir} not found!`);
    console.log(`\n📋 Please create the directory and add Stitch HTML files:`);
    console.log(`   mkdir -p stitch_html`);
    console.log(`   # Then add your HTML files to stitch_html/\n`);
    console.log(`   See docs/stitch-html-setup.md for details.\n`);
    process.exit(1);
  }
  
  // Extract tokens
  console.log(`\n1️⃣  Extracting design tokens...`);
  const tokens = extractTokens(htmlDir);
  
  if (tokens.size === 0) {
    console.warn(`⚠️  No tokens extracted. Check HTML files in ${htmlDir}`);
    process.exit(1);
  }
  
  // Extract assets (if requested)
  let assets: ExtractedAsset[] = [];
  if (withAssets) {
    console.log(`\n2️⃣  Extracting assets...`);
    assets = extractAssets(htmlDir);
    
    if (assets.length > 0) {
      await processAssets(assets);
    }
  }
  
  // Update CSS
  console.log(`\n3️⃣  Updating tokens.css...`);
  updateTokensCSS(tokens);
  
  // Generate documentation
  console.log(`\n4️⃣  Generating documentation...`);
  generateTokensDoc(tokens, assets);
  
  // Export JSON
  console.log(`\n5️⃣  Exporting JSON...`);
  exportJSON(tokens);
  
  // Summary
  console.log(`\n✨ Extraction Complete!\n`);
  console.log(`📊 Summary:`);
  console.log(`   • ${tokens.size} unique tokens extracted`);
  console.log(`   • ${Array.from(new Set(Array.from(tokens.values()).map(t => t.category))).length} categories`);
  if (withAssets) {
    console.log(`   • ${assets.filter(a => a.status === 'downloaded').length} assets downloaded`);
    console.log(`   • ${assets.filter(a => a.status === 'placeholder').length} placeholders generated`);
  }
  console.log(`\n📁 Files updated:`);
  console.log(`   • src/styles/tokens.css`);
  console.log(`   • docs/ui-stitch-tokens.md`);
  console.log(`   • src/theme/tokens.generated.json`);
  if (withAssets && assets.length > 0) {
    console.log(`   • public/assets/stitch/ (${assets.length} assets)`);
  }
  console.log(`\n🎯 Next: Test with ?theme=stitch\n`);
}

// Run
main().catch(err => {
  console.error(`\n❌ Fatal error:`, err);
  process.exit(1);
});
