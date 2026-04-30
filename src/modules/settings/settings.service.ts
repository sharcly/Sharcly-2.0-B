import { prisma } from "../../common/lib/prisma";

export class SettingsService {
  static async getStoreSettings() {
    try {
      console.log("Fetching store settings...");
      let settings = await prisma.storeSettings.findFirst();
      if (!settings) {
        console.log("No store settings found, creating default...");
        settings = await prisma.storeSettings.create({
          data: { 
            storeName: "Sharcly", 
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
    } catch (error) {
      console.error("SettingsService.getStoreSettings error:", error);
      throw error;
    }
  }

  static async updateStoreSettings(settingsData: any) {
    const existing = await prisma.storeSettings.findFirst();
    
    // Whitelist allowed fields to prevent accidental injection
    const { 
      storeName, supportEmail, currency, logoUrl, 
      shippingCharge, freeShippingThreshold, taxRate,
      primaryColor, secondaryColor, buttonRadius, siteTheme, navbarStyle
    } = settingsData;

    const data = {
      storeName, supportEmail, currency, logoUrl, 
      shippingCharge, freeShippingThreshold, taxRate,
      primaryColor, secondaryColor, buttonRadius, siteTheme, navbarStyle
    };

    if (existing) {
      return await prisma.storeSettings.update({
        where: { id: existing.id },
        data
      });
    } else {
      return await prisma.storeSettings.create({
        data
      });
    }
  }

  static async getRegions() {
    return await prisma.region.findMany();
  }

  static async createRegion(regionData: any) {
    const { name, currencyCode, taxRate, countries } = regionData;
    return await prisma.region.create({
      data: { name, currencyCode, taxRate, countries }
    });
  }

  static async deleteRegion(id: string) {
    return await prisma.region.delete({ where: { id } });
  }

  static async getReturnReasons() {
    return await prisma.returnReason.findMany();
  }

  static async getRefundReasons() {
    return await prisma.refundReason.findMany();
  }
}
