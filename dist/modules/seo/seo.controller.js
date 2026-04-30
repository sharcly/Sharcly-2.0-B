"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateGlobalSeo = exports.getGlobalSeo = exports.bulkUpsertSeo = exports.deleteSeo = exports.upsertSeo = exports.getSeoById = exports.getAllSeo = exports.getSeoBySlug = void 0;
const seo_service_1 = require("./seo.service");
const getSeoBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const seo = await seo_service_1.SeoService.getSeoBySlug(slug);
        res.status(200).json({ success: true, seo });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch SEO data" });
    }
};
exports.getSeoBySlug = getSeoBySlug;
const getAllSeo = async (req, res) => {
    try {
        const seoEntries = await seo_service_1.SeoService.getAllSeo();
        res.status(200).json({ success: true, seoEntries });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch SEO entries" });
    }
};
exports.getAllSeo = getAllSeo;
const getSeoById = async (req, res) => {
    try {
        const { id } = req.params;
        const seo = await seo_service_1.SeoService.getSeoById(id);
        if (!seo) {
            return res.status(404).json({ success: false, message: "SEO entry not found" });
        }
        res.status(200).json({ success: true, seo });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch SEO entry" });
    }
};
exports.getSeoById = getSeoById;
const upsertSeo = async (req, res) => {
    try {
        if (!req.body.pageSlug) {
            return res.status(400).json({ success: false, message: "pageSlug is required" });
        }
        const seo = await seo_service_1.SeoService.upsertSeo(req.body);
        res.status(200).json({ success: true, message: "SEO settings saved", seo });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Failed to save SEO settings" });
    }
};
exports.upsertSeo = upsertSeo;
const deleteSeo = async (req, res) => {
    try {
        const { id } = req.params;
        await seo_service_1.SeoService.deleteSeo(id);
        res.status(200).json({ success: true, message: "SEO entry deleted" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Failed to delete SEO entry" });
    }
};
exports.deleteSeo = deleteSeo;
const bulkUpsertSeo = async (req, res) => {
    try {
        const { entries } = req.body;
        if (!Array.isArray(entries) || entries.length === 0) {
            return res.status(400).json({ success: false, message: "entries array is required" });
        }
        const results = await seo_service_1.SeoService.bulkUpsertSeo(entries);
        res.status(200).json({ success: true, message: `${results.length} SEO entries saved`, results });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Failed to bulk update SEO" });
    }
};
exports.bulkUpsertSeo = bulkUpsertSeo;
const getGlobalSeo = async (req, res) => {
    try {
        const settings = await seo_service_1.SeoService.getGlobalSettings();
        res.status(200).json({ success: true, settings });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch global SEO" });
    }
};
exports.getGlobalSeo = getGlobalSeo;
const updateGlobalSeo = async (req, res) => {
    try {
        const settings = await seo_service_1.SeoService.updateGlobalSettings(req.body);
        res.status(200).json({ success: true, message: "Global SEO saved", settings });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Failed to save global SEO" });
    }
};
exports.updateGlobalSeo = updateGlobalSeo;
