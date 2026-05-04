import { Router } from "express";
import { getPaymentMethods, deletePaymentMethod } from "./payment.controller";
import { authenticate } from "../../common/middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

router.get("/", getPaymentMethods);
router.delete("/:id", deletePaymentMethod);

export default router;
