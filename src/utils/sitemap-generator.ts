interface SitemapUrl {
  loc: string;
  lastmod?: string | undefined;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

class SitemapGenerator {
  private urls: SitemapUrl[] = [];
  private baseUrl = 'https://workover.app';

  // Add static pages
  addStaticPages() {
    const staticPages = [
      { path: '/', priority: 1.0, changefreq: 'daily' as const },
      { path: '/spaces', priority: 0.9, changefreq: 'hourly' as const },
      { path: '/events', priority: 0.8, changefreq: 'daily' as const },
      { path: '/networking', priority: 0.7, changefreq: 'weekly' as const },
      { path: '/about', priority: 0.5, changefreq: 'monthly' as const },
      { path: '/privacy', priority: 0.3, changefreq: 'yearly' as const },
      { path: '/terms', priority: 0.3, changefreq: 'yearly' as const },
      { path: '/help', priority: 0.6, changefreq: 'monthly' as const },
      { path: '/contact', priority: 0.5, changefreq: 'monthly' as const },
      { path: '/auth', priority: 0.4, changefreq: 'monthly' as const }
    ];

    staticPages.forEach(page => {
      const url: SitemapUrl = {
        loc: `${this.baseUrl}${page.path}`,
        changefreq: page.changefreq,
        priority: page.priority
      };
      url.lastmod = new Date().toISOString().split('T')[0];
      this.addUrl(url);
    });
  }

  // Add dynamic space pages
  async addSpacePages() {
    try {
      const spaces = await this.fetchSpaces();
      
      spaces.forEach(space => {
        const url: SitemapUrl = {
          loc: `${this.baseUrl}/spaces/${space.id}`,
          changefreq: 'weekly',
          priority: 0.8
        };
        if (space.updated_at) {
          url.lastmod = space.updated_at;
        }
        this.addUrl(url);
      });

      // Add space category pages
      const categories = ['meeting-rooms', 'private-offices', 'hot-desks', 'event-spaces'];
      categories.forEach(category => {
        const url: SitemapUrl = {
          loc: `${this.baseUrl}/spaces/category/${category}`,
          changefreq: 'daily',
          priority: 0.7
        };
        url.lastmod = new Date().toISOString().split('T')[0];
        this.addUrl(url);
      });

      // Add location-based pages
      const locations = await this.fetchPopularLocations();
      locations.forEach(location => {
        const url: SitemapUrl = {
          loc: `${this.baseUrl}/spaces/location/${encodeURIComponent(location.city)}`,
          changefreq: 'daily',  
          priority: 0.7
        };
        url.lastmod = new Date().toISOString().split('T')[0];
        this.addUrl(url);
      });

    } catch (error) {
      console.error('Error adding space pages to sitemap:', error);
    }
  }

  // Add event pages
  async addEventPages() {
    try {
      const events = await this.fetchActiveEvents();
      
      events.forEach(event => {
        const url: SitemapUrl = {
          loc: `${this.baseUrl}/events/${event.id}`,
          changefreq: 'weekly',
          priority: 0.6
        };
        if (event.updated_at) {
          url.lastmod = event.updated_at;
        }
        this.addUrl(url);
      });
    } catch (error) {
      console.error('Error adding event pages to sitemap:', error);
    }
  }

  // Add public profile pages (only if networking is enabled)
  async addProfilePages() {
    try {
      const profiles = await this.fetchPublicProfiles();
      
      profiles.forEach(profile => {
        const url: SitemapUrl = {
          loc: `${this.baseUrl}/profile/${profile.id}`,
          changefreq: 'monthly',
          priority: 0.4
        };
        if (profile.updated_at) {
          url.lastmod = profile.updated_at;
        }
        this.addUrl(url);
      });
    } catch (error) {
      console.error('Error adding profile pages to sitemap:', error);
    }
  }

  // Add blog/help pages
  async addContentPages() {
    const helpPages = [
      'getting-started',
      'booking-guide',
      'host-guide',
      'networking-tips',
      'safety-guidelines',
      'payment-info',
      'cancellation-policy'
    ];

    helpPages.forEach(page => {
      const url: SitemapUrl = {
        loc: `${this.baseUrl}/help/${page}`,
        changefreq: 'monthly',
        priority: 0.5
      };
      url.lastmod = new Date().toISOString().split('T')[0];
      this.addUrl(url);
    });
  }

  // Helper method to add URL
  addUrl(url: SitemapUrl) {
    this.urls.push(url);
  }

  // Generate XML sitemap
  generateXML(): string {
    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n';
    const urlsetOpen = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    const urlsetClose = '</urlset>';

    const urlsXML = this.urls.map(url => {
      let urlXML = '  <url>\n';
      urlXML += `    <loc>${this.escapeXml(url.loc)}</loc>\n`;
      
      if (url.lastmod) {
        urlXML += `    <lastmod>${url.lastmod}</lastmod>\n`;
      }
      
      if (url.changefreq) {
        urlXML += `    <changefreq>${url.changefreq}</changefreq>\n`;
      }
      
      if (url.priority !== undefined) {
        urlXML += `    <priority>${url.priority}</priority>\n`;
      }
      
      urlXML += '  </url>\n';
      return urlXML;
    }).join('');

    return xmlHeader + urlsetOpen + urlsXML + urlsetClose;
  }

  // Generate sitemap index for large sites
  generateSitemapIndex(sitemaps: Array<{ loc: string; lastmod?: string }>): string {
    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>\n';
    const sitemapIndexOpen = '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    const sitemapIndexClose = '</sitemapindex>';

    const sitemapsXML = sitemaps.map(sitemap => {
      let sitemapXML = '  <sitemap>\n';
      sitemapXML += `    <loc>${this.escapeXml(sitemap.loc)}</loc>\n`;
      
      if (sitemap.lastmod) {
        sitemapXML += `    <lastmod>${sitemap.lastmod}</lastmod>\n`;
      }
      
      sitemapXML += '  </sitemap>\n';
      return sitemapXML;
    }).join('');

    return xmlHeader + sitemapIndexOpen + sitemapsXML + sitemapIndexClose;
  }

  // Generate robots.txt content
  generateRobotsTxt(): string {
    return `User-agent: *
Allow: /

# Sitemaps
Sitemap: ${this.baseUrl}/sitemap.xml

# Disallow admin and private areas
Disallow: /admin/
Disallow: /settings/
Disallow: /dashboard/
Disallow: /api/
Disallow: /auth/callback

# Allow important pages
Allow: /spaces/
Allow: /events/
Allow: /help/
Allow: /about
Allow: /contact

# Crawl delay
Crawl-delay: 1`;
  }

  // Helper method to escape XML characters
  private escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case "'": return '&#39;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }

  // Mock data fetchers (replace with actual API calls)
  private async fetchSpaces() {
    return [
      { id: '1', updated_at: '2024-01-15' },
      { id: '2', updated_at: '2024-01-14' }
    ];
  }

  private async fetchPopularLocations() {
    return [
      { city: 'Milano' },
      { city: 'Roma' },
      { city: 'Torino' },
      { city: 'Firenze' },
      { city: 'Bologna' },
      { city: 'Napoli' }
    ];
  }

  private async fetchActiveEvents() {
    return [
      { id: '1', updated_at: '2024-01-15' },
      { id: '2', updated_at: '2024-01-14' }
    ];
  }

  private async fetchPublicProfiles() {
    return [
      { id: '1', updated_at: '2024-01-15' },
      { id: '2', updated_at: '2024-01-14' }
    ];
  }

  // Build complete sitemap
  async build(): Promise<{ xml: string; robotsTxt: string }> {
    this.urls = [];
    
    this.addStaticPages();
    await this.addSpacePages();
    await this.addEventPages();
    await this.addProfilePages();
    await this.addContentPages();

    return {
      xml: this.generateXML(),
      robotsTxt: this.generateRobotsTxt()
    };
  }
}

export const sitemapGenerator = new SitemapGenerator();

export async function generateSitemap(): Promise<void> {
  try {
    const { xml, robotsTxt } = await sitemapGenerator.build();
    console.log('Generated sitemap.xml');
    console.log('Generated robots.txt');
  } catch (error) {
    console.error('Error generating sitemap:', error);
  }
}

export default SitemapGenerator;