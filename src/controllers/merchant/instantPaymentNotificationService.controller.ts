import {Request, Response} from "express";
import FactureRepository from "../../repositories/factureRepository";
import NepSouscriptionsRepository from "../../repositories/nepSouscriptionRepository";
import NepPaiementRepository from "../../repositories/nepPaiementRepository";
import NafSouscriptionRepository from "../../repositories/nafSouscriptionRepository";
import NafPaiementRepository from "../../repositories/nafPaiementRepository";
import MerchantRepository from "../../repositories/merchantRepository";
import MerchantTransactionRepository from "../../repositories/MerchantTransactionRepository";
import BonusRepository from "../../repositories/bonusRepository";
import MerchantCommissionRepository from "../../repositories/merchantCommissionRepository";
import {logger} from "../../utils/logger";
import {formatDate, getCurrentDate} from "../../utils/format";
import {PaymentResponseCode} from "../../types/paymentTypes";
import {TimeUnit} from "../../types/appTypes";
import {handleAutoDebitSchedule} from "../customer/instantPaymentNotificationService.controller";
import {customerPlansBleble, merchantPlansBleble, merchantPlansIfoh} from "../../constants/plans";
import {Plans} from "../../types/plan";
import {scheduleEvoMomoPaymentAfterIpn} from "../../services/integrations/scheduleEvoMomoPayment";

type PaymentData = {
	reference: string;
	amount: string;
	msisdn: string;
	billMapTransactionId: string;
	eWPTransactionId: string;
	responseCode: PaymentResponseCode;
	responseMessage: string;
};

function parseRequest(req: Request): PaymentData {
	const data = {...req.body, ...req.query};
	return {
		reference: data.Reference,
		amount: data.Amount,
		msisdn: data.MSISDN,
		billMapTransactionId: data.BillMapTransactionId,
		eWPTransactionId: data.EWPTransactionId,
		responseCode: data.ResponseCode as PaymentResponseCode,
		responseMessage: data.ResponseMessage,
	};
}

async function insertFacture(data: PaymentData) {
	const DATE_OF_SUBSCRIPTION = formatDate(getCurrentDate(), "YYYY-MM-DD");
	const realAmount = data.amount.split(".")[0];
	const prime = Math.floor((100 * parseInt(realAmount)) / 110);
	
	return FactureRepository.insert({
		AMOUNT: data.amount,
		MSISDN: data.msisdn,
		Date_transaction: DATE_OF_SUBSCRIPTION,
		RESPONSE_MESSAGE: data.responseMessage,
		prime: prime.toString(),
		EWP_TRANSACTION_ID: data.eWPTransactionId,
		REFERENCE: data.reference,
		RESPONSE_CODE: data.responseCode,
		BILLMAP_TRANSACTION_ID: data.billMapTransactionId,
	});
}

async function applyBonusAndCommission(
	reference: string,
	merchant: any,
	product: "BLEBLE" | "IFOH",
	action: "souscription" | "paiement",
	nbrSubs?: number
) {
	let bonus = 0;
	
	if (action === "souscription" && nbrSubs) {
		if (nbrSubs === 2 || nbrSubs === 4) {
			const step = nbrSubs === 2 ? 3 : 5;
			const bonusResult = await BonusRepository.getMerchantClientBonus(
				product,
				step
			);
			if (bonusResult.status && bonusResult.data) {
				bonus = Number(bonusResult.data.montant);
			}
		}
	}
	
	const resultTransaction =
		await MerchantTransactionRepository.getMerchantTransaction(reference);
	if (resultTransaction.status && resultTransaction.data) {
		const tableName = product === "BLEBLE" ? "nep_bonus" : "naf_bonus"
		await BonusRepository.insertMerchantBonus(
			tableName,
			resultTransaction.data.id,
			merchant.id,
			bonus
		);
	}
	
	const commissionResult = await MerchantCommissionRepository.getCommission(
		merchant.type_merchant,
		product,
		action
	);
	if (commissionResult.status && commissionResult.data) {
		const tranCommission = Number(commissionResult.data.montant);
		await MerchantRepository.updateCommission(
			tranCommission + Number(merchant.commission) + bonus,
			merchant.msisdn
		);
		await MerchantTransactionRepository.updateTransactionState(
			reference,
			"01"
		);
	}
}

