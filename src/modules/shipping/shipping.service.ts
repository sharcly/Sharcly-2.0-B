import { prisma } from "../../common/lib/prisma";

export class ShippingService {
  // Shipping Methods
  static async getAllMethods() {
    return await prisma.shippingMethod.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { rates: true } } }
    });
  }

  static async createMethod(methodData: any) {
    const { name, code, description } = methodData;
    return await prisma.shippingMethod.create({
      data: { name, code, description }
    });
  }

  static async updateMethod(id: string, methodData: any) {
    const { name, code, description, isActive } = methodData;
    return await prisma.shippingMethod.update({
      where: { id },
      data: { name, code, description, isActive }
    });
  }

  static async deleteMethod(id: string) {
    return await prisma.shippingMethod.delete({ where: { id } });
  }

  // Shipping Zones
  static async getAllZones() {
    return await prisma.shippingZone.findMany({
      orderBy: { name: "asc" },
      include: {
        rates: {
          include: { method: true }
        }
      }
    });
  }

  static async getZoneById(id: string) {
    return await prisma.shippingZone.findUnique({
      where: { id },
      include: {
        rates: {
          include: { method: true },
          orderBy: { price: "asc" }
        }
      }
    });
  }

  static async createZone(zoneData: any) {
    const { name, countries, states } = zoneData;
    return await prisma.shippingZone.create({
      data: {
        name,
        countries: countries || [],
        states: states || []
      }
    });
  }

  static async updateZone(id: string, zoneData: any) {
    const { name, countries, states, isActive } = zoneData;
    return await prisma.shippingZone.update({
      where: { id },
      data: { name, countries, states, isActive }
    });
  }

  static async deleteZone(id: string) {
    return await prisma.shippingZone.delete({ where: { id } });
  }

  // Shipping Rates
  static async createRate(rateData: any) {
    const {
      zoneId,
      methodId,
      minWeight,
      maxWeight,
      minOrderAmount,
      price,
      freeAbove,
      estimatedDays
    } = rateData;

    return await prisma.shippingRate.create({
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

  static async updateRate(id: string, rateData: any) {
    const {
      minWeight,
      maxWeight,
      minOrderAmount,
      price,
      freeAbove,
      estimatedDays,
      isActive
    } = rateData;

    return await prisma.shippingRate.update({
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

  static async deleteRate(id: string) {
    return await prisma.shippingRate.delete({ where: { id } });
  }

  // Public calculation
  static async calculateShipping(calcData: any) {
    const { country, state, weight, orderAmount } = calcData;

    const cartWeight = Number(weight) || 0;
    const cartAmount = Number(orderAmount) || 0;

    const zones = await prisma.shippingZone.findMany({
      where: {
        isActive: true,
        OR: [
          { countries: { has: country as string } },
          ...(state ? [{ states: { has: state as string } }] : [])
        ]
      },
      include: {
        rates: {
          where: { isActive: true },
          include: { method: true }
        }
      }
    });

    const options: any[] = [];

    for (const zone of zones) {
      for (const rate of zone.rates) {
        if (!rate.method || !rate.method.isActive) continue;

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
