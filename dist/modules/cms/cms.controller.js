"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadCmsImage = exports.updateContent = exports.getPageContent = void 0;
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
const uploadCmsImage = async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }
        const imageId = await cms_service_1.CmsService.uploadImage(file);
        res.status(200).json({ success: true, imageId });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.uploadCmsImage = uploadCmsImage;
