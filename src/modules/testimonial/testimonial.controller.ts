import { Request, Response } from "express";
import { TestimonialService } from "./testimonial.service";


export class TestimonialController {
  static async getAll(req: Request, res: Response) {
    try {
      const { featured, limit } = req.query;
      const testimonials = await TestimonialService.getAll({
        featured: featured === "true",
        limit: limit ? parseInt(limit as string) : undefined
      });
      res.json({ success: true, data: testimonials });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const testimonial = await TestimonialService.getById(req.params.id);
      if (!testimonial) {
        return res.status(404).json({ success: false, message: "Testimonial not found" });
      }
      res.json({ success: true, data: testimonial });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const testimonial = await TestimonialService.create(req.body);
      res.status(201).json({ success: true, data: testimonial });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const testimonial = await TestimonialService.update(req.params.id, req.body);
      res.json({ success: true, data: testimonial });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      await TestimonialService.delete(req.params.id);
      res.json({ success: true, message: "Testimonial deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}
