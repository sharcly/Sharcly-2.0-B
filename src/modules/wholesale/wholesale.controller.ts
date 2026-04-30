import { Request, Response } from "express";
import { prisma } from "../../common/lib/prisma";

export class WholesaleController {
  static async createInquiry(req: Request, res: Response) {
    console.log("POST /api/wholesale/inquiries - Body:", req.body);
    try {
      const { 
        businessName, 
        contactName, 
        email, 
        phone, 
        businessType, 
        estimatedVolume, 
        message 
      } = req.body;

      if (!businessName || !contactName || !email || !phone || !businessType) {
        console.warn("Validation Error: Missing required fields in inquiry");
        return res.status(400).json({ error: "Missing required fields" });
      }

      const inquiry = await prisma.wholesaleInquiry.create({
        data: {
          businessName,
          contactName,
          email,
          phone,
          businessType,
          estimatedVolume,
          message,
        },
      });

      console.log("Wholesale Inquiry created:", inquiry.id);
      res.status(201).json({ success: true, data: inquiry });
    } catch (error) {
      console.error("CRITICAL Wholesale Inquiry Error:", error);
      res.status(500).json({ 
        error: "Internal Server Error", 
        message: error instanceof Error ? error.message : "Unknown error",
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      });
    }
  }

  static async getInquiries(req: Request, res: Response) {
    console.log("GET /api/wholesale/inquiries");
    try {
      const inquiries = await prisma.wholesaleInquiry.findMany({
        orderBy: { createdAt: "desc" },
      });
      console.log(`Fetched ${inquiries.length} inquiries`);
      res.json({ success: true, data: inquiries });
    } catch (error) {
      console.error("CRITICAL Fetch Inquiries Error:", error);
      res.status(500).json({ 
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  static async getPlans(req: Request, res: Response) {
    console.log("GET /api/wholesale/plans");
    try {
      const plans = await prisma.pricingPlan.findMany({
        orderBy: { createdAt: "asc" },
      });
      console.log(`Fetched ${plans.length} plans`);
      res.json({ success: true, data: plans });
    } catch (error) {
      console.error("CRITICAL Fetch Plans Error:", error);
      res.status(500).json({ 
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  static async createPlan(req: Request, res: Response) {
    console.log("POST /api/wholesale/plans - Body:", req.body);
    try {
      const { name, minOrder, discount, features, featured } = req.body;

      if (!name || !minOrder || !discount || !features) {
        console.warn("Validation Error: Missing required fields in plan creation");
        return res.status(400).json({ error: "Missing required fields" });
      }

      const plan = await prisma.pricingPlan.create({
        data: {
          name,
          minOrder,
          discount,
          features,
          featured: !!featured,
        },
      });

      console.log("Wholesale Plan created:", plan.id);
      res.status(201).json({ success: true, data: plan });
    } catch (error) {
      console.error("CRITICAL Create Plan Error:", error);
      res.status(500).json({ error: "Internal Server Error", message: error instanceof Error ? error.message : String(error) });
    }
  }

  static async updatePlan(req: Request, res: Response) {
    console.log(`PUT /api/wholesale/plans/${req.params.id} - Body:`, req.body);
    try {
      const { id } = req.params;
      const { name, minOrder, discount, features, featured } = req.body;

      const plan = await prisma.pricingPlan.update({
        where: { id },
        data: {
          name,
          minOrder,
          discount,
          features,
          featured,
        },
      });

      console.log("Wholesale Plan updated:", plan.id);
      res.json({ success: true, data: plan });
    } catch (error) {
      console.error("CRITICAL Update Plan Error:", error);
      res.status(500).json({ error: "Internal Server Error", message: error instanceof Error ? error.message : String(error) });
    }
  }

  static async deletePlan(req: Request, res: Response) {
    console.log(`DELETE /api/wholesale/plans/${req.params.id}`);
    try {
      const { id } = req.params;
      await prisma.pricingPlan.delete({
        where: { id },
      });
      console.log("Wholesale Plan deleted:", id);
      res.json({ success: true, message: "Plan deleted successfully" });
    } catch (error) {
      console.error("CRITICAL Delete Plan Error:", error);
      res.status(500).json({ error: "Internal Server Error", message: error instanceof Error ? error.message : String(error) });
    }
  }
}
