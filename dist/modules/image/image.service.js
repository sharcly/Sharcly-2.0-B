"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processProductMedia = exports.optimizeImage = exports.ImageService = void 0;
const sharp_1 = __importDefault(require("sharp"));
const prisma_1 = require("../../common/lib/prisma");
class ImageService {
    static async optimizeImage(buffer) {
        try {
            return await (0, sharp_1.default)(buffer)
                .resize(800, 800, {
                fit: "inside",
                withoutEnlargement: true
            })
                .webp({ quality: 75 })
                .toBuffer();
        }
        catch (error) {
            console.error("Image optimization error:", error);
            throw new Error("Failed to optimize image");
        }
    }
    static async processProductMedia(files) {
        return await Promise.all(files.map(async (file) => {
            if (file.mimetype === "image/svg+xml") {
                return { data: file.buffer, mimeType: "image/svg+xml" };
            }
            const optimized = await this.optimizeImage(file.buffer);
            return { data: optimized, mimeType: "image/webp" };
        }));
    }
    static async getProductImage(id) {
        return await prisma_1.prisma.productImage.findUnique({
            where: { id }
        });
    }
}
exports.ImageService = ImageService;
// Keeping the original exports for backward compatibility within current turn if needed, 
// though we will update controllers.
exports.optimizeImage = ImageService.optimizeImage.bind(ImageService);
exports.processProductMedia = ImageService.processProductMedia.bind(ImageService);
