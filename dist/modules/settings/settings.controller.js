"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRefundReasons = exports.getReturnReasons = exports.createRegion = exports.getRegions = exports.updateStoreSettings = exports.getStoreSettings = void 0;
const settings_service_1 = require("./settings.service");
const getStoreSettings = async (req, res) => {
    try {
        const settings = await settings_service_1.SettingsService.getStoreSettings();
        res.status(200).json({ success: true, settings });
    }
    catch (error) {
        console.error("Fetch store settings error:", error);
        res.status(500).json({ message: "Failed to fetch store settings" });
    }
};
exports.getStoreSettings = getStoreSettings;
const updateStoreSettings = async (req, res) => {
    try {
        const settings = await settings_service_1.SettingsService.updateStoreSettings(req.body);
        res.status(200).json({ success: true, settings });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to update store settings" });
    }
};
exports.updateStoreSettings = updateStoreSettings;
const getRegions = async (req, res) => {
    try {
        const regions = await settings_service_1.SettingsService.getRegions();
        res.status(200).json({ success: true, regions });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch regions" });
    }
};
exports.getRegions = getRegions;
const createRegion = async (req, res) => {
    try {
        const region = await settings_service_1.SettingsService.createRegion(req.body);
        res.status(201).json({ success: true, region });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to create region" });
    }
};
exports.createRegion = createRegion;
const getReturnReasons = async (req, res) => {
    try {
        const reasons = await settings_service_1.SettingsService.getReturnReasons();
        res.status(200).json({ success: true, reasons });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch return reasons" });
    }
};
exports.getReturnReasons = getReturnReasons;
const getRefundReasons = async (req, res) => {
    try {
        const reasons = await settings_service_1.SettingsService.getRefundReasons();
        res.status(200).json({ success: true, reasons });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch refund reasons" });
    }
};
exports.getRefundReasons = getRefundReasons;
