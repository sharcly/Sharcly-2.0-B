"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSalesAnalytics = exports.getDashboardStats = void 0;
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
            error: error.message
        });
    }
};
exports.getDashboardStats = getDashboardStats;
const getSalesAnalytics = async (req, res) => {
    try {
        const { range } = req.query;
        const data = await stats_service_1.StatsService.getSalesAnalytics(range);
        res.status(200).json({
            success: true,
            data
        });
    }
    catch (error) {
        console.error("Sales Analytics Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch sales analytics",
            error: error.message
        });
    }
};
exports.getSalesAnalytics = getSalesAnalytics;
