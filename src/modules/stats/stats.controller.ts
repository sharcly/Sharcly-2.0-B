import { Request, Response } from "express";
import { StatsService } from "./stats.service";

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const data = await StatsService.getDashboardStats();
    res.status(200).json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error("Dashboard Stats Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch dashboard statistics",
      error: error.message
    });
  }
};

export const getSalesAnalytics = async (req: Request, res: Response) => {
  try {
    const { range } = req.query;
    const data = await StatsService.getSalesAnalytics(range as string);
    res.status(200).json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error("Sales Analytics Error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch sales analytics",
      error: error.message
    });
  }
};
