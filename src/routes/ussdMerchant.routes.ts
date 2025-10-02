import {Router} from "express";
import corsFilter from "../middlewares/corsFilter";
import getBillController from "../controllers/merchant/getBill.controller";
import instantPaymentNotificationServiceController
	from "../controllers/merchant/instantPaymentNotificationService.controller";
import instantNotificationPaymentController
	from "../controllers/merchant/instantNotificationPaymentController.controller";
import ussdMerchantController from "../controllers/merchant/ussdMerchant.controller";

const router = Router();

router.get("/mqash", ussdMerchantController);

router.get('/InstantPaymentNotificationService', corsFilter, instantPaymentNotificationServiceController);
router.post('/InstantPaymentNotificationService', corsFilter, instantPaymentNotificationServiceController);

router.get('/InstantNotificationPayment', corsFilter, instantNotificationPaymentController);
router.post('/InstantNotificationPayment', corsFilter, instantNotificationPaymentController);

router.get('/GetBill', corsFilter, getBillController);
router.post('/GetBill', corsFilter, getBillController);

export default router;
