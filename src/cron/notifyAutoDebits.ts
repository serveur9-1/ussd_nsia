import {logger} from "../utils/logger";
import prisma from "../lib/prisma";
import {AutoDebitSchedule} from "../types/models/autoDebitSchedule";
import NepSouscriptionsRepository from "../repositories/nepSouscriptionRepository";
import NafSouscriptionRepository from "../repositories/nafSouscriptionRepository";
import nsiavieSmsService from "../services/sms/nsiavieSms";
import {TypeProductCommission} from "../types/models/commission";
import {formatDate} from "../utils/format";
import {Plan} from "../types/plan";

export async function notifyAutoDebits() {
	logger.info("[AUTODEBIT_NOTIFY_START]");
	
	const autoDebitsToNotify = await prisma.$queryRaw<AutoDebitSchedule[]>`
    SELECT *
    FROM auto_debit_schedule
    WHERE status IN ('SUCCESS')
      AND DATE_FORMAT(next_debit_date - INTERVAL 1 DAY, '%Y-%m-%d %H:%i') <= DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i')
      AND (notified IS NULL OR notified = 0)
      AND deleted_at IS NULL
    ORDER BY next_debit_date ASC
	` as AutoDebitSchedule[] || [];
	
	
	logger.debug(`[AUTODEBIT_NOTIFY_COUNT] = ${autoDebitsToNotify.length}`);
	
	for (const debit of autoDebitsToNotify) {
		try {
			const sendSms = async ({clientName, clientPhone, product, date}: {
				clientPhone: string,
				clientName: string,
				product: TypeProductCommission,
				date: string
			}) => {
				const title = `Notification de prélèvement ${product}`;
				const plan = JSON.parse(debit.plan) as Plan
				const amount = Number(plan.amount) + plan.fee.value
				
				await nsiavieSmsService({
					clientPhone,
					clientName,
					smsType: title,
					smsDetails: title,
					smsContent: `Votre compte sera prélevé de ${amount.toLocaleString()} FCFA le ${date}. Veuillez vérifier vos fonds pour éviter tout incident.`
				});
				
				await prisma.auto_debit_schedule.update({
					where: {id: Number(debit.id)},
					data: {notified: true}
				});
				
				logger.info("[AUTODEBIT_NOTIFY_SUCCESS]", {id: debit.id});
			};
			
			if (debit.product === 'BLEBLE') {
				const result = await NepSouscriptionsRepository.getByIdWithClient(debit.subscription_id);
				
				if (result.status && result.data) {
					const data = result.data;
					await sendSms({
						clientName: `${data.LAST_NAME} ${data.FIRST_NAME}`,
						clientPhone: String(data.MSISDN),
						product: 'BLEBLE',
						date: formatDate(debit.next_debit_date, 'DD-MM')
					});
				}
			}
			
			if (debit.product === 'IFOH') {
				const result = await NafSouscriptionRepository.getByIdWithClient(debit.subscription_id);
				
				if (result.status && result.data) {
					const data = result.data;
					await sendSms({
						clientName: `${data.LAST_NAME} ${data.FIRST_NAME}`,
						clientPhone: String(data.MSISDN),
						product: 'IFOH',
						date: debit.next_debit_date.toISOString().slice(0, 10)
					});
				}
			}
		} catch (err) {
			logger.error("[AUTODEBIT_NOTIFY_ERROR]", {id: debit.id, error: err});
		}
	}
	
	logger.info("[AUTODEBIT_NOTIFY_END]");
}
