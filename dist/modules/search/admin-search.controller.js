"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminSearch = void 0;
const prisma_1 = require("../../common/lib/prisma");
const adminSearch = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || typeof q !== "string" || q.length < 2) {
            return res.status(200).json({ success: true, results: { products: [], orders: [], users: [] } });
        }
        const query = q.toLowerCase().trim();
        const [products, orders, users] = await Promise.all([
            // Search Products (all statuses)
            prisma_1.prisma.product.findMany({
                where: {
                    OR: [
                        { name: { contains: query, mode: "insensitive" } },
                        { sku: { contains: query, mode: "insensitive" } },
                    ],
                },
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    status: true,
                    sku: true,
                },
                take: 5,
            }),
            // Search Orders (ID, address, or email/name via user relation)
            prisma_1.prisma.order.findMany({
                where: {
                    OR: [
                        { id: { contains: query, mode: "insensitive" } },
                        { shippingAddress: { contains: query, mode: "insensitive" } },
                        { user: { email: { contains: query, mode: "insensitive" } } },
                        { user: { name: { contains: query, mode: "insensitive" } } },
                    ],
                },
                select: {
                    id: true,
                    status: true,
                    totalAmount: true,
                    createdAt: true,
                    user: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                },
                take: 5,
            }),
            // Search Users
            prisma_1.prisma.user.findMany({
                where: {
                    OR: [
                        { name: { contains: query, mode: "insensitive" } },
                        { email: { contains: query, mode: "insensitive" } },
                    ],
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    userRole: {
                        select: {
                            name: true
                        }
                    }
                },
                take: 5,
            }),
        ]);
        res.status(200).json({
            success: true,
            results: {
                products,
                orders,
                users,
            },
        });
    }
    catch (error) {
        console.error("Admin search error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};
exports.adminSearch = adminSearch;
