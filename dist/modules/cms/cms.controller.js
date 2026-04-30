"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateContent = exports.getPageContent = void 0;
const cms_service_1 = require("./cms.service");
const getPageContent = async (req, res) => {
    try {
        const { page } = req.params;
        const content = await cms_service_1.CmsService.getPageContent(page);
        res.status(200).json({ success: true, content });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getPageContent = getPageContent;
const updateContent = async (req, res) => {
    try {
        const { page, updates } = req.body; // updates: { section, key, value, type }[]
        if (!page || !Array.isArray(updates)) {
            return res.status(400).json({ success: false, message: "Invalid payload" });
        }
        const results = await cms_service_1.CmsService.bulkUpdate(page, updates);
        res.status(200).json({ success: true, message: "Content updated successfully", results });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateContent = updateContent;
