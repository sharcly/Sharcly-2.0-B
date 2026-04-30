import { prisma } from "../../common/lib/prisma";

export class CmsService {
  /**
   * Get all content for a specific page
   */
  static async getPageContent(page: string) {
    const content = await prisma.cmsContent.findMany({
      where: { page }
    });
    
    // Transform into a key-value object for easier frontend consumption
    return content.reduce((acc, curr) => {
      const sectionKey = curr.section;
      if (!acc[sectionKey]) acc[sectionKey] = {};
      
      let val: any = curr.value;
      if (curr.type === "json") {
        try { val = JSON.parse(curr.value); } catch (e) { val = curr.value; }
      }
      
      acc[sectionKey][curr.key] = val;
      return acc;
    }, {} as Record<string, any>);
  }

  /**
   * Update or Create CMS content
   */
  static async upsertContent(page: string, section: string, key: string, value: string, type: string = "text") {
    return await prisma.cmsContent.upsert({
      where: {
        page_section_key: { page, section, key }
      },
      update: { value, type },
      create: { page, section, key, value, type }
    });
  }

  /**
   * Bulk update content for a page
   */
  static async bulkUpdate(page: string, data: { section: string; key: string; value: string; type?: string }[]) {
    const results = [];
    for (const item of data) {
      const res = await this.upsertContent(page, item.section, item.key, item.value, item.type || "text");
      results.push(res);
    }
    return results;
  }
}
