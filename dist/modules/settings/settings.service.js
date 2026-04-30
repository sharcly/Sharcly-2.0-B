"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsService = void 0;
const prisma_1 = require("../../common/lib/prisma");
class SettingsService {
    static async getStoreSettings() {
        try {
            console.log("Fetching store settings...");
            let settings = await prisma_1.prisma.storeSettings.findFirst();
            if (!settings) {
                console.log("No store settings found, creating default...");
                settings = await prisma_1.prisma.storeSettings.create({
                    data: {
                        storeName: "Scarly 2.0",
                        currency: "USD",
                        primaryColor: "#062D1B",
                        secondaryColor: "#F0FDF4",
                        buttonRadius: "1.5rem",
                        siteTheme: "light",
                        navbarStyle: "transparent"
                    }
                });
            }
            return settings;
        }
        catch (error) {
            console.error("SettingsService.getStoreSettings error:", error);
            throw error;
        }
    }
    static async updateStoreSettings(settingsData) {
        const existing = await prisma_1.prisma.storeSettings.findFirst();
        // Whitelist allowed fields to prevent accidental injection
        const { storeName, supportEmail, currency, logoUrl, shippingCharge, freeShippingThreshold, taxRate, primaryColor, secondaryColor, buttonRadius, siteTheme, navbarStyle } = settingsData;
        const data = {
            storeName, supportEmail, currency, logoUrl,
            shippingCharge, freeShippingThreshold, taxRate,
            primaryColor, secondaryColor, buttonRadius, siteTheme, navbarStyle
        };
        if (existing) {
            return await prisma_1.prisma.storeSettings.update({
                where: { id: existing.id },
                data
            });
        }
        else {
            return await prisma_1.prisma.storeSettings.create({
                data
            });
        }
    }
    static async getRegions() {
        return await prisma_1.prisma.region.findMany();
    }
    static async createRegion(regionData) {
        const { name, currencyCode, taxRate, countries } = regionData;
        return await prisma_1.prisma.region.create({
            data: { name, currencyCode, taxRate, countries }
        });
    }
    static async getReturnReasons() {
        return await prisma_1.prisma.returnReason.findMany();
    }
    static async getRefundReasons() {
        return await prisma_1.prisma.refundReason.findMany();
    }
}
exports.SettingsService = SettingsService;
