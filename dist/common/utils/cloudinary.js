"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToCloudinary = exports.upload = void 0;
const cloudinary_1 = require("cloudinary");
const multer_1 = __importDefault(require("multer"));
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
const storage = multer_1.default.memoryStorage();
exports.upload = (0, multer_1.default)({ storage });
const uploadToCloudinary = async (file) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary_1.v2.uploader.upload_stream({ folder: "ecommerce" }, (error, result) => {
            if (error)
                return reject(error);
            resolve(result?.secure_url || "");
        });
        uploadStream.end(file.buffer);
    });
};
exports.uploadToCloudinary = uploadToCloudinary;
