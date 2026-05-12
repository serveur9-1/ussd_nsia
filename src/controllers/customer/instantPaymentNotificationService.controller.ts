import {Request, Response} from "express";
import FactureRepository from "../../repositories/factureRepository";
import NepSouscriptionsRepository from "../../repositories/nepSouscriptionRepository";
import NafSouscriptionRepository from "../../repositories/nafSouscriptionRepository";
import NafPaiementRepository from "../../repositories/nafPaiementRepository";
import NsiaAutresProduitsRepository from "../../repositories/nsiaAutresProduitsRepository";
import AutoDebitScheduleRepository from "../../repositories/autoDebitScheduleRepository";
import utilitiesDate from "../../utils/date";
import {logger} from "../../utils/logger";
import {TimeUnit} from "../../types/appTypes";
import {Plans, TypeFrequencyPlan} from "../../types/plan";
import {customerPlansBleble, customerPlansIfoh, maxNumberRetry} from "../../constants/plans";
import NepPaiementRepository from "../../repositories/nepPaiementRepository";
import {TypeProductCommission} from "../../types/models/commission";
import {AutoDebitStatus} from "../../types/models/autoDebitSchedule";
import {scheduleEvoMomoPaymentAfterIpn} from "../../services/integrations/scheduleEvoMomoPayment";

/** qs/Express may coerce `ResponseCode=01` to number `1`, breaking `=== "01"`. */
function normalizeBillmapResponseCode(raw: unknown): string {
	const s = String(raw ?? "").trim();
	if (s === "1") return "01";
	return s;
}

function extractParams(req: Request) {
	const q = req.query ?? {};
	const b = req.body ?? {};
	const ewpFromQuery =
		q.EWPTransactionId ??
		b.EWPTransactionId ??
		q.ExternalTransactionId ??
		b.ExternalTransactionId ??
		"";
	return {
		reference: String(q.Reference || b.Reference || ""),
		amount: String(q.Amount || b.Amount || ""),
		msisdn: String(q.MSISDN || b.MSISDN || ""),
		billMapTransactionId: String(q.BillMapTransactionId || b.BillMapTransactionId || ""),
		eWPTransactionId: String(ewpFromQuery),
		responseCode: normalizeBillmapResponseCode(q.ResponseCode ?? b.ResponseCode ?? ""),
		responseMessage: String(q.ResponseMessage || b.ResponseMessage || "")
	};
}

export async function handleAutoDebitSchedule(
	paiement: any,
	action: string,
	product: TypeProductCommission,
	retryIncrement = 0,
	plans: Plans
) {
	const plan = Object.values(plans).find(p => (p.action === action) && p.autoDebit.enabled);
	if (!plan) return;
	
	const existingAutoDebit = await AutoDebitScheduleRepository.getOne({
		product,
		subscription_id: paiement.ID_SOUSCRIPTION
	});
	
	if (!plan.amount) {
		if (existingAutoDebit.status && existingAutoDebit.data) {
			await AutoDebitScheduleRepository.delete(Number(existingAutoDebit.data?.id))
		}
		
		return
	}
	
	const nextDate = retryIncrement === 0
		? utilitiesDate.parseToDate(utilitiesDate.getNextPaymentDate({
				frequency: plan.autoDebit.frequency as TypeFrequencyPlan,
				interval: plan.autoDebit.interval ?? 1,
				withTime: true
			})
		)
		: new Date(Date.now() + 24 * 60 * 60 * 1000);
	
	let newStatus: AutoDebitStatus = retryIncrement === 0 ? "SUCCESS" : "PENDING";
	
	if (existingAutoDebit.status && existingAutoDebit.data) {
		const samePlan = JSON.stringify(existingAutoDebit.data.plan) === JSON.stringify(plan);
		
		let retryCount = existingAutoDebit.data.retry_count;
		
		if (retryIncrement === 0 || !samePlan) {
			retryCount = 0;
		} else {
			retryCount += retryIncrement;
		}
		
		if (retryCount > maxNumberRetry) {
			newStatus = 'FAILED'
		}
		
		if (newStatus === 'FAILED') {
			await AutoDebitScheduleRepository.update(Number(existingAutoDebit.data.id), {
				plan: JSON.stringify(plan),
				next_debit_date: nextDate,
				retry_count: retryCount,
				status: newStatus,
				notified: retryIncrement !== 0,
				deleted_at: new Date()
			});
			
			const date = utilitiesDate.parseToDate(utilitiesDate.getNextPaymentDate({
					frequency: plan.autoDebit.frequency as TypeFrequencyPlan,
					interval: plan.autoDebit.interval ?? 1,
					withTime: true
				})
			)
			
			await AutoDebitScheduleRepository.insert({
				plan: JSON.stringify(plan),
				product,
				next_debit_date: date,
				retry_count: 0,
				subscription_id: paiement.ID_SOUSCRIPTION,
				status: 'PENDING',
				notified: false
			});
		} else {
			await AutoDebitScheduleRepository.update(Number(existingAutoDebit.data.id), {
				plan: JSON.stringify(plan),
				next_debit_date: nextDate,
				retry_count: retryCount,
				status: newStatus,
				notified: retryIncrement !== 0
			});
		}
	} else {
		await AutoDebitScheduleRepository.insert({
			plan: JSON.stringify(plan),
			product,
			next_debit_date: nextDate,
			retry_count: retryIncrement,
			subscription_id: paiement.ID_SOUSCRIPTION,
			status: newStatus,
			notified: false
		});
	}
}

