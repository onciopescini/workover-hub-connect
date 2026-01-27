import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE_URL = 'https://workover.app';

// Static pages with their priorities and change frequencies
const STATIC_PAGES = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/spaces', priority: '0.9', changefreq: 'hourly' },
  { path: '/events', priority: '0.8', changefreq: 'daily' },
  { path: '/networking', priority: '0.7', changefreq: 'weekly' },
  { path: '/about', priority: '0.5', changefreq: 'monthly' },
  { path: '/help', priority: '0.6', changefreq: 'monthly' },
  { path: '/contact', priority: '0.5', changefreq: 'monthly' },
  { path: '/privacy', priority: '0.3', changefreq: 'yearly' },
  { path: '/terms', priority: '0.3', changefreq: 'yearly' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch all published spaces
    const { data: spaces, error: spacesError } = await supabase
      .from('spaces')
      .select('id, title, updated_at, city_name')
      .eq('published', true)
      .order('updated_at', { ascending: false });

    if (spacesError) {
      console.error('Error fetching spaces:', spacesError);
      throw spacesError;
    }

    // Get unique cities for category pages
    const uniqueCities = [...new Set(
      (spaces || [])
        .map(s => s.city_name)
        .filter(Boolean)
    )];

    // Build XML
    const today = new Date().toISOString().split('T')[0];
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Static pages
    for (const page of STATIC_PAGES) {
      xml += `  <url>
    <loc>${BASE_URL}${page.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>\n`;
    }

    // Dynamic space pages
    for (const space of (spaces || [])) {
      const lastmod = space.updated_at 
        ? new Date(space.updated_at).toISOString().split('T')[0]
        : today;
      
      xml += `  <url>
    <loc>${BASE_URL}/space/${space.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>\n`;
    }

    // City landing pages
    for (const city of uniqueCities) {
      xml += `  <url>
    <loc>${BASE_URL}/spaces/location/${encodeURIComponent(city)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>\n`;
    }

    xml += '</urlset>';

    console.log(`[generate-sitemap] Generated sitemap with ${STATIC_PAGES.length} static pages, ${(spaces || []).length} spaces, ${uniqueCities.length} cities`);

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('[generate-sitemap] Error:', error);
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate sitemap</error>',
      {
        status: 500,
        headers: { 'Content-Type': 'application/xml', ...corsHeaders }
      }
    );
  }
});