async function handleNep(reference: string, action: string, timeUnit: TimeUnit, responseCode: PaymentResponseCode, merchant: any) {
	if (action === "SOUS") {
		await NepSouscriptionsRepository.update({reference}, responseCode);
		if (merchant) {
			const nbrSubs = (await MerchantTransactionRepository.nbrSubscriptionDoneByMerchantThisDay(merchant.id)).data;
			await applyBonusAndCommission(reference, merchant, "BLEBLE", "souscription", nbrSubs);
		}
	}
	
	if (action.startsWith("PAY")) {
		await NepPaiementRepository.update(reference, responseCode);
		const nepPaiement = (await NepPaiementRepository.getByReference(reference)).data;
		
		if (nepPaiement) {
			await NepSouscriptionsRepository.updateNextPayment(
				nepPaiement.ID_SOUSCRIPTION,
				parseInt(action.split("-")[1]),
				timeUnit
			);
			
			const actionPlan = reference.split("_")[3];
			if (actionPlan) {
				await handleAutoDebitSchedule(nepPaiement, actionPlan, 'BLEBLE', 0, merchantPlansBleble);
				logger.info("[NEP_NEXT_PAYMENT_UPDATE]", {
					reference,
					souscription: nepPaiement.ID_SOUSCRIPTION,
					timeUnit
				});
			}
		}
		
		if (merchant) {
			await applyBonusAndCommission(reference, merchant, "BLEBLE", "paiement");
		}
	}
}

async function handleNaf(reference: string, action: string, timeUnit: TimeUnit, responseCode: PaymentResponseCode, merchant: any) {
	if (action === "SOUS") {
		await NafSouscriptionRepository.update(responseCode, {referenceSouscription: reference});
		if (merchant) {
			const nbrSubs = (await MerchantTransactionRepository.nbrSubscriptionDoneByMerchantThisDay(merchant.id)).data;
			await applyBonusAndCommission(reference, merchant, "IFOH", "souscription", nbrSubs);
		}
	}
	
	if (action.startsWith("PAY")) {
		await NafPaiementRepository.update(reference, responseCode);
		const nafPaiement = (await NafPaiementRepository.getByReference(reference)).data;
		
		if (nafPaiement) {
			await NafSouscriptionRepository.updateNextPayment(
				parseInt(nafPaiement.ID_SOUSCRIPTION.toString()),
				parseInt(action.split("-")[1]),
				timeUnit
			);
			
			const actionPlan = reference.split("_")[3];
			if (actionPlan) {
				await handleAutoDebitSchedule(nafPaiement, action, 'IFOH', 0, merchantPlansIfoh as Plans);
				logger.info("[NAF_NEXT_PAYMENT_UPDATE]", {
					reference,
					souscription: nafPaiement.ID_SOUSCRIPTION,
					timeUnit
				});
			}
		}
		
		if (merchant) {
			await applyBonusAndCommission(reference, merchant, "IFOH", "paiement");
		}
	}
}

export default async function instantPaymentNotificationServiceController(req: Request, res: Response) {
	return await webhook(req, res)
}

