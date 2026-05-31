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

      const faq = await prisma.faq.create({
        data: {
          question,
          answer,
          category,
          order: order ? parseInt(order) : 0,
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

      const faq = await prisma.faq.update({
        where: { id: id as string },
        data: {
          question,
          answer,
          category,
          order: order !== undefined ? parseInt(order) : undefined,
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
      await prisma.faq.delete({ where: { id: id as string } });
      res.json({ success: true, message: "FAQ deleted successfully" });
    } catch (error) {
      console.error("Delete FAQ Error:", error);
      res.status(500).json({ success: false, message: "Failed to delete FAQ" });
    }
  }
}
