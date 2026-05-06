"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactController = void 0;
const contact_service_1 = require("./contact.service");
class ContactController {
    static async createMessage(req, res) {
        try {
            const { name, email, subject, message } = req.body;
            if (!name || !email || !message) {
                return res.status(400).json({ message: "Name, email and message are required" });
            }
            const contactMessage = await contact_service_1.ContactService.createMessage({ name, email, subject: subject || "General Inquiry", message });
            res.status(201).json({ message: "Message sent successfully", data: contactMessage });
        }
        catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
    static async getAllMessages(req, res) {
        try {
            const messages = await contact_service_1.ContactService.getAllMessages();
            res.json(messages);
        }
        catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
    static async updateStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const message = await contact_service_1.ContactService.updateStatus(id, status);
            res.json(message);
        }
        catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
    static async deleteMessage(req, res) {
        try {
            const { id } = req.params;
            await contact_service_1.ContactService.deleteMessage(id);
            res.json({ message: "Message deleted successfully" });
        }
        catch (error) {
            res.status(500).json({ message: error.message });
        }
    }
}
exports.ContactController = ContactController;
