import {Router} from "express";
import {ussdCustomerController} from "../controllers/customer/ussdCustomer.controller";
import instantPaymentNotificationServiceController from "../controllers/customer/instantPaymentNotificationService.controller";
import corsFilter from "../middlewares/corsFilter";
import getBillController from "../controllers/customer/getBill.controller";

const router = Router();

router.get("/mqash", corsFilter, ussdCustomerController);

router.get('/InstantPaymentNotificationService', corsFilter, instantPaymentNotificationServiceController);
router.post('/InstantPaymentNotificationService', corsFilter, instantPaymentNotificationServiceController);

router.get('/getBill', corsFilter, getBillController);
router.post('/getBill', corsFilter, getBillController);

export default router;
