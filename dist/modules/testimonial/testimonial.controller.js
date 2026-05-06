"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestimonialController = void 0;
const testimonial_service_1 = require("./testimonial.service");
class TestimonialController {
    static async getAll(req, res) {
        try {
            const { featured, limit } = req.query;
            const testimonials = await testimonial_service_1.TestimonialService.getAll({
                featured: featured === "true",
                limit: limit ? parseInt(limit) : undefined
            });
            res.json({ success: true, data: testimonials });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async getById(req, res) {
        try {
            const testimonial = await testimonial_service_1.TestimonialService.getById(req.params.id);
            if (!testimonial) {
                return res.status(404).json({ success: false, message: "Testimonial not found" });
            }
            res.json({ success: true, data: testimonial });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async create(req, res) {
        try {
            const testimonial = await testimonial_service_1.TestimonialService.create(req.body);
            res.status(201).json({ success: true, data: testimonial });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async update(req, res) {
        try {
            const testimonial = await testimonial_service_1.TestimonialService.update(req.params.id, req.body);
            res.json({ success: true, data: testimonial });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
    static async delete(req, res) {
        try {
            await testimonial_service_1.TestimonialService.delete(req.params.id);
            res.json({ success: true, message: "Testimonial deleted successfully" });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}
exports.TestimonialController = TestimonialController;
