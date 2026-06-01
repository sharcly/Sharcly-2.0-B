"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvoiceService = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const date_fns_1 = require("date-fns");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
class InvoiceService {
    static async generateInvoiceBuffer(order) {
        return new Promise((resolve, reject) => {
            // A6 size [297.64, 420.94] allows 4 invoices to fit on one A4 sheet
            const doc = new pdfkit_1.default({ size: 'A6', margin: 25 });
            const chunks = [];
            doc.on("data", (chunk) => chunks.push(chunk));
            doc.on("end", () => resolve(Buffer.concat(chunks)));
            doc.on("error", reject);
            this.generateInvoiceContent(doc, order);
            doc.end();
        });
    }
    static async generateInvoice(order, stream) {
        const doc = new pdfkit_1.default({ size: 'A6', margin: 25 });
        doc.pipe(stream);
        this.generateInvoiceContent(doc, order);
        doc.end();
    }
    static generateInvoiceContent(doc, order) {
        const pageWidth = 297.64;
        const pageHeight = 420.94;
        const margin = 25;
        const contentWidth = pageWidth - (margin * 2);
        // --- Header ---
        // Bill From (Left)
        doc
            .fillColor("#000000")
            .font("Helvetica-Bold")
            .fontSize(10)
            .text("BILL FROM:", margin, 30);
        doc
            .font("Helvetica")
            .fontSize(8)
            .text("Sharcly Hardware Store", margin, 45)
            .text("150 Elgin Street, Ottawa, ON", margin, 55)
            .text("Canada | hello@sharcly.com", margin, 65);
        // Logo (Right)
        let logoPath = path_1.default.resolve(process.cwd(), "assets/final-Logo-1.png");
        if (!fs_1.default.existsSync(logoPath)) {
            logoPath = path_1.default.resolve(process.cwd(), "backend/assets/final-Logo-1.png");
        }
        console.log("Logo exists:", fs_1.default.existsSync(logoPath));
        if (fs_1.default.existsSync(logoPath)) {
            doc.image(logoPath, 180, 15, {
                width: 80
            });
        }
        else {
            doc
                .font("Helvetica-Bold")
                .fontSize(24)
                .text("sharcly", pageWidth - margin - 100, 30, { align: "right", width: 100 });
            doc
                .fontSize(6)
                .font("Helvetica")
                .text("PREMIUM STREETWEAR", pageWidth - margin - 100, 55, { align: "right", width: 100 });
        }
        // Divider
        doc.moveTo(margin, 85).lineTo(pageWidth - margin, 85).strokeColor("#eeeeee").lineWidth(1).stroke();
        // --- Bill To & Order Info ---
        const detailTop = 100;
        // Bill To (Left)
        doc
            .font("Helvetica-Bold")
            .fontSize(10)
            .text("BILL TO:", margin, detailTop);
        doc
            .font("Helvetica")
            .fontSize(8)
            .text(order.user.name || "Customer", margin, detailTop + 15)
            .text(order.address || "No address provided", margin, detailTop + 25, { width: 140 })
            .text(order.user.email, margin, detailTop + 45, { width: 140 });
        // Order Meta (Right)
        const metaX = 180;
        const metaW = pageWidth - margin - metaX;
        // Invoice #
        doc.rect(metaX, detailTop, metaW, 20).fill("#f5f5f5");
        doc.fillColor("#000000").font("Helvetica-Bold").fontSize(7).text("INV #", metaX + 5, detailTop + 7);
        doc.font("Helvetica").text(order.id.substring(0, 6).toUpperCase(), metaX + 35, detailTop + 7, { align: "right", width: metaW - 40 });
        // Date
        doc.rect(metaX, detailTop + 22, metaW, 20).fill("#f5f5f5");
        doc.fillColor("#000000").font("Helvetica-Bold").text("DATE", metaX + 5, detailTop + 29);
        doc.font("Helvetica").text((0, date_fns_1.format)(new Date(order.createdAt), "dd/MM/yy"), metaX + 35, detailTop + 29, { align: "right", width: metaW - 40 });
        // Amount Due
        doc.rect(metaX, detailTop + 44, metaW, 25).fill("#e0e0e0");
        doc.fillColor("#000000").font("Helvetica-Bold").fontSize(8).text("TOTAL", metaX + 5, detailTop + 53);
        doc.fontSize(10).text(`$${Number(order.totalAmount).toFixed(2)}`, metaX + 35, detailTop + 51, { align: "right", width: metaW - 40 });
        // --- Items Table ---
        const tableTop = 180;
        const col1 = margin; // Item
        const col3 = 180; // Qty
        const col4 = 210; // Price
        const col5 = 250; // Total
        // Table Header
        doc.rect(margin, tableTop, contentWidth, 15).fill("#e0e0e0");
        doc
            .fillColor("#000000")
            .font("Helvetica-Bold")
            .fontSize(8)
            .text("Item", col1 + 5, tableTop + 4)
            .text("Qty", col3, tableTop + 4, { align: "right", width: 25 })
            .text("Price", col4, tableTop + 4, { align: "right", width: 35 })
            .text("Total", col5, tableTop + 4, { align: "right", width: pageWidth - margin - col5 });
        // Table Rows
        let rowTop = tableTop + 20;
        doc.font("Helvetica").fontSize(7);
        order.items.slice(0, 8).forEach((item, i) => {
            const lineTotal = Number(item.price) * item.quantity;
            doc
                .text(item.product?.name.substring(0, 25) || "Product", col1 + 5, rowTop)
                .text(item.quantity.toString(), col3, rowTop, { align: "right", width: 25 })
                .text(`${Number(item.price).toFixed(0)}`, col4, rowTop, { align: "right", width: 35 })
                .text(`${lineTotal.toFixed(0)}`, col5, rowTop, { align: "right", width: pageWidth - margin - col5 });
            rowTop += 15;
            doc.moveTo(margin, rowTop - 2).lineTo(pageWidth - margin, rowTop - 2).strokeColor("#f0f0f0").lineWidth(0.5).stroke();
        });
        // --- Bottom Section ---
        const bottomTop = Math.max(rowTop + 10, 310);
        // Totals (Right)
        const totalX = 180;
        const totalW = pageWidth - margin - totalX;
        const itemsSubtotal = order.items.reduce((acc, item) => acc + (Number(item.price) * item.quantity), 0);
        doc.fontSize(8);
        // Subtotal
        doc.font("Helvetica-Bold").text("Subtotal", totalX, bottomTop);
        doc.font("Helvetica").text(`$${itemsSubtotal.toFixed(2)}`, totalX, bottomTop, { align: "right", width: totalW });
        // Shipping
        doc.font("Helvetica-Bold").text("Ship", totalX, bottomTop + 15);
        doc.font("Helvetica").text(`$${Number(order.shippingAmount || 0).toFixed(2)}`, totalX, bottomTop + 15, { align: "right", width: totalW });
        // Grand Total
        doc.rect(totalX - 5, bottomTop + 30, totalW + 5, 25).fill("#000000");
        doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(10).text("TOTAL", totalX, bottomTop + 38);
        doc.text(`$${Number(order.totalAmount).toFixed(2)}`, totalX, bottomTop + 38, { align: "right", width: totalW - 5 });
        // --- Footer ---
        doc
            .fontSize(6)
            .fillColor("#aaaaaa")
            .font("Helvetica")
            .text("Thank you for shopping at Sharcly Hardware", margin, 390, { align: "center", width: contentWidth });
    }
}
exports.InvoiceService = InvoiceService;
