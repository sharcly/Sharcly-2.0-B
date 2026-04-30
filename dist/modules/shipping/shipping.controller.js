"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateShipping = exports.deleteRate = exports.updateRate = exports.createRate = exports.deleteZone = exports.updateZone = exports.createZone = exports.getZoneById = exports.getAllZones = exports.deleteMethod = exports.updateMethod = exports.createMethod = exports.getAllMethods = void 0;
const shipping_service_1 = require("./shipping.service");
// Shipping Methods
const getAllMethods = async (req, res) => {
    try {
        const methods = await shipping_service_1.ShippingService.getAllMethods();
        res.status(200).json({ success: true, methods });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch shipping methods" });
    }
};
exports.getAllMethods = getAllMethods;
const createMethod = async (req, res) => {
    try {
        const { name, code } = req.body;
        if (!name || !code) {
            return res.status(400).json({ success: false, message: "name and code are required" });
        }
        const method = await shipping_service_1.ShippingService.createMethod(req.body);
        res.status(201).json({ success: true, method });
    }
    catch (error) {
        if (error.code === "P2002") {
            return res.status(409).json({ success: false, message: "Shipping method with this name or code already exists" });
        }
        res.status(500).json({ success: false, message: "Failed to create shipping method" });
    }
};
exports.createMethod = createMethod;
const updateMethod = async (req, res) => {
    try {
        const { id } = req.params;
        const method = await shipping_service_1.ShippingService.updateMethod(id, req.body);
        res.status(200).json({ success: true, method });
    }
    catch (error) {
        if (error.code === "P2025") {
            return res.status(404).json({ success: false, message: "Shipping method not found" });
        }
        res.status(500).json({ success: false, message: "Failed to update shipping method" });
    }
};
exports.updateMethod = updateMethod;
const deleteMethod = async (req, res) => {
    try {
        const { id } = req.params;
        await shipping_service_1.ShippingService.deleteMethod(id);
        res.status(200).json({ success: true, message: "Shipping method deleted" });
    }
    catch (error) {
        if (error.code === "P2025") {
            return res.status(404).json({ success: false, message: "Shipping method not found" });
        }
        res.status(500).json({ success: false, message: "Failed to delete shipping method" });
    }
};
exports.deleteMethod = deleteMethod;
// Shipping Zones
const getAllZones = async (req, res) => {
    try {
        const zones = await shipping_service_1.ShippingService.getAllZones();
        res.status(200).json({ success: true, zones });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch shipping zones" });
    }
};
exports.getAllZones = getAllZones;
const getZoneById = async (req, res) => {
    try {
        const { id } = req.params;
        const zone = await shipping_service_1.ShippingService.getZoneById(id);
        if (!zone) {
            return res.status(404).json({ success: false, message: "Shipping zone not found" });
        }
        res.status(200).json({ success: true, zone });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch shipping zone" });
    }
};
exports.getZoneById = getZoneById;
const createZone = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: "name is required" });
        }
        const zone = await shipping_service_1.ShippingService.createZone(req.body);
        res.status(201).json({ success: true, zone });
    }
    catch (error) {
        if (error.code === "P2002") {
            return res.status(409).json({ success: false, message: "Zone with this name already exists" });
        }
        res.status(500).json({ success: false, message: "Failed to create shipping zone" });
    }
};
exports.createZone = createZone;
const updateZone = async (req, res) => {
    try {
        const { id } = req.params;
        const zone = await shipping_service_1.ShippingService.updateZone(id, req.body);
        res.status(200).json({ success: true, zone });
    }
    catch (error) {
        if (error.code === "P2025") {
            return res.status(404).json({ success: false, message: "Shipping zone not found" });
        }
        res.status(500).json({ success: false, message: "Failed to update shipping zone" });
    }
};
exports.updateZone = updateZone;
const deleteZone = async (req, res) => {
    try {
        const { id } = req.params;
        await shipping_service_1.ShippingService.deleteZone(id);
        res.status(200).json({ success: true, message: "Shipping zone deleted" });
    }
    catch (error) {
        if (error.code === "P2025") {
            return res.status(404).json({ success: false, message: "Shipping zone not found" });
        }
        res.status(500).json({ success: false, message: "Failed to delete shipping zone" });
    }
};
exports.deleteZone = deleteZone;
// Shipping Rates
const createRate = async (req, res) => {
    try {
        const { zoneId, methodId, price } = req.body;
        if (!zoneId || !methodId || price === undefined) {
            return res.status(400).json({ success: false, message: "zoneId, methodId, and price are required" });
        }
        const rate = await shipping_service_1.ShippingService.createRate(req.body);
        res.status(201).json({ success: true, rate });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Failed to create shipping rate" });
    }
};
exports.createRate = createRate;
const updateRate = async (req, res) => {
    try {
        const { id } = req.params;
        const rate = await shipping_service_1.ShippingService.updateRate(id, req.body);
        res.status(200).json({ success: true, rate });
    }
    catch (error) {
        if (error.code === "P2025") {
            return res.status(404).json({ success: false, message: "Shipping rate not found" });
        }
        res.status(500).json({ success: false, message: "Failed to update shipping rate" });
    }
};
exports.updateRate = updateRate;
const deleteRate = async (req, res) => {
    try {
        const { id } = req.params;
        await shipping_service_1.ShippingService.deleteRate(id);
        res.status(200).json({ success: true, message: "Shipping rate deleted" });
    }
    catch (error) {
        if (error.code === "P2025") {
            return res.status(404).json({ success: false, message: "Shipping rate not found" });
        }
        res.status(500).json({ success: false, message: "Failed to delete shipping rate" });
    }
};
exports.deleteRate = deleteRate;
// Public Calculation
const calculateShipping = async (req, res) => {
    try {
        const { country } = req.body;
        if (!country) {
            return res.status(400).json({ success: false, message: "country is required" });
        }
        const options = await shipping_service_1.ShippingService.calculateShipping(req.body);
        res.status(200).json({ success: true, options });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Failed to calculate shipping" });
    }
};
exports.calculateShipping = calculateShipping;
