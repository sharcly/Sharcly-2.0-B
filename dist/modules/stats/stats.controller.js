"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = void 0;
const stats_service_1 = require("./stats.service");
const getDashboardStats = async (req, res) => {
    try {
        const data = await stats_service_1.StatsService.getDashboardStats();
        res.status(200).json({
            success: true,
            data
        });
    }
    catch (error) {
        console.error("Dashboard Stats Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch dashboard statistics",
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};
exports.getDashboardStats = getDashboardStats;
