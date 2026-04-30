"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CmsService = void 0;
const prisma_1 = require("../../common/lib/prisma");
class CmsService {
    /**
     * Get all content for a specific page
     */
    static async getPageContent(page) {
        const content = await prisma_1.prisma.cmsContent.findMany({
            where: { page }
        });
        // Transform into a key-value object for easier frontend consumption
        return content.reduce((acc, curr) => {
            const sectionKey = curr.section;
            if (!acc[sectionKey])
                acc[sectionKey] = {};
            let val = curr.value;
            if (curr.type === "json") {
                try {
                    val = JSON.parse(curr.value);
                }
                catch (e) {
                    val = curr.value;
                }
            }
            acc[sectionKey][curr.key] = val;
            return acc;
        }, {});
    }
    /**
     * Update or Create CMS content
     */
    static async upsertContent(page, section, key, value, type = "text") {
        return await prisma_1.prisma.cmsContent.upsert({
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
    static async bulkUpdate(page, data) {
        const results = [];
        for (const item of data) {
            const res = await this.upsertContent(page, item.section, item.key, item.value, item.type || "text");
            results.push(res);
        }
        return results;
    }
}
exports.CmsService = CmsService;
