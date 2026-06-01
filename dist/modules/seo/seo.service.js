"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeoService = void 0;
const prisma_1 = require("../../common/lib/prisma");
class SeoService {
    static async getSeoBySlug(slug) {
        return await prisma_1.prisma.seoMeta.findUnique({
            where: { pageSlug: slug }
        });
    }
    static async getAllSeo() {
        return await prisma_1.prisma.seoMeta.findMany({
            orderBy: { pageSlug: "asc" }
        });
    }
    static async getSeoById(id) {
        return await prisma_1.prisma.seoMeta.findUnique({
            where: { id }
        });
    }
    static async upsertSeo(seoData) {
        const { pageSlug, title, description, keywords, ogTitle, ogDescription, ogImage, canonicalUrl, robots, structuredData } = seoData;
        return await prisma_1.prisma.seoMeta.upsert({
            where: { pageSlug: pageSlug },
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
    static async deleteSeo(id) {
        return await prisma_1.prisma.seoMeta.delete({
            where: { id }
        });
    }
    static async bulkUpsertSeo(entries) {
        return await prisma_1.prisma.$transaction(entries.map((entry) => prisma_1.prisma.seoMeta.upsert({
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
        })));
    }
    static async generateSitemap() {
        const baseUrl = (process.env.FRONTEND_URL || "https://sharcly.com").replace(/\/$/, "");
        // Fetch active products, categories, blogs
        const [products, categories, blogs] = await Promise.all([
            prisma_1.prisma.product.findMany({
                where: { status: "PUBLISHED" },
                select: { slug: true, updatedAt: true }
            }),
            prisma_1.prisma.category.findMany({
                select: { slug: true, updatedAt: true }
            }),
            prisma_1.prisma.blog.findMany({
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
        let settings = await prisma_1.prisma.globalSeoSettings.findFirst();
        if (!settings) {
            settings = await prisma_1.prisma.globalSeoSettings.create({
                data: { name: "Sharcly" }
            });
        }
        return settings;
    }
    static async updateGlobalSettings(data) {
        const settings = await this.getGlobalSettings();
        return await prisma_1.prisma.globalSeoSettings.update({
            where: { id: settings.id },
            data
        });
    }
}
exports.SeoService = SeoService;
