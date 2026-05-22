import { prisma } from "../../common/lib/prisma";

export class SeoService {
  static async getSeoBySlug(slug: string) {
    return await prisma.seoMeta.findUnique({
      where: { pageSlug: slug }
    });
  }

  static async getAllSeo() {
    return await prisma.seoMeta.findMany({
      orderBy: { pageSlug: "asc" }
    });
  }

  static async getSeoById(id: string) {
    return await prisma.seoMeta.findUnique({
      where: { id }
    });
  }

  static async upsertSeo(seoData: any) {
    const {
      pageSlug,
      title,
      description,
      keywords,
      ogTitle,
      ogDescription,
      ogImage,
      canonicalUrl,
      robots,
      structuredData
    } = seoData;

    return await prisma.seoMeta.upsert({
      where: { pageSlug: pageSlug as string },
      update: {
        title,
        description,
        keywords,
        ogTitle,
        ogDescription,
        ogImage,
        canonicalUrl,
        robots,
        structuredData
      },
      create: {
        pageSlug,
        title,
        description,
        keywords,
        ogTitle,
        ogDescription,
        ogImage,
        canonicalUrl,
        robots: robots || "index, follow",
        structuredData
      }
    });
  }

  static async deleteSeo(id: string) {
    return await prisma.seoMeta.delete({
      where: { id }
    });
  }

  static async bulkUpsertSeo(entries: any[]) {
    return await prisma.$transaction(
      entries.map((entry: any) =>
        prisma.seoMeta.upsert({
          where: { pageSlug: entry.pageSlug },
          update: {
            title: entry.title,
            description: entry.description,
            keywords: entry.keywords,
            ogTitle: entry.ogTitle,
            ogDescription: entry.ogDescription,
            ogImage: entry.ogImage,
            canonicalUrl: entry.canonicalUrl,
            robots: entry.robots,
            structuredData: entry.structuredData
          },
          create: {
            pageSlug: entry.pageSlug,
            title: entry.title,
            description: entry.description,
            keywords: entry.keywords,
            ogTitle: entry.ogTitle,
            ogDescription: entry.ogDescription,
            ogImage: entry.ogImage,
            canonicalUrl: entry.canonicalUrl,
            robots: entry.robots || "index, follow",
            structuredData: entry.structuredData
          }
        })
      )
    );
  }

  // Global Settings
  static async getGlobalSettings() {
    let settings = await prisma.globalSeoSettings.findFirst();
    if (!settings) {
      settings = await prisma.globalSeoSettings.create({
        data: {
          siteName: "Sharcly 2.0",
          sitemapUrl: "/sitemap.xml",
          robotsTxt: "User-agent: *\nAllow: /\n\nSitemap: https://sharcly.com/sitemap.xml"
        }
      });
    }
    return settings;
  }

  static async updateGlobalSettings(data: any) {
    const settings = await this.getGlobalSettings();
    return await prisma.globalSeoSettings.update({
      where: { id: settings.id },
      data
    });
  }

  static async generateSitemap() {
    const baseUrl = process.env.FRONTEND_URL || "https://sharcly.com";
    const products = await prisma.product.findMany({ select: { slug: true, updatedAt: true } });
    const seoEntries = await prisma.seoMeta.findMany({ select: { pageSlug: true, updatedAt: true } });

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    // Static/Managed Pages
    seoEntries.forEach(entry => {
      const slug = entry.pageSlug === "home" || entry.pageSlug === "/" ? "" : entry.pageSlug;
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/${slug}</loc>\n`;
      xml += `    <lastmod>${entry.updatedAt.toISOString()}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>${slug === "" ? "1.0" : "0.8"}</priority>\n`;
      xml += `  </url>\n`;
    });

    // Dynamic Products
    products.forEach(product => {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/products/${product.slug}</loc>\n`;
      xml += `    <lastmod>${product.updatedAt.toISOString()}</lastmod>\n`;
      xml += `    <changefreq>daily</changefreq>\n`;
      xml += `    <priority>0.9</priority>\n`;
      xml += `  </url>\n`;
    });

    xml += `</urlset>`;
    return xml;
  }

  static async generateRobots() {
    const settings = await this.getGlobalSettings();
    if (settings.robotsTxt) return settings.robotsTxt;

    const baseUrl = process.env.FRONTEND_URL || "https://sharcly.com";
    return `User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}/sitemap.xml`;
  }
}
