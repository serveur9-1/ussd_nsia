import {Request, Response} from "express";
import {webhook} from "./instantPaymentNotificationService.controller";

export default async function instantNotificationPaymentController(req: Request, res: Response) {
	return await webhook(req, res)
}


