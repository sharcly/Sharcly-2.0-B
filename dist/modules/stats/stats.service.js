"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatsService = void 0;
const prisma_1 = require("../../common/lib/prisma");
const client_1 = require("@prisma/client");
class StatsService {
    static async getDashboardStats() {
        // 1. Core Metrics
        const [totalRevenueResult, customerCount, totalOrders, activeNow] = await Promise.all([
            prisma_1.prisma.order.aggregate({
                where: { status: client_1.OrderStatus.DELIVERED },
                _sum: { totalAmount: true },
            }),
            prisma_1.prisma.user.count({
                where: {
                    userRole: {
                        slug: "user"
                    }
                }
            }),
            prisma_1.prisma.order.count(),
            // Simple "Active Now" estimate: users who created something or registered in the last hour
            prisma_1.prisma.user.count({
                where: {
                    createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }
                }
            })
        ]);
        const totalRevenue = totalRevenueResult._sum.totalAmount || 0;
        // 2. Revenue Graph Data (Last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const orders = await prisma_1.prisma.order.findMany({
            where: {
                createdAt: { gte: sevenDaysAgo },
                status: client_1.OrderStatus.DELIVERED
            },
            select: {
                totalAmount: true,
                createdAt: true
            },
            orderBy: { createdAt: "asc" }
        });
        // Group by day
        const revenueByDay = orders.reduce((acc, order) => {
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
        const recentTransactions = await prisma_1.prisma.order.findMany({
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
                activeNow: activeNow + 5
            },
            chartData,
            recentTransactions: recentTransactions.map(t => ({
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
}
exports.StatsService = StatsService;
