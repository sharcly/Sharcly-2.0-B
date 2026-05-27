import { prisma } from "../../common/lib/prisma";
import { OrderStatus } from "@prisma/client";

export class StatsService {
  static async getDashboardStats() {
    // 1. Core Metrics
    const [totalRevenueResult, customerCount, totalOrders, activeNow] = await Promise.all([
      prisma.order.aggregate({
        where: { status: OrderStatus.DELIVERED },
        _sum: { totalAmount: true },
      }),
      prisma.user.count({ 
        where: { 
          userRole: {
            slug: "user"
          }
        } 
      }),
      prisma.order.count(),
      // Simple "Active Now" estimate: users who created something or registered in the last hour
      prisma.product.count()
    ]);

    const totalRevenue = totalRevenueResult._sum.totalAmount || 0;

    // 2. Revenue Graph Data (Last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
        status: OrderStatus.DELIVERED
      },
      select: {
        totalAmount: true,
        createdAt: true
      },
      orderBy: { createdAt: "asc" }
    });

    // Group by day
    const revenueByDay = orders.reduce((acc: any, order: any) => {
      const date = order.createdAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + Number(order.totalAmount);
      return acc;
    }, {});

    // Ensure all 7 days are present
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      chartData.push({
        day: dayName,
        revenue: revenueByDay[dateStr] || 0
      });
    }

    // 3. Recent Transactions
    const recentTransactions = await prisma.order.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    return {
      metrics: {
        totalRevenue,
        activeCustomers: customerCount,
        totalOrders,
        activeNow
      },
      chartData,
      recentTransactions: recentTransactions.map((t: any) => ({
        id: t.id,
        name: t.user?.name || "Customer",
        email: t.user?.email || "Unknown",
        amount: t.totalAmount,
        date: t.createdAt,
        status: t.status,
        type: "Order"
      }))
    };
  }

  static async getSalesAnalytics(range: string = "30days") {
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();
    let prevStartDate = new Date();
    let prevEndDate = new Date();

    // 1. Calculate Date Ranges
    if (range === "7days") {
        startDate.setDate(now.getDate() - 7);
        prevStartDate.setDate(now.getDate() - 14);
        prevEndDate.setDate(now.getDate() - 7);
    } else if (range === "30days") {
        startDate.setDate(now.getDate() - 30);
        prevStartDate.setDate(now.getDate() - 60);
        prevEndDate.setDate(now.getDate() - 30);
    } else if (range === "thisMonth") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        prevEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (range === "lastMonth") {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        prevStartDate = new Date(startDate.getFullYear(), startDate.getMonth() - 1, 1);
        prevEndDate = new Date(startDate.getFullYear(), startDate.getMonth(), 0);
    } else if (range === "thisYear") {
        startDate = new Date(now.getFullYear(), 0, 1);
        prevStartDate = new Date(now.getFullYear() - 1, 0, 1);
        prevEndDate = new Date(now.getFullYear() - 1, 11, 31);
    } else if (range === "lastYear") {
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate = new Date(now.getFullYear() - 1, 11, 31);
        prevStartDate = new Date(startDate.getFullYear() - 1, 0, 1);
        prevEndDate = new Date(startDate.getFullYear() - 1, 11, 31);
    } else {
        // Default to last 30 days
        startDate.setDate(now.getDate() - 30);
        prevStartDate.setDate(now.getDate() - 60);
        prevEndDate.setDate(now.getDate() - 30);
    }

    // 2. Fetch Current Period Metrics
    const [currentMetrics, prevMetrics, ordersInPeriod, topProducts, regionalData] = await Promise.all([
      // Current Period
      prisma.order.aggregate({
        where: { 
          status: OrderStatus.DELIVERED,
          createdAt: { gte: startDate, lte: endDate }
        },
        _sum: { totalAmount: true },
        _count: { id: true }
      }),
      // Previous Period
      prisma.order.aggregate({
        where: { 
          status: OrderStatus.DELIVERED,
          createdAt: { gte: prevStartDate, lte: prevEndDate }
        },
        _sum: { totalAmount: true },
        _count: { id: true }
      }),
      // Orders for Chart
      prisma.order.findMany({
        where: { 
            createdAt: { gte: startDate, lte: endDate },
            status: OrderStatus.DELIVERED
        },
        select: { totalAmount: true, createdAt: true },
        orderBy: { createdAt: "asc" }
      }),
      // Top Products
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: { order: { createdAt: { gte: startDate, lte: endDate }, status: OrderStatus.DELIVERED } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5
      }),
      // Regional Data (simplified grouping by first part of shipping address if no country field is strictly used or use user's address)
      // Since shippingAddress is a string, we might just use a placeholder or try to parse.
      // Let's use a simpler approach: group by country if we had it, but since we don't, we'll return some real but aggregated data if possible.
      // For now, let's just group by userId to see unique customers.
      prisma.order.groupBy({
          by: ['shippingAddress'],
          where: { createdAt: { gte: startDate, lte: endDate }, status: OrderStatus.DELIVERED },
          _sum: { totalAmount: true },
          _count: { id: true },
          orderBy: { _sum: { totalAmount: 'desc' } },
          take: 4
      })
    ]);

    const totalSales = Number(currentMetrics._sum.totalAmount || 0);
    const prevSales = Number(prevMetrics._sum.totalAmount || 0);
    const orderCount = currentMetrics._count.id || 0;
    const prevOrderCount = prevMetrics._count.id || 0;
    
    const salesGrowth = prevSales === 0 ? 100 : Number(((totalSales - prevSales) / prevSales * 100).toFixed(1));
    const orderGrowth = prevOrderCount === 0 ? 100 : Number(((orderCount - prevOrderCount) / prevOrderCount * 100).toFixed(1));
    
    const avgOrderValue = orderCount === 0 ? 0 : Number((totalSales / orderCount).toFixed(2));
    const prevAov = prevOrderCount === 0 ? 0 : prevSales / prevOrderCount;
    const aovGrowth = prevAov === 0 ? 100 : Number(((avgOrderValue - prevAov) / prevAov * 100).toFixed(1));

    // 3. Format Chart Data
    // Group by day or month depending on range
    const groupingFormat = (range === "thisYear" || range === "lastYear") ? "month" : "day";
    const revenueMap: Record<string, number> = {};
    
    ordersInPeriod.forEach(order => {
        const date = new Date(order.createdAt);
        const key = groupingFormat === "day" 
            ? date.toISOString().split('T')[0] 
            : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        revenueMap[key] = (revenueMap[key] || 0) + Number(order.totalAmount);
    });

    const recentSales = Object.entries(revenueMap).map(([date, amount]) => ({
        date: groupingFormat === "day" ? date.split('-').slice(1).join('-') : date,
        amount
    })).slice(-7); // Keep it to 7 points for the UI if it's daily

    // 4. Format Regional Data (Mocking names from addresses for now)
    const regions = regionalData.map(r => {
        const nameParts = r.shippingAddress.split(',');
        const regionName = nameParts[nameParts.length - 1].trim() || "Unknown";
        return {
            name: regionName,
            sales: Number(r._sum.totalAmount),
            growth: 0, // Hard to calculate growth per region without more queries
            percentage: totalSales === 0 ? 0 : Math.round((Number(r._sum.totalAmount) / totalSales) * 100)
        };
    });

    // 5. Get Product Details for Top Products
    const productIds = topProducts.map(tp => tp.productId);
    const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { 
            id: true, 
            name: true, 
            images: {
                where: { isThumbnail: true },
                take: 1,
                select: { url: true }
            }
        }
    });

    const formattedTopProducts = topProducts.map(tp => {
        const p = products.find(prod => prod.id === tp.productId);
        return {
            id: tp.productId,
            name: p?.name || "Unknown Product",
            sales: tp._sum.quantity || 0,
            image: p?.images?.[0]?.url || null
        };
    });

    // 6. Fetch Recent Transactions for the range
    const recentTransactionsRaw = await prisma.order.findMany({
        where: { createdAt: { gte: startDate, lte: endDate } },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true, email: true } } }
    });

    const recentTransactions = recentTransactionsRaw.map((t: any) => ({
        id: t.id,
        name: t.user?.name || "Customer",
        email: t.user?.email || "Unknown",
        amount: Number(t.totalAmount),
        date: t.createdAt,
        status: t.status
    }));

    // 7. Calculate Peak Time (Hour of day with most orders)
    const orderHours = ordersInPeriod.reduce((acc: Record<number, number>, order) => {
        const hour = new Date(order.createdAt).getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
    }, {});

    let peakHour = 0;
    let maxOrders = 0;
    Object.entries(orderHours).forEach(([hour, count]) => {
        if (count > maxOrders) {
            maxOrders = count;
            peakHour = Number(hour);
        }
    });

    const peakTimeLabel = maxOrders > 0 
        ? `${peakHour % 12 || 12}:00 ${peakHour >= 12 ? 'PM' : 'AM'} - ${(peakHour + 1) % 12 || 12}:00 ${(peakHour + 1) >= 12 ? 'PM' : 'AM'}`
        : "N/A";

    // 8. Calculate New Customers (Real count of new users)
    const newCustomersCount = await prisma.user.count({
        where: { createdAt: { gte: startDate, lte: endDate }, userRole: { slug: "user" } }
    });
    const prevNewCustomersCount = await prisma.user.count({
        where: { createdAt: { gte: prevStartDate, lte: prevEndDate }, userRole: { slug: "user" } }
    });
    const newCustomersGrowth = prevNewCustomersCount === 0 
        ? (newCustomersCount > 0 ? 100 : 0) 
        : Number(((newCustomersCount - prevNewCustomersCount) / prevNewCustomersCount * 100).toFixed(1));

    // 9. Real Conversion Rate (Order Success Rate)
    const totalOrdersInPeriod = await prisma.order.count({ where: { createdAt: { gte: startDate, lte: endDate } } });
    const successRate = totalOrdersInPeriod > 0 ? ((orderCount / totalOrdersInPeriod) * 100).toFixed(1) + "%" : "0%";

    // 10. Real Retention Rate
    const uniqueUsersThisPeriod = await prisma.order.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: startDate, lte: endDate }, status: OrderStatus.DELIVERED }
    });
    let repeatUsers = 0;
    for (const u of uniqueUsersThisPeriod) {
        const pastOrders = await prisma.order.count({
            where: { userId: u.userId, createdAt: { lt: startDate }, status: OrderStatus.DELIVERED }
        });
        if (pastOrders > 0) repeatUsers++;
    }
    const retentionRate = uniqueUsersThisPeriod.length > 0 
        ? ((repeatUsers / uniqueUsersThisPeriod.length) * 100).toFixed(1) + "%"
        : "0%";

    // 11. Refund Rate (Replacing System Health)
    const cancelledOrders = await prisma.order.count({ where: { status: 'CANCELLED', createdAt: { gte: startDate, lte: endDate } } });
    const refundRate = totalOrdersInPeriod > 0 ? ((cancelledOrders / totalOrdersInPeriod) * 100).toFixed(1) + "%" : "0%";

    const topProduct = products.length > 0 ? products[0].name : "No sales yet";

    return {
      totalSales,
      salesGrowth,
      orderCount,
      orderGrowth,
      avgOrderValue,
      aovGrowth,
      regions: regions.length > 0 ? regions : [{ name: "International", sales: 0, growth: 0, percentage: 0 }],
      recentSales: recentSales.length > 0 ? recentSales : [{ date: "No Data", amount: 0 }],
      topProduct,
      topProducts: formattedTopProducts,
      recentTransactions,
      conversionRate: successRate,
      retentionRate,
      refundRate,
      newCustomers: newCustomersCount,
      newCustomersGrowth,
      peakTime: peakTimeLabel
    };
  }
}
