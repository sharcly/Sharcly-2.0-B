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
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};
