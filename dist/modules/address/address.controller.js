"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAddress = exports.getAddresses = exports.createAddress = void 0;
const address_service_1 = require("./address.service");
const createAddress = async (req, res) => {
    try {
        const userId = req.user.id;
        const address = await address_service_1.AddressService.create(userId, req.body);
        res.status(201).json({ success: true, address });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.createAddress = createAddress;
const getAddresses = async (req, res) => {
    try {
        const userId = req.user.id;
        const addresses = await address_service_1.AddressService.getByUser(userId);
        res.status(200).json({ success: true, addresses });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getAddresses = getAddresses;
const deleteAddress = async (req, res) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;
        await address_service_1.AddressService.delete(id, userId);
        res.status(200).json({ success: true, message: "Address deleted" });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteAddress = deleteAddress;
