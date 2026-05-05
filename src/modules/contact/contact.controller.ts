import { Request, Response } from "express";
import { ContactService } from "./contact.service";

export class ContactController {
  static async createMessage(req: Request, res: Response) {
    try {
      const { name, email, subject, message } = req.body;
      if (!name || !email || !message) {
        return res.status(400).json({ message: "Name, email and message are required" });
      }

      const contactMessage = await ContactService.createMessage({ name, email, subject: subject || "General Inquiry", message });
      res.status(201).json({ message: "Message sent successfully", data: contactMessage });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async getAllMessages(req: Request, res: Response) {
    try {
      const messages = await ContactService.getAllMessages();
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async updateStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const message = await ContactService.updateStatus(id, status);
      res.json(message);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async deleteMessage(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await ContactService.deleteMessage(id);
      res.json({ message: "Message deleted successfully" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}
