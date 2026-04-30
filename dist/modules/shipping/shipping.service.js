"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShippingService = void 0;
const prisma_1 = require("../../common/lib/prisma");
class ShippingService {
    // Shipping Methods
    static async getAllMethods() {
        return await prisma_1.prisma.shippingMethod.findMany({
            orderBy: { name: "asc" },
            include: { _count: { select: { rates: true } } }
        });
    }
    static async createMethod(methodData) {
        const { name, code, description } = methodData;
        return await prisma_1.prisma.shippingMethod.create({
            data: { name, code, description }
        });
    }
    static async updateMethod(id, methodData) {
        const { name, code, description, isActive } = methodData;
        return await prisma_1.prisma.shippingMethod.update({
            where: { id },
            data: { name, code, description, isActive }
        });
    }
    static async deleteMethod(id) {
        return await prisma_1.prisma.shippingMethod.delete({ where: { id } });
    }
    // Shipping Zones
    static async getAllZones() {
        return await prisma_1.prisma.shippingZone.findMany({
            orderBy: { name: "asc" },
            include: {
                rates: {
                    include: { method: true }
                }
            }
        });
    }
    static async getZoneById(id) {
        return await prisma_1.prisma.shippingZone.findUnique({
            where: { id },
            include: {
                rates: {
                    include: { method: true },
                    orderBy: { price: "asc" }
                }
            }
        });
    }
    static async createZone(zoneData) {
        const { name, countries, states } = zoneData;
        return await prisma_1.prisma.shippingZone.create({
            data: {
                name,
                countries: countries || [],
                states: states || []
            }
        });
    }
    static async updateZone(id, zoneData) {
        const { name, countries, states, isActive } = zoneData;
        return await prisma_1.prisma.shippingZone.update({
            where: { id },
            data: { name, countries, states, isActive }
        });
    }
    static async deleteZone(id) {
        return await prisma_1.prisma.shippingZone.delete({ where: { id } });
    }
    // Shipping Rates
    static async createRate(rateData) {
        const { zoneId, methodId, minWeight, maxWeight, minOrderAmount, price, freeAbove, estimatedDays } = rateData;
        return await prisma_1.prisma.shippingRate.create({
            data: {
                zoneId,
                methodId,
                minWeight: minWeight || 0,
                maxWeight: maxWeight || null,
                minOrderAmount: minOrderAmount || 0,
                price,
                freeAbove: freeAbove || null,
                estimatedDays: estimatedDays || 5
            },
            include: { zone: true, method: true }
        });
    }
    static async updateRate(id, rateData) {
        const { minWeight, maxWeight, minOrderAmount, price, freeAbove, estimatedDays, isActive } = rateData;
        return await prisma_1.prisma.shippingRate.update({
            where: { id },
            data: {
                minWeight,
                maxWeight,
                minOrderAmount,
                price,
                freeAbove,
                estimatedDays,
                isActive
            },
            include: { zone: true, method: true }
        });
    }
    static async deleteRate(id) {
        return await prisma_1.prisma.shippingRate.delete({ where: { id } });
    }
    // Public calculation
    static async calculateShipping(calcData) {
        const { country, state, weight, orderAmount } = calcData;
        const cartWeight = Number(weight) || 0;
        const cartAmount = Number(orderAmount) || 0;
        const zones = await prisma_1.prisma.shippingZone.findMany({
            where: {
                isActive: true,
                OR: [
                    { countries: { has: country } },
                    ...(state ? [{ states: { has: state } }] : [])
                ]
            },
            include: {
                rates: {
                    where: { isActive: true },
                    include: { method: true }
                }
            }
        });
        const options = [];
        for (const zone of zones) {
            for (const rate of zone.rates) {
                if (!rate.method || !rate.method.isActive)
                    continue;
                const minW = Number(rate.minWeight);
                const maxW = rate.maxWeight ? Number(rate.maxWeight) : Infinity;
                const minOrder = Number(rate.minOrderAmount);
                if (cartWeight >= minW && cartWeight <= maxW && cartAmount >= minOrder) {
                    const freeAbove = rate.freeAbove ? Number(rate.freeAbove) : null;
                    const finalPrice = freeAbove && cartAmount >= freeAbove ? 0 : Number(rate.price);
                    options.push({
                        rateId: rate.id,
                        zoneName: zone.name,
                        methodName: rate.method.name,
                        methodCode: rate.method.code,
                        price: finalPrice,
                        estimatedDays: rate.estimatedDays,
                        isFreeShipping: finalPrice === 0
                    });
                }
            }
        }
        return options.sort((a, b) => a.price - b.price);
    }
}
exports.ShippingService = ShippingService;
