import axios from 'axios';
import {formatDate, formatPhoneNumber, generateReference, getCurrentDate} from "../../utils/format";
import {PaymentResult, PayParams} from "../../types/paymentTypes";
import {logger} from "../../utils/logger";
import {NepSouscription} from "../../types/models/nepSouscription";
import {Plan} from "../../types/plan";
import NepPaiementRepository from "../../repositories/nepPaiementRepository";
import ussdMenuCustomer, {thank} from "../../constants/ussdMenuCustomer";
import MerchantTransactionRepository from "../../repositories/MerchantTransactionRepository";
import {Merchant} from "../../types/models/merchant";
import ussdMenuMerchant from "../../constants/ussdMenuMerchant";
import {NafClient} from "../../types/models/napClient";
import NafPaiementRepository from "../../repositories/nafPaiementRepository";

const BILLING_URL = process.env.BILLING_URL!;
const serviceCode = process.env.SERVICE_CODE!;
const password = process.env.PASSWORD!;

export default async function momoPay({msisdn, reference, amount}: PayParams): Promise<PaymentResult> {
	const MetaData = "USSD PAYMENT";
	
	try {
		const payload = {
			Code: serviceCode,
			Password: password,
			MSISDN: msisdn,
			Reference: reference,
			Amount: amount.toString(),
			MetaData,
		}
		
		logger.info("Init payment payload", {msisdn, reference, amount, MetaData})
		
		const params = new URLSearchParams(payload);
		
		const response = await axios.post(BILLING_URL, params, {
			headers: {'Content-Type': 'application/x-www-form-urlencoded'},
		});
		
		const xml = response.data as string;
		
		logger.info("Response payment", {response: xml})
		
		if (xml.includes("<ResponseCode>1000</ResponseCode>"))
			return {
				success: true,
				code: "1000",
				message: "Votre paiement a été initié avec succès. Merci pour votre confiance."
			};
		
		if (xml.includes("<ResponseCode>100</ResponseCode>"))
			return {
				success: false,
				code: "100",
				message: "Désolé, vous ne remplissez pas les conditions nécessaires pour effectuer ce paiement."
			};
		
		if (xml.includes("<ResponseCode>529</ResponseCode>"))
			return {
				success: false,
				code: "529",
				message: "Votre solde MoMo est insuffisant pour effectuer cette opération."
			};
		
		if (xml.includes("<ResponseCode>515</ResponseCode>"))
			return {
				success: false,
				code: "515",
				message: "Aucun compte MTN MoMo actif n’est associé à ce numéro. Veuillez en créer un avant de continuer."
			};
		
		if (xml.includes("<ResponseCode>-1</ResponseCode>"))
			return {
				success: false,
				code: "-1",
				message: "Le service est momentanément indisponible. Veuillez réessayer plus tard."
			};
		
		const match = xml.match(/<ResponseCode>(.*?)<\/ResponseCode>/);
		const code = match ? match[1] : "UNKNOWN";
		
		return {
			success: false,
			code,
			message: "Une erreur est survenue. Le service est momentanément indisponible. Veuillez réessayer plus tard."
		};
	} catch (error) {
		logger.error("Error payment with MSISDN %s", msisdn, {error});
		return {
			success: false,
			code: "ERR",
			message: "Le système est momentanément indisponible veuillez essayer plus tard."
		};
	}
}

export const customerPayBleblePlan = async ({plan, phoneNumber, subscription, payload}: {
	subscription: NepSouscription,
	plan: Plan,
	phoneNumber: string,
	payload: Record<string, any>,
}) => {
	const subscriptionId = subscription.ID_SOUSCRIPTION;
	let amount = Number(plan.amount) + plan.fee.value;
	
	const reference = generateReference("NEP", plan.action, phoneNumber);
	
	const responsePayment = await momoPay({
		msisdn: phoneNumber,
		reference,
		amount,
		message: "Votre requête est en cours de traitement. Merci de confirmer votre paiement en tapant *534#"
	})
	
	if (responsePayment.success && responsePayment.code === '1000') {
		const resultCreatePayment = await NepPaiementRepository.insert({
			ID_SOUSCRIPTION: subscriptionId,
			MONTANT_PAIEMENT: BigInt(amount),
			REFERENCE_PAIEMENT: reference,
			ETAT_PAIEMENT: responsePayment.code,
			prime: String(plan.amount),
			DATE_PAIEMENT: new Date(),
			MSISDN: phoneNumber
		})
		
		if (resultCreatePayment.status) {
			return {
				response: ussdMenuCustomer.bleble.children.pay.children.plan.message(plan),
				nextStep: null,
				updatedData: payload,
			};
		}
	}
	
	return {
		response: `${responsePayment.message}\n${thank}`,
		nextStep: null,
		updatedData: payload,
	};
}

