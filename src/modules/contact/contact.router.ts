import { Router } from "express";
import { ContactController } from "./contact.controller";

const router = Router();

router.post("/", ContactController.createMessage);
router.get("/", ContactController.getMessages);

export default router;
