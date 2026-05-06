"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getImage = void 0;
const prisma_1 = require("../../common/lib/prisma");
/**
 * Image Streaming Controller
 * High-performance binary streaming for database-hosted assets.
 */
const getImage = async (req, res) => {
    try {
        const { id } = req.params;
        // UUID validation
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
            return res.status(400).json({ message: "Invalid image ID format" });
        }
        let image = await prisma_1.prisma.productImage.findUnique({
            where: { id: id }
        });
        // If not found in product images, check blog featured images
        if (!image || !image.data) {
            const blog = await prisma_1.prisma.blog.findUnique({
                where: { id: id },
                select: { featuredImageData: true, featuredImageMimeType: true }
            });
            if (blog && blog.featuredImageData) {
                image = {
                    data: blog.featuredImageData,
                    mimeType: blog.featuredImageMimeType
                };
            }
        }
        if (!image || !image.data) {
            console.log(`[ImageServer] 404: Image ${id} not found in database`);
            return res.status(404).json({ message: "Image not found" });
        }
        console.log(`[ImageServer] Streaming asset ${id} (${image.mimeType}) - Size: ${image.data.length} bytes`);
        // Set binary headers for cinematic delivery with CORP relaxation
        res.setHeader("Content-Type", image.mimeType || "image/jpeg");
        res.setHeader("Cache-Control", "public, max-age=2592000"); // 30 days cache
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        return res.send(image.data);
    }
    catch (error) {
        console.error("[ImageServer] Stream failure for ID:", req.params.id, error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.getImage = getImage;