async function handleNEP(reference: string, responseCode: string, detailAction: string[], timeUnit: TimeUnit) {
	logger.info("[NEP_FLOW_START]", {reference, detailAction, timeUnit});
	
	if (detailAction[0] === "SOUS") {
		logger.debug("[NEP_SUBSCRIPTION_UPDATE]", {reference});
		await NepSouscriptionsRepository.update({reference}, responseCode);
	}
	
	if (detailAction.length >= 3 && detailAction[0] === "PAY") {
		logger.debug("[NEP_PAYMENT_UPDATE]", {reference});
		await NepPaiementRepository.update(reference, responseCode);
		
		const resultGetPayment = await NepPaiementRepository.getByReference(reference);
		if (resultGetPayment.status && resultGetPayment.data) {
			const paiement = resultGetPayment.data;
			logger.debug("[NEP_PAYMENT_FETCHED]", {reference, result: resultGetPayment.status});
			
			await NepSouscriptionsRepository.updateNextPayment(
				paiement.ID_SOUSCRIPTION,
				parseInt(detailAction[1]),
				timeUnit
			);
			
			const action = reference.split("_")[3];
			if (action) {
				await handleAutoDebitSchedule(paiement, action, 'BLEBLE', 0, customerPlansBleble);
				logger.info("[NEP_NEXT_PAYMENT_UPDATE]", {
					reference,
					souscription: paiement.ID_SOUSCRIPTION,
					step: detailAction[1],
					timeUnit
				});
			}
		}
	}
}

async function handleNAF(reference: string, responseCode: string, detailAction: string[], timeUnit: TimeUnit) {
	logger.info("[NAF_FLOW_START]", {reference, detailAction, timeUnit});
	
	if (detailAction[0] === "SOUS") {
		logger.debug("[NAF_SUBSCRIPTION_UPDATE]", {reference});
		await NafSouscriptionRepository.update(responseCode, {referenceSouscription: reference});
	}
	
	if (detailAction.length >= 3 && detailAction[0] === "PAY") {
		logger.debug("[NAF_PAYMENT_UPDATE]", {reference});
		await NafPaiementRepository.update(reference, responseCode);
		
		const resultGetPayment = await NafPaiementRepository.getByReference(reference);
		if (resultGetPayment.status && resultGetPayment.data) {
			const paiement = resultGetPayment.data;
			logger.debug("[NAF_PAYMENT_FETCHED]", {reference, result: resultGetPayment.status});
			
			await NafSouscriptionRepository.updateNextPayment(
				paiement.ID_SOUSCRIPTION,
				parseInt(detailAction[1]),
				timeUnit
			);
			
			const action = reference.split("_")[3];
			if (action) {
				await handleAutoDebitSchedule(paiement, action, 'IFOH', 0, customerPlansIfoh as Plans);
				logger.info("[NAF_NEXT_PAYMENT_UPDATE]", {
					reference,
					souscription: paiement.ID_SOUSCRIPTION,
					step: detailAction[1],
					timeUnit
				});
			}
		}
	}
}

async function handleAUTRES(autresRef: string, produit: string, periode: string) {
	const produits = produit.split("-");
	const periodes = periode.split("-");
	
	for (let i = 0; i < produits.length; i++) {
		logger.debug("[AUTRES_UPDATE]", {autresRef, produit: produits[i], periode: periodes[i]});
		await NsiaAutresProduitsRepository.updateAutresProduitsState(
			autresRef,
			"payé",
			produits[i],
			periodes[i]
		);
	}
}

