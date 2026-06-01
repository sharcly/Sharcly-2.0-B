"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCmsVideo = exports.streamVideo = exports.getHeroVideo = exports.uploadCmsVideo = exports.uploadCmsImage = exports.updateContent = exports.getPageContent = void 0;
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
/**
 * Upload a hero video (max 20MB)
 * Replaces any existing video with the same purpose
 */
const uploadCmsVideo = async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ success: false, message: "No video file uploaded" });
        }
        const purpose = req.body.purpose || "hero";
        const video = await cms_service_1.CmsService.uploadVideo(file, purpose);
        res.status(200).json({
            success: true,
            video: {
                id: video.id,
                mimeType: video.mimeType,
                purpose: video.purpose,
                fileName: video.fileName,
                fileSize: video.fileSize,
                createdAt: video.createdAt
            }
        });
    }
    catch (error) {
        console.error("[CMS] Video upload failed:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.uploadCmsVideo = uploadCmsVideo;
/**
 * Get metadata for the hero video (or by purpose)
 */
const getHeroVideo = async (req, res) => {
    try {
        const purpose = req.query.purpose || "hero";
        const video = await cms_service_1.CmsService.getVideoByPurpose(purpose);
        // Return 200 with null video instead of 404 to avoid noisy console errors
        res.status(200).json({ success: true, video: video || null });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getHeroVideo = getHeroVideo;
/**
 * Stream a video by ID (binary delivery)
 */
const streamVideo = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id || id === "undefined" || id === "null") {
            return res.status(400).json({ message: "Valid video ID is required" });
        }
        const video = await cms_service_1.CmsService.getVideoData(id);
        if (!video || !video.data) {
            return res.status(404).json({ message: "Video not found" });
        }
        console.log(`[CMS Video] Streaming video ${id} (${video.mimeType}) - Size: ${video.data.length} bytes`);
        res.setHeader("Content-Type", video.mimeType || "video/mp4");
        res.setHeader("Content-Length", video.data.length.toString());
        res.setHeader("Cache-Control", "public, max-age=2592000"); // 30 days cache
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        res.setHeader("Accept-Ranges", "bytes");
        return res.send(video.data);
    }
    catch (error) {
        console.error("[CMS Video] Stream failure for ID:", req.params.id, error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.streamVideo = streamVideo;
/**
 * Delete a video by ID
 */
const deleteCmsVideo = async (req, res) => {
    try {
        const { id } = req.params;
        await cms_service_1.CmsService.deleteVideo(id);
        res.status(200).json({ success: true, message: "Video deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteCmsVideo = deleteCmsVideo;
