import { prisma } from "../../common/lib/prisma";

export class AddressService {
  static async create(userId: string, data: any) {
    // If it's the first address or set as default, handle default status
    if (data.isDefault) {
      await prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false }
      });
    }

    return await prisma.address.create({
      data: {
        userId,
        street: data.street,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        country: data.country,
        isDefault: data.isDefault || false
      }
    });
  }

  static async getByUser(userId: string) {
    return await prisma.address.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
  }

  static async delete(id: string, userId: string) {
    return await prisma.address.delete({
      where: { id, userId }
    });
  }
}