export default async function instantPaymentNotificationServiceController(req: Request, res: Response) {
	res.setHeader("Content-Type", "application/json; charset=utf-8");
	
	try {
		const {
			reference,
			amount,
			msisdn,
			billMapTransactionId,
			eWPTransactionId,
			responseCode,
			responseMessage
		} = extractParams(req);
		
		logger.info("[IPN_RECEIVED]", {
			reference,
			amount,
			msisdn,
			billMapTransactionId,
			eWPTransactionId,
			responseCode,
			responseMessage
		});
		
		const jsonResponse = `Reference: ${reference}, Amount: ${amount}, MSISDN: ${msisdn}, BillMapTransactionId: ${billMapTransactionId}, EWPTransactionId: ${eWPTransactionId}, ResponseCode: ${responseCode}, ResponseMessage: ${responseMessage}`;
		res.write(JSON.stringify({Response: jsonResponse}));
		
		const DATE_OF_SUBSCRIPTION = new Date().toISOString().split("T")[0];
		const [realAmount] = amount.split(".", 2);
		const prime = (100 * parseInt(realAmount || "0", 10)) / 110;
		
		const factureInsert = await FactureRepository.insert({
			AMOUNT: amount,
			BILLMAP_TRANSACTION_ID: billMapTransactionId,
			MSISDN: msisdn,
			Date_transaction: DATE_OF_SUBSCRIPTION,
			prime: String(parseInt(prime.toString())),
			EWP_TRANSACTION_ID: eWPTransactionId,
			REFERENCE: reference,
			RESPONSE_CODE: responseCode,
			RESPONSE_MESSAGE: responseMessage
		});
		if (!factureInsert.status) {
			logger.error("[FACTURE_INSERT_FAILED]", {reference, responseCode, billMapTransactionId});
		} else {
			logger.debug("[FACTURE_INSERTED]", {reference, prime});
		}
		
		const [, autresRef, categorie, action, periode] = reference.split("_");
		const detailAction = action.split("-");
		const timeUnit = detailAction[2] as TimeUnit;
		
		if (responseCode === "01") {
			logger.info("[TRANSACTION_SUCCESS]", {reference});
			logger.debug("[REFERENCE_PARSED]", {reference, categorie, action, periode, detailAction});
			
			if (categorie === "NEP") await handleNEP(reference, responseCode, detailAction, timeUnit);
			if (categorie === "NAF") await handleNAF(reference, responseCode, detailAction, timeUnit);
			if ((categorie === "NEP" || categorie === "NAF") && detailAction[0] === "PAY") {
				let evoContractId: number | null = null;
				let numeroPolice: string | null = null;
				if (categorie === "NEP") {
					const payment = await NepPaiementRepository.getByReference(reference);
					if (payment.status && payment.data) {
						const sub = await NepSouscriptionsRepository.getByIdWithClient(payment.data.ID_SOUSCRIPTION);
						evoContractId = sub.data?.EVO_CONTRACT_ID ?? null;
						numeroPolice = sub.data?.NUMERO_POLICE ?? null;
					}
				}
				if (categorie === "NAF") {
					const payment = await NafPaiementRepository.getByReference(reference);
					if (payment.status && payment.data) {
						const sub = await NafSouscriptionRepository.getByIdWithClient(payment.data.ID_SOUSCRIPTION);
						evoContractId = sub.data?.EVO_CONTRACT_ID ?? null;
						numeroPolice = sub.data?.NUMERO_POLICE ?? null;
					}
				}
				scheduleEvoMomoPaymentAfterIpn({
					msisdn,
					amount,
					reference,
					categorie: categorie as "NEP" | "NAF",
					evoContractId,
					numeroPolice
				});
			}
			if (categorie === "AUTRES") await handleAUTRES(autresRef, action, periode);
		} else {
			logger.error("[TRANSACTION_FAILED]", {reference, responseCode, responseMessage});
			
			const actionValue = reference.split("_")[3];
			if (categorie === "NEP") {
				const resultGetPayment = await NepPaiementRepository.getByReference(reference);
				if (resultGetPayment.status && resultGetPayment.data) {
					await handleAutoDebitSchedule(resultGetPayment.data, actionValue, 'BLEBLE', 1, customerPlansBleble);
					logger.info("[AUTODEBIT_RETRY_SCHEDULED]", {
						reference,
						action: actionValue,
						categorie,
						nextDebit: "demain",
						incrementRetry: 1
					});
				}
			}
			
			if (categorie === "NAF") {
				const resultGetPayment = await NafPaiementRepository.getByReference(reference);
				if (resultGetPayment.status && resultGetPayment.data) {
					await handleAutoDebitSchedule(resultGetPayment.data, actionValue, 'IFOH', 1, customerPlansIfoh as Plans);
					logger.info("[AUTODEBIT_RETRY_SCHEDULED]", {
						reference,
						action: actionValue,
						categorie,
						nextDebit: "demain",
						incrementRetry: 1
					});
				}
			}
		}
		
		res.end();
	} catch (err) {
		logger.error("[IPN_ERROR]", {
			error: err instanceof Error ? err.message : err,
			stack: err instanceof Error ? err.stack : undefined
		});
		res.end();
	}
}
