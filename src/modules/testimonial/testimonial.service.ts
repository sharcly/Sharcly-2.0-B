import { prisma } from "../../common/lib/prisma";

export class TestimonialService {
  static async getAll(params: { featured?: boolean; limit?: number } = {}) {
    const { featured, limit } = params;
    return prisma.testimonial.findMany({
      where: featured ? { featured: true } : {},
      orderBy: [
        { featured: "desc" },
        { createdAt: "desc" }
      ],
      take: limit ? Number(limit) : undefined,
    });
  }

  static async getById(id: string) {
    return prisma.testimonial.findUnique({
      where: { id },
    });
  }

  static async create(data: any) {
    return prisma.testimonial.create({
      data,
    });
  }

  static async update(id: string, data: any) {
    return prisma.testimonial.update({
      where: { id },
      data,
    });
  }

  static async delete(id: string) {
    return prisma.testimonial.delete({
      where: { id },
    });
  }
}