export const webhook = async (req: Request, res: Response) => {
	const data = parseRequest(req);
	
	const jsonResponse = `Reference: ${data.reference}, Amount: ${data.amount}, MSISDN: ${data.msisdn}, BillMapTransactionId: ${data.billMapTransactionId}, EWPTransactionId: ${data.eWPTransactionId}, ResponseCode: ${data.responseCode}, ResponseMessage: ${data.responseMessage}`;
	
	logger.info("[IPN_RECEIVED]", {reference: data.reference, msisdn: data.msisdn, responseCode: data.responseCode});
	
	try {
		const facture = await insertFacture(data);
		logger.info("[FACTURE_INSERTED]", {factureId: facture.data?.ID_FACTURE, reference: data.reference});
		
		const reference = data.reference
		const [_, merchantMsisdn, categorie, action] = data.reference.split("_");
		const timeUnit = action.includes("-") ? (action.split("-")[2] as TimeUnit) : undefined;
		
		if (data.responseCode === "01") {
			logger.info("[TRANSACTION_SUCCESS]", {reference: data.reference});
			
			logger.debug("[TRANSACTION_DETAILS]", {reference: data.reference, categorie, action, merchantMsisdn});
			
			const merchantResult = await MerchantRepository.getOneByPhoneNumber(merchantMsisdn);
			const merchant = merchantResult.status ? merchantResult.data : null;
			
			if (categorie === "NEP") {
				logger.info("[NEP_FLOW]", {reference: data.reference, action});
				await handleNep(data.reference, action, timeUnit!, data.responseCode, merchant);
			} else if (categorie === "NAF") {
				logger.info("[NAF_FLOW]", {reference: data.reference, action});
				await handleNaf(data.reference, action, timeUnit!, data.responseCode, merchant);
			}

			if ((categorie === "NEP" || categorie === "NAF") && action.startsWith("PAY")) {
				let evoContractId: number | null = null;
				let numeroPolice: string | null = null;
				let amountForEvo = data.amount;
				if (categorie === "NEP") {
					const payment = await NepPaiementRepository.getByReference(data.reference);
					if (payment.status && payment.data) {
						const sub = await NepSouscriptionsRepository.getByIdWithClient(payment.data.ID_SOUSCRIPTION);
						evoContractId = sub.data?.EVO_CONTRACT_ID ?? null;
						numeroPolice = sub.data?.NUMERO_POLICE ?? null;
						const m = Number(payment.data.MONTANT_PAIEMENT);
						if (Number.isFinite(m) && m > 0) {
							amountForEvo = String(Math.floor(m));
						}
					}
				}
				if (categorie === "NAF") {
					const payment = await NafPaiementRepository.getByReference(data.reference);
					if (payment.status && payment.data) {
						const sub = await NafSouscriptionRepository.getByIdWithClient(payment.data.ID_SOUSCRIPTION);
						evoContractId = sub.data?.EVO_CONTRACT_ID ?? null;
						numeroPolice = sub.data?.NUMERO_POLICE ?? null;
						const m = Number(payment.data.MONTANT_PAIEMENT);
						if (Number.isFinite(m) && m > 0) {
							amountForEvo = String(Math.floor(m));
						}
					}
				}
				if (amountForEvo !== data.amount) {
					logger.info("[EVO_SYNC_AMOUNT_FROM_SUBSCRIPTION]", {
						reference: data.reference,
						ipnAmount: data.amount,
						subscriptionPaymentAmount: amountForEvo
					});
				}
				scheduleEvoMomoPaymentAfterIpn({
					msisdn: data.msisdn,
					amount: amountForEvo,
					reference: data.reference,
					categorie: categorie as "NEP" | "NAF",
					evoContractId,
					numeroPolice
				});
			}
			
			logger.info("[IPN_COMPLETED]", {reference: data.reference});
			return res.json({Response: jsonResponse});
		} else {
			logger.warn("[TRANSACTION_FAILED]", {
				reference: data.reference,
				code: data.responseCode,
				message: data.responseMessage
			});
			
			const actionValue = reference.split("_")[3];
			
			if (categorie === "NEP") {
				const resultGetPayment = await NepPaiementRepository.getByReference(reference);
				if (resultGetPayment.status && resultGetPayment.data) {
					await handleAutoDebitSchedule(resultGetPayment.data, actionValue, 'BLEBLE', 1, merchantPlansBleble);
				}
			}
			
			if (categorie === "NAF") {
				const resultGetPayment = await NafPaiementRepository.getByReference(reference);
				if (resultGetPayment.status && resultGetPayment.data) {
					await handleAutoDebitSchedule(resultGetPayment.data, actionValue, 'IFOH', 1, merchantPlansIfoh as Plans);
					logger.info("[AUTODEBIT_RETRY_SCHEDULED]", {
						reference,
						action: actionValue,
						categorie,
						nextDebit: "demain",
						incrementRetry: 1
					});
				}
			}
			
			return res.json({Response: jsonResponse});
		}
	} catch (error) {
		logger.error("[IPN_ERROR]", {reference: data.reference, error});
		return res.json({Response: jsonResponse});
	}
}