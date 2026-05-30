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
        data: { siteName: "Scarly 2.0" }
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
}
