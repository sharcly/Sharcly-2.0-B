import { Router } from "express";
import { createAddress, getAddresses, deleteAddress } from "./address.controller";
import { authenticate } from "../../common/middlewares/auth.middleware";
import { validate, CreateAddressSchema } from "../../common/middlewares/validate.middleware";

const router = Router();

router.use(authenticate);

router.post("/", validate(CreateAddressSchema), createAddress);
router.get("/", getAddresses);
router.delete("/:id", deleteAddress);

export default router;
