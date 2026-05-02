import { Router } from "express";
import { createAddress, getAddresses, deleteAddress, updateAddress, setDefaultAddress } from "./address.controller";
import { authenticate } from "../../common/middlewares/auth.middleware";
import { validate, CreateAddressSchema } from "../../common/middlewares/validate.middleware";

const router = Router();

router.use(authenticate);

router.post("/", validate(CreateAddressSchema), createAddress);
router.get("/", getAddresses);
router.put("/:id", validate(CreateAddressSchema), updateAddress);
router.patch("/:id/default", setDefaultAddress);
router.delete("/:id", deleteAddress);

export default router;
