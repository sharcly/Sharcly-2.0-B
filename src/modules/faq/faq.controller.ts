import { Request, Response } from "express";
import { prisma } from "../../common/lib/prisma";

export class FaqController {
  static async getFaqs(req: Request, res: Response) {
    try {
      const { activeOnly } = req.query;
      const where = activeOnly === "true" ? { isActive: true } : {};
      
      const faqs = await prisma.faq.findMany({
        where,
        orderBy: [
          { order: "asc" },
          { createdAt: "desc" }
        ],
      });
      res.json({ success: true, data: faqs });
    } catch (error) {
      console.error("Fetch FAQs Error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch FAQs" });
    }
  }

  static async createFaq(req: Request, res: Response) {
    try {
      const { question, answer, category, order, isActive } = req.body;
      
      if (!question || !answer) {
        return res.status(400).json({ success: false, message: "Question and Answer are required" });
      }

      const parsedOrder = order ? parseInt(order) : 1;

      // Shift existing FAQs down to make room
      if (category) {
        await prisma.faq.updateMany({
          where: { category, order: { gte: parsedOrder } },
          data: { order: { increment: 1 } },
        });
      }

      const faq = await prisma.faq.create({
        data: {
          question,
          answer,
          category,
          order: parsedOrder,
          isActive: isActive !== undefined ? isActive : true,
        },
      });
      res.status(201).json({ success: true, data: faq });
    } catch (error) {
      console.error("Create FAQ Error:", error);
      res.status(500).json({ success: false, message: "Failed to create FAQ" });
    }
  }

  static async updateFaq(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { question, answer, category, order, isActive } = req.body;

      const existingFaq = await prisma.faq.findUnique({ where: { id: id as string } });
      if (!existingFaq) {
        return res.status(404).json({ success: false, message: "FAQ not found" });
      }

      const newOrder = order !== undefined ? parseInt(order) : existingFaq.order;
      const newCategory = category || existingFaq.category;

      if (existingFaq.category === newCategory && existingFaq.order !== newOrder) {
        if (newOrder < existingFaq.order) {
          // Moving up, shift items down
          await prisma.faq.updateMany({
            where: {
              category: newCategory,
              order: { gte: newOrder, lt: existingFaq.order },
            },
            data: { order: { increment: 1 } },
          });
        } else if (newOrder > existingFaq.order) {
          // Moving down, shift items up
          await prisma.faq.updateMany({
            where: {
              category: newCategory,
              order: { gt: existingFaq.order, lte: newOrder },
            },
            data: { order: { decrement: 1 } },
          });
        }
      } else if (existingFaq.category !== newCategory) {
        // Changing category
        // 1. Close the gap in the old category
        await prisma.faq.updateMany({
          where: { category: existingFaq.category, order: { gt: existingFaq.order } },
          data: { order: { decrement: 1 } },
        });
        
        // 2. Make room in the new category
        await prisma.faq.updateMany({
          where: { category: newCategory, order: { gte: newOrder } },
          data: { order: { increment: 1 } },
        });
      }

      const faq = await prisma.faq.update({
        where: { id: id as string },
        data: {
          question,
          answer,
          category: newCategory,
          order: newOrder,
          isActive: isActive !== undefined ? isActive : undefined,
        },
      });
      res.json({ success: true, data: faq });
    } catch (error) {
      console.error("Update FAQ Error:", error);
      res.status(500).json({ success: false, message: "Failed to update FAQ" });
    }
  }

  static async deleteFaq(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const existingFaq = await prisma.faq.findUnique({ where: { id: id as string } });
      if (existingFaq) {
         // Close the gap left by the deleted FAQ
         await prisma.faq.updateMany({
           where: { category: existingFaq.category, order: { gt: existingFaq.order } },
           data: { order: { decrement: 1 } },
         });
      }

      await prisma.faq.delete({ where: { id: id as string } });
      res.json({ success: true, message: "FAQ deleted successfully" });
    } catch (error) {
      console.error("Delete FAQ Error:", error);
      res.status(500).json({ success: false, message: "Failed to delete FAQ" });
    }
  }
}
