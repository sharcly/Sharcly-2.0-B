import { prisma } from "../../common/lib/prisma";

export class ContactService {
  static async createMessage(data: { name: string; email: string; subject: string; message: string }) {
    return await prisma.contactMessage.create({
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
    return await prisma.contactMessage.findMany({
      orderBy: { createdAt: "desc" }
    });
  }

  static async updateStatus(id: string, status: string) {
    return await prisma.contactMessage.update({
      where: { id },
      data: { status }
    });
  }

  static async deleteMessage(id: string) {
    return await prisma.contactMessage.delete({
      where: { id }
    });
  }
}
