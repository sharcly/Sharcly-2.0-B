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

  static async generateSitemap() {
    const baseUrl = (process.env.FRONTEND_URL || "https://sharcly.com").replace(/\/$/, "");

    // Fetch active products, categories, blogs
    const [products, categories, blogs] = await Promise.all([
      prisma.product.findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true, updatedAt: true }
      }),
      prisma.category.findMany({
        select: { slug: true, updatedAt: true }
      }),
      prisma.blog.findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true, updatedAt: true }
      })
    ]);

    // Define static pages
    const staticPages = [
      { path: "", changefreq: "daily", priority: "1.0" },
      { path: "/about", changefreq: "monthly", priority: "0.8" },
      { path: "/contact", changefreq: "monthly", priority: "0.8" },
      { path: "/blog", changefreq: "daily", priority: "0.9" },
      { path: "/products", changefreq: "daily", priority: "0.9" }
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    const nowStr = new Date().toISOString();

    // 1. Static Pages
    for (const page of staticPages) {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}${page.path}</loc>\n`;
      xml += `    <lastmod>${nowStr}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `  </url>\n`;
    }

    // 2. Products
    for (const product of products) {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/products/${product.slug}</loc>\n`;
      xml += `    <lastmod>${product.updatedAt.toISOString()}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    }

    // 3. Categories
    for (const category of categories) {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/categories/${category.slug}</loc>\n`;
      xml += `    <lastmod>${category.updatedAt.toISOString()}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += `  </url>\n`;
    }

    // 4. Blogs
    for (const blog of blogs) {
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/blog/${blog.slug}</loc>\n`;
      xml += `    <lastmod>${blog.updatedAt.toISOString()}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.7</priority>\n`;
      xml += `  </url>\n`;
    }

    xml += `</urlset>`;
    return xml;
  }

  // Global Settings
  static async getGlobalSettings() {
    let settings = await prisma.globalSeoSettings.findFirst();
    if (!settings) {
      settings = await prisma.globalSeoSettings.create({
        data: { name: "Sharcly" }
      });
    }
    return settings;
  }

  static async updateGlobalSettings(data: any) {
    const settings = await this.getGlobalSettings();
    const updateData: any = {};
    
    if (data.siteName !== undefined) updateData.name = data.siteName;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.siteDescription !== undefined) updateData.siteDescription = data.siteDescription;
    if (data.googleAnalyticsId !== undefined) updateData.googleAnalyticsId = data.googleAnalyticsId;
    if (data.facebookPixelId !== undefined) updateData.facebookPixelId = data.facebookPixelId;
    if (data.googleSiteVerification !== undefined) updateData.googleSiteVerification = data.googleSiteVerification;
    if (data.klaviyoPublicKey !== undefined) updateData.klaviyoPublicKey = data.klaviyoPublicKey;
    if (data.klaviyoPrivateKey !== undefined) updateData.klaviyoPrivateKey = data.klaviyoPrivateKey;
    if (data.robotsTxt !== undefined) updateData.robotsTxt = data.robotsTxt;
    if (data.globalMetaTags !== undefined) updateData.globalMetaTags = data.globalMetaTags;

    return await prisma.globalSeoSettings.update({
      where: { id: settings.id },
      data: updateData
    });
  }
}
