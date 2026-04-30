import { Router } from "express";
import { getImage } from "./image.controller";

const router = Router();

/**
 * @swagger
 * /api/images/{id}:
 *   get:
 *     summary: Stream a binary image asset
 *     tags: [Media]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Binary image data stream
 */
router.get("/:id", getImage);

export default router;
