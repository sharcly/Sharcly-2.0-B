"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressService = void 0;
const prisma_1 = require("../../common/lib/prisma");
class AddressService {
    static async create(userId, data) {
        // If it's the first address or set as default, handle default status
        if (data.isDefault) {
            await prisma_1.prisma.address.updateMany({
                where: { userId },
                data: { isDefault: false }
            });
        }
        return await prisma_1.prisma.address.create({
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
    static async getByUser(userId) {
        return await prisma_1.prisma.address.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" }
        });
    }
    static async delete(id, userId) {
        return await prisma_1.prisma.address.delete({
            where: { id, userId }
        });
    }
}
exports.AddressService = AddressService;
