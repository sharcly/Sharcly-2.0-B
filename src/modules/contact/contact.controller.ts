import { Request, Response } from "express";
import { prisma } from "../../common/lib/prisma";

export class ContactController {
  static async createMessage(req: Request, res: Response) {
    console.log("POST /api/contact - Body:", req.body);
    try {
      const { name, email, subject, message, phone } = req.body;

      if (!name || !email || !message) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Format the message to include the phone number since the DB schema doesn't have a dedicated phone column
      const formattedMessage = phone ? `[Phone: ${phone}]\n${message}` : message;

      const contactMessage = await prisma.contactMessage.create({
        data: {
          name,
          email,
          subject: subject || "General Inquiry",
          message: formattedMessage,
        },
      });

      console.log("Contact message created:", contactMessage.id);
      res.status(201).json({ success: true, data: contactMessage });
    } catch (error) {
      console.error("CRITICAL Contact Message Error:", error);
      res.status(500).json({ 
        message: "Internal Server Error",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  static async getMessages(req: Request, res: Response) {
    console.log("GET /api/contact");
    try {
      const messages = await prisma.contactMessage.findMany({
        orderBy: { createdAt: "desc" },
      });
      res.json({ success: true, data: messages });
    } catch (error) {
      console.error("CRITICAL Fetch Contact Messages Error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  }
}
