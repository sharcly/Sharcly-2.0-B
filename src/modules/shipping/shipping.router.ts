import { Router } from "express";
import {
  getAllMethods,
  createMethod,
  updateMethod,
  deleteMethod,
  getAllZones,
  getZoneById,
  createZone,
  updateZone,
  deleteZone,
  createRate,
  updateRate,
  deleteRate,
  calculateShipping
} from "./shipping.controller";
import { authenticate, authorize } from "../../common/middlewares/auth.middleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Shipping
 *   description: Shipping Management (Zones, Methods & Rates)
 */

// ─── Public: Calculate shipping ─────────────────────────────────────────────

/**
 * @swagger
 * /api/shipping/calculate:
 *   post:
 *     summary: Calculate shipping options for a cart
 *     tags: [Shipping]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [country]
 *             properties:
 *               country: { type: string, description: "Country code (e.g., IN, US)" }
 *               state: { type: string, description: "State name (optional)" }
 *               weight: { type: number, description: "Total cart weight in grams" }
 *               orderAmount: { type: number, description: "Total cart value" }
 *     responses:
 *       200:
 *         description: Available shipping options with prices
 */
router.post("/calculate", calculateShipping);

// ─── Admin: Shipping Methods ────────────────────────────────────────────────

/**
 * @swagger
 * /api/shipping/methods:
 *   get:
 *     summary: List all shipping methods
 *     tags: [Shipping]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All shipping methods
 */
router.get("/methods", authenticate, authorize("shipping.manage"), getAllMethods);

/**
 * @swagger
 * /api/shipping/methods:
 *   post:
 *     summary: Create a shipping method
 *     tags: [Shipping]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, code]
 *             properties:
 *               name: { type: string, example: "Express" }
 *               code: { type: string, example: "express" }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Shipping method created
 */
router.post("/methods", authenticate, authorize("shipping.manage"), createMethod);

/**
 * @swagger
 * /api/shipping/methods/{id}:
 *   patch:
 *     summary: Update a shipping method
 *     tags: [Shipping]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Method updated
 */
router.patch("/methods/:id", authenticate, authorize("shipping.manage"), updateMethod);

/**
 * @swagger
 * /api/shipping/methods/{id}:
 *   delete:
 *     summary: Delete a shipping method
 *     tags: [Shipping]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Method deleted
 */
router.delete("/methods/:id", authenticate, authorize("shipping.manage"), deleteMethod);

// ─── Admin: Shipping Zones ──────────────────────────────────────────────────

/**
 * @swagger
 * /api/shipping/zones:
 *   get:
 *     summary: List all shipping zones with their rates
 *     tags: [Shipping]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All shipping zones
 */
router.get("/zones", authenticate, authorize("shipping.manage"), getAllZones);

/**
 * @swagger
 * /api/shipping/zones/{id}:
 *   get:
 *     summary: Get a shipping zone details
 *     tags: [Shipping]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Zone details with rates
 */
router.get("/zones/:id", authenticate, authorize("shipping.manage"), getZoneById);

/**
 * @swagger
 * /api/shipping/zones:
 *   post:
 *     summary: Create a shipping zone
 *     tags: [Shipping]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: "Domestic" }
 *               countries: { type: array, items: { type: string }, example: ["IN"] }
 *               states: { type: array, items: { type: string }, example: ["Maharashtra", "Delhi"] }
 *     responses:
 *       201:
 *         description: Shipping zone created
 */
router.post("/zones", authenticate, authorize("shipping.manage"), createZone);

/**
 * @swagger
 * /api/shipping/zones/{id}:
 *   patch:
 *     summary: Update a shipping zone
 *     tags: [Shipping]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Zone updated
 */
router.patch("/zones/:id", authenticate, authorize("shipping.manage"), updateZone);

/**
 * @swagger
 * /api/shipping/zones/{id}:
 *   delete:
 *     summary: Delete a shipping zone
 *     tags: [Shipping]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Zone deleted
 */
router.delete("/zones/:id", authenticate, authorize("shipping.manage"), deleteZone);

// ─── Admin: Shipping Rates ──────────────────────────────────────────────────

/**
 * @swagger
 * /api/shipping/rates:
 *   post:
 *     summary: Create a shipping rate for a zone + method
 *     tags: [Shipping]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [zoneId, methodId, price]
 *             properties:
 *               zoneId: { type: string }
 *               methodId: { type: string }
 *               minWeight: { type: number, default: 0 }
 *               maxWeight: { type: number }
 *               minOrderAmount: { type: number, default: 0 }
 *               price: { type: number }
 *               freeAbove: { type: number }
 *               estimatedDays: { type: integer, default: 5 }
 *     responses:
 *       201:
 *         description: Rate created
 */
router.post("/rates", authenticate, authorize("shipping.manage"), createRate);

/**
 * @swagger
 * /api/shipping/rates/{id}:
 *   patch:
 *     summary: Update a shipping rate
 *     tags: [Shipping]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Rate updated
 */
router.patch("/rates/:id", authenticate, authorize("shipping.manage"), updateRate);

/**
 * @swagger
 * /api/shipping/rates/{id}:
 *   delete:
 *     summary: Delete a shipping rate
 *     tags: [Shipping]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Rate deleted
 */
router.delete("/rates/:id", authenticate, authorize("shipping.manage"), deleteRate);

export default router;
