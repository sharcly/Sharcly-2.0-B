"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestimonialService = void 0;
const prisma_1 = require("../../common/lib/prisma");
class TestimonialService {
    static async getAll(params = {}) {
        const { featured, limit } = params;
        return prisma_1.prisma.testimonial.findMany({
            where: featured ? { featured: true } : {},
            orderBy: [
                { featured: "desc" },
                { createdAt: "desc" }
            ],
            take: limit ? Number(limit) : undefined,
        });
    }
    static async getById(id) {
        return prisma_1.prisma.testimonial.findUnique({
            where: { id },
        });
    }
    static async create(data) {
        return prisma_1.prisma.testimonial.create({
            data,
        });
    }
    static async update(id, data) {
        return prisma_1.prisma.testimonial.update({
            where: { id },
            data,
        });
    }
    static async delete(id) {
        return prisma_1.prisma.testimonial.delete({
            where: { id },
        });
    }
}
exports.TestimonialService = TestimonialService;
