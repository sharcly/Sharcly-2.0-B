"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlogWorker = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const prisma_1 = require("../../common/lib/prisma");
class BlogWorker {
    static init() {
        // Run every minute
        node_cron_1.default.schedule('* * * * *', async () => {
            try {
                const now = new Date();
                // Find all blogs that are SCHEDULED and their publishedAt date has passed
                const blogsToPublish = await prisma_1.prisma.blog.findMany({
                    where: {
                        status: "SCHEDULED",
                        publishedAt: {
                            lte: now
                        }
                    },
                    select: {
                        id: true,
                        title: true,
                        status: true
                    }
                });
                if (blogsToPublish.length > 0) {
                    console.log(`[BlogWorker] Found ${blogsToPublish.length} stories ready for dispatch.`);
                    for (const blog of blogsToPublish) {
                        await prisma_1.prisma.blog.update({
                            where: { id: blog.id },
                            data: { status: "PUBLISHED" }
                        });
                        console.log(`[BlogWorker] Article "${blog.title}" has been live-dispatched.`);
                    }
                }
            }
            catch (error) {
                console.error('[BlogWorker] Critical Error in scheduling sequence:', error);
            }
        });
        console.log('[BlogWorker] Scheduling Signature Initialized. Watching for future sequences...');
    }
}
exports.BlogWorker = BlogWorker;