export const customerPayIfohPlan = async ({plan, phoneNumber, subscription, payload}: {
	subscription: NafClient,
	plan: Plan,
	phoneNumber: string,
	payload: Record<string, any>,
}) => {
	const subscriptionId = subscription.ID_SOUSCRIPTION;
	let amount = Number(plan.amount) + plan.fee.value;
	
	const reference = generateReference("NAF", plan.action, phoneNumber);
	
	const responsePayment = await momoPay({
		msisdn: phoneNumber,
		reference,
		amount,
		message: "Votre requête est en cours de traitement. Merci de confirmer votre paiement en tapant *534#"
	})
	
	if (responsePayment.success && responsePayment.code === '1000') {
		const now = new Date();
		
		const resultNafPaiment = await NafPaiementRepository.insert({
			DATE_PAIEMENT: now,
			ETAT_PAIEMENT: responsePayment.code,
			ID_SOUSCRIPTION: subscriptionId,
			MONTANT_PAIEMENT: BigInt(Number(plan.amount)),
			REFERENCE_PAIEMENT: reference,
			MSISDN: phoneNumber
		})
		
		if (resultNafPaiment.status) {
			return {
				response: ussdMenuCustomer.ifoh.children.pay().children.plan.children.confirm.message.success(plan),
				nextStep: null,
				updatedData: payload,
			};
		}
	}
	
	return {
		response: `${responsePayment.message}\n${thank}`,
		nextStep: null,
		updatedData: payload,
	};
}

export const merchantPayBleblePlan = async ({plan, phoneNumber, subscription, payload, merchant}: {
	subscription: NepSouscription,
	plan: Plan,
	phoneNumber: string,
	payload: Record<string, any>,
	merchant: Merchant
}) => {
	const subscriptionId = subscription.ID_SOUSCRIPTION;
	let amount = Number(plan.amount) + plan.fee.value;
	
	const reference = generateReference("NEP", plan.action, formatPhoneNumber(merchant.phoneNo));
	
	const responsePayment = await momoPay({
		msisdn: phoneNumber,
		reference,
		amount,
		message: "Votre requête est en cours de traitement. Merci de confirmer votre paiement en tapant *534#"
	})
	
	if (responsePayment.success && responsePayment.code === '1000') {
		const resultCreatePayment = await NepPaiementRepository.insert({
			ID_SOUSCRIPTION: subscriptionId,
			MONTANT_PAIEMENT: BigInt(amount),
			REFERENCE_PAIEMENT: reference,
			ETAT_PAIEMENT: responsePayment.code,
			prime: String(plan.amount),
			DATE_PAIEMENT: new Date(),
			MSISDN: phoneNumber
		})
		
		const resultMerchantTransaction = await MerchantTransactionRepository.insert({
			etat_transaction: responsePayment.code,
			id_merchant: merchant.id,
			date_transaction: formatDate(getCurrentDate(), 'YYYY-MM-DD'),
			montant_transaction: amount.toString(),
			reference_transaction: reference,
			id_client: subscription.ID_CLIENT
		})
		
		if (resultCreatePayment.status && resultMerchantTransaction.status) {
			return {
				response: ussdMenuMerchant.ifoh.children.pay().children.plan.message(plan),
				nextStep: null,
				updatedData: payload,
			};
		}
	}
	
	return {
		response: `${responsePayment.message}\n${thank}`,
		nextStep: null,
		updatedData: payload,
	};
}

export const merchantPayIfohPlan = async ({plan, phoneNumber, subscription, payload, merchant}: {
	subscription: NafClient,
	plan: Plan,
	phoneNumber: string,
	payload: Record<string, any>,
	merchant: Merchant
}) => {
	let amount = Number(plan.amount) + plan.fee.value;
	
	const reference = generateReference("NAF", plan.action, formatPhoneNumber(merchant.phoneNo));
	
	const responsePayment = await momoPay({
		msisdn: phoneNumber,
		reference,
		amount,
		message: "Votre requête est en cours de traitement. Merci de confirmer votre paiement en tapant *534#"
	})
	
	if (responsePayment.success && responsePayment.code === '1000') {
		const now = new Date();
		
		const resultCreatePayment = await NafPaiementRepository.insert({
			DATE_PAIEMENT: now,
			ETAT_PAIEMENT: responsePayment.code,
			ID_SOUSCRIPTION: subscription.ID_SOUSCRIPTION,
			MONTANT_PAIEMENT: BigInt(Number(plan.amount)),
			REFERENCE_PAIEMENT: reference,
			MSISDN: phoneNumber
		})
		
		const resultMerchantTransaction = await MerchantTransactionRepository.insert({
			etat_transaction: responsePayment.code,
			id_merchant: merchant.id,
			date_transaction: formatDate(getCurrentDate(), 'YYYY-MM-DD'),
			montant_transaction: amount.toString(),
			reference_transaction: reference,
			id_client: subscription.ID_CLIENT
		})
		
		if (resultCreatePayment.status && resultMerchantTransaction.status) {
			return {
				response: ussdMenuMerchant.ifoh.children.pay().children.plan.children.confirm.message.success(plan),
				nextStep: null,
				updatedData: payload,
			};
		}
	}
	
	return {
		response: `${responsePayment.message}\n${thank}`,
		nextStep: null,
		updatedData: payload,
	};
}