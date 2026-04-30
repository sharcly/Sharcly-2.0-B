import { OAS3Options } from "swagger-jsdoc";

const swaggerOptions: OAS3Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Scarly 2.0 API Documentation",
      version: "1.0.0",
      description: "Comprehensive API documentation for the Scarly 2.0 E-commerce Platform.",
      contact: {
        name: "Scarly Support",
        email: "support@scarly.com",
      },
    },
    servers: [
      {
        url: process.env.BACKEND_URL || "http://localhost:5000",
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string" },
            email: { type: "string" },
            name: { type: "string" },
            role: { type: "string", enum: ["ADMIN", "MANAGER", "CONTENT_MANAGER", "USER"] },
            isEmailVerified: { type: "boolean" },
            isBlocked: { type: "boolean" },
          },
        },
        Product: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            slug: { type: "string" },
            description: { type: "string" },
            price: { type: "number" },
            stock: { type: "integer" },
            categoryId: { type: "string" },
            images: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  url: { type: "string" },
                },
              },
            },
          },
        },
        Order: {
          type: "object",
          properties: {
            id: { type: "string" },
            userId: { type: "string" },
            totalAmount: { type: "number" },
            status: { type: "string", enum: ["PENDING", "SHIPPED", "DELIVERED", "CANCELLED"] },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string" },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/routes/*.ts"], // Path to the API docs
};

export default swaggerOptions;
