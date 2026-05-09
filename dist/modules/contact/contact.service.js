"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactService = void 0;
const prisma_1 = require("../../common/lib/prisma");
class ContactService {
    static async createMessage(data) {
        return await prisma_1.prisma.contactMessage.create({
            data: {
                name: data.name,
                email: data.email,
                subject: data.subject,
                message: data.message,
                status: "UNREAD"
            }
        });
    }
    static async getAllMessages() {
        return await prisma_1.prisma.contactMessage.findMany({
            orderBy: { createdAt: "desc" }
        });
    }
    static async updateStatus(id, status) {
        return await prisma_1.prisma.contactMessage.update({
            where: { id },
            data: { status }
        });
    }
    static async deleteMessage(id) {
        return await prisma_1.prisma.contactMessage.delete({
            where: { id }
        });
    }
}
exports.ContactService = ContactService;
