import cron from 'node-cron';
import { prisma } from '../../common/lib/prisma';

export class BlogWorker {
  static init() {
    // Run every minute
    cron.schedule('* * * * *', async () => {
      try {
        const now = new Date();
        
        // Find all blogs that are SCHEDULED and their publishedAt date has passed
        const blogsToPublish = await prisma.blog.findMany({
          where: {
            status: "SCHEDULED" as any,
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
            await prisma.blog.update({
              where: { id: blog.id },
              data: { status: "PUBLISHED" as any }
            });
            console.log(`[BlogWorker] Article "${blog.title}" has been live-dispatched.`);
          }
        }
      } catch (error) {
        console.error('[BlogWorker] Critical Error in scheduling sequence:', error);
      }
    });

    console.log('[BlogWorker] Scheduling Signature Initialized. Watching for future sequences...');
  }
}
