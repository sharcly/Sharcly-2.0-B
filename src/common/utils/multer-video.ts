import multer from "multer";

/**
 * Multer Configuration for Video Uploads
 * - 20MB limit
 * - Strict video mime-type filtering
 */
const storage = multer.memoryStorage();

export const uploadVideo = multer({ 
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only MP4, WebM, MOV, and AVI video formats are allowed."));
    }
  }
});
