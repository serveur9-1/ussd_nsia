import {logger} from "../utils/logger";
import prisma from "../lib/prisma";
import {AutoDebitSchedule} from "../types/models/autoDebitSchedule";
import {maxNumberRetry} from "../constants/plans";
import NepSouscriptionsRepository from "../repositories/nepSouscriptionRepository";
import {customerPayBleblePlan, customerPayIfohPlan} from "../services/payments/momoPay";
import NafSouscriptionRepository from "../repositories/nafSouscriptionRepository";
import {NafClient} from "../types/models/napClient";

export default async function processAutoDebits() {
	logger.info("[AUTODEBIT_PROCESS_START]");
	
	const autoDebits = await prisma.$queryRaw<AutoDebitSchedule[]>`
        SELECT *
        FROM auto_debit_schedule
       	WHERE status IN ('PENDING', 'SUCCESS', 'FAILED')
        AND DATE_FORMAT(next_debit_date, '%Y-%m-%d %H:%i') <= DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i')
        AND retry_count <= ${maxNumberRetry}
        AND deleted_at IS NULL
        ORDER BY next_debit_date ASC
    ` as AutoDebitSchedule[] || [];
	
	logger.debug(`[AUTODEBIT_COUNT] = ${autoDebits.length}`);
	
	for (const debit of autoDebits) {
		const startProcessing = async () => {
			await prisma.auto_debit_schedule.update({
				where: {id: Number(debit.id)},
				data: {status: 'PROCESSING', processing: true}
			});
		}
		
		await (async () => {
			try {
				logger.info("[AUTODEBIT_START]", {id: debit.id, product: debit.product});
				
				if (debit.product === 'BLEBLE') {
					const result = await NepSouscriptionsRepository.getByIdWithClient(debit.subscription_id);
					
					if (result.status && result.data) {
						await startProcessing()
						
						await customerPayBleblePlan({
							plan: JSON.parse(debit.plan),
							subscription: result.data,
							phoneNumber: String(result.data.MSISDN),
							payload: {}
						});
					}
				}
				
				if (debit.product === 'IFOH') {
					const result = await NafSouscriptionRepository.getByIdWithClient(debit.subscription_id);
					
					if (result.status && result.data) {
						await startProcessing()
						
						await customerPayIfohPlan({
							plan: JSON.parse(debit.plan),
							subscription: result.data as unknown as NafClient,
							phoneNumber: String(result.data.MSISDN),
							payload: {}
						});
					}
				}
				
				logger.info("[AUTODEBIT_SUCCESS]", {id: debit.id});
				
			} catch (err) {
				logger.error("[AUTODEBIT_ERROR]", {id: debit.id, error: err});
				await prisma.auto_debit_schedule.update({
					where: {id: Number(debit.id)},
					data: {
						next_debit_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
						retry_count: debit.retry_count + 1,
						status: 'PENDING',
					}
				});
			} finally {
				await prisma.auto_debit_schedule.update({
					where: {id: Number(debit.id)},
					data: {processing: false}
				});
			}
		})();
	}
	
	logger.info("[AUTODEBIT_PROCESS_END]");
}


