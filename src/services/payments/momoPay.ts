import axios, {isAxiosError} from 'axios';
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

const BILLING_URL = process.env.BILLING_URL ?? "";
const serviceCode = process.env.SERVICE_CODE ?? "";
const password = process.env.PASSWORD ?? "";

const BILLMAP_BASE_URL = process.env.BILLMAP_BASE_URL ?? "";
const BILLMAP_AUTH_PATH = process.env.BILLMAP_AUTH_PATH ?? "/api/Authentication/token";
const BILLMAP_DEBIT_PATH = process.env.BILLMAP_DEBIT_PATH ?? "/api/Bill/test/debit/openapi";
const BILLMAP_KEY = process.env.BILLMAP_KEY ?? "";
const BILLMAP_SECRET = process.env.BILLMAP_SECRET ?? "";
const BILLMAP_CODE = process.env.BILLMAP_CODE ?? serviceCode;
const billingTimeoutParsed = Number(process.env.BILLING_TIMEOUT_MS);
const BILLING_TIMEOUT_MS =
	Number.isFinite(billingTimeoutParsed) && billingTimeoutParsed > 0 ? billingTimeoutParsed : 25_000;
const TEST_PAYMENT_OVERRIDE_ENABLED = process.env.TEST_PAYMENT_OVERRIDE_ENABLED === "true";
const TEST_PAYMENT_OVERRIDE_MSISDN = process.env.TEST_PAYMENT_OVERRIDE_MSISDN ?? "";
const testPaymentOverrideAmountParsed = Number(process.env.TEST_PAYMENT_OVERRIDE_AMOUNT ?? "0");
const TEST_PAYMENT_OVERRIDE_AMOUNT =
	Number.isFinite(testPaymentOverrideAmountParsed) && testPaymentOverrideAmountParsed > 0
		? Math.floor(testPaymentOverrideAmountParsed)
		: 0;
const TEST_PAYMENT_OVERRIDE_EXPIRES_AT = process.env.TEST_PAYMENT_OVERRIDE_EXPIRES_AT ?? "";

type BillmapTokenResponse = {
	token?: string;
	tokenExpires?: string;
	success?: boolean;
	message?: string;
};

type BillmapDebitResponse = {
	responseCode?: string | number;
	responseMessage?: string;
	billMapTransactionId?: string;
};

let billmapAccessToken: string | null = null;
let billmapTokenExpiresAt: number | null = null;

function billingResponseToString(data: unknown): string {
	if (typeof data === 'string') return data;
	if (data == null) return '';
	try {
		return JSON.stringify(data);
	} catch {
		return String(data);
	}
}

function resolveBillingAmount(msisdn: string, amount: number, reference: string): number {
	if (!TEST_PAYMENT_OVERRIDE_ENABLED || !TEST_PAYMENT_OVERRIDE_MSISDN || TEST_PAYMENT_OVERRIDE_AMOUNT <= 0) {
		return amount;
	}

	const expiresAt = TEST_PAYMENT_OVERRIDE_EXPIRES_AT ? new Date(TEST_PAYMENT_OVERRIDE_EXPIRES_AT) : null;
	if (expiresAt && Number.isFinite(expiresAt.getTime()) && new Date() > expiresAt) {
		return amount;
	}

	const normalizedMsisdn = formatPhoneNumber(msisdn);
	const normalizedOverrideMsisdn = formatPhoneNumber(TEST_PAYMENT_OVERRIDE_MSISDN);
	if (normalizedMsisdn !== normalizedOverrideMsisdn) {
		return amount;
	}

	logger.warn("[TEST_OVERRIDE_APPLIED]", {
		reference,
		msisdn: normalizedMsisdn,
		originalAmount: amount,
		overrideAmount: TEST_PAYMENT_OVERRIDE_AMOUNT,
		expiresAt: TEST_PAYMENT_OVERRIDE_EXPIRES_AT || null
	});
	return TEST_PAYMENT_OVERRIDE_AMOUNT;
}

const hasBillmapNetConfig = (): boolean =>
	Boolean(BILLMAP_BASE_URL && BILLMAP_KEY && BILLMAP_SECRET && BILLMAP_CODE);

const isTokenStillValid = (): boolean => {
	if (!billmapAccessToken || !billmapTokenExpiresAt) return false;
	return Date.now() + 10_000 < billmapTokenExpiresAt;
};

const toAbsoluteUrl = (baseUrl: string, path: string): string => {
	const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
	const route = path.startsWith("/") ? path : `/${path}`;
	return `${base}${route}`;
};

const getBillmapToken = async (): Promise<string> => {
	if (isTokenStillValid()) {
		return billmapAccessToken as string;
	}

	const authUrl = toAbsoluteUrl(BILLMAP_BASE_URL, BILLMAP_AUTH_PATH);
	const response = await axios.post<BillmapTokenResponse>(
		authUrl,
		{
			key: BILLMAP_KEY,
			secret: BILLMAP_SECRET,
		},
		{
			headers: {"Content-Type": "application/json"},
			timeout: BILLING_TIMEOUT_MS,
		}
	);

	const token = response.data?.token;
	if (!token) {
		throw new Error("BillMap.NET token manquant dans la reponse d'authentification.");
	}

	billmapAccessToken = token;
	const expiresAt = response.data?.tokenExpires ? new Date(response.data.tokenExpires).getTime() : NaN;
	billmapTokenExpiresAt = Number.isFinite(expiresAt) ? expiresAt : Date.now() + 10 * 60_000;
	return token;
};

const mapResponseCodeToPaymentResult = (code: string): PaymentResult => {
	if (code === "1000" || code === "01") {
		return {
			success: true,
			code: "1000",
			message: "Votre paiement a ete initie avec succes. Merci pour votre confiance."
		};
	}

	if (code === "100") {
		return {
			success: false,
			code: "100",
			message: "Desole, vous ne remplissez pas les conditions necessaires pour effectuer ce paiement."
		};
	}

	if (code === "529") {
		return {
			success: false,
			code: "529",
			message: "Votre solde MoMo est insuffisant pour effectuer cette operation."
		};
	}

	if (code === "515") {
		return {
			success: false,
			code: "515",
			message: "Aucun compte MTN MoMo actif n'est associe a ce numero. Veuillez en creer un avant de continuer."
		};
	}

	if (code === "-1") {
		return {
			success: false,
			code: "-1",
			message: "Le service est momentanement indisponible. Veuillez reessayer plus tard."
		};
	}

	return {
		success: false,
		code,
		message: "Une erreur est survenue. Le service est momentanement indisponible. Veuillez reessayer plus tard."
	};
};

const payWithBillmapNet = async (
	msisdn: string,
	reference: string,
	amountToBill: number,
	metaData: string
): Promise<PaymentResult> => {
	let token = await getBillmapToken();
	const debitUrl = toAbsoluteUrl(BILLMAP_BASE_URL, BILLMAP_DEBIT_PATH);
	const payload = {
		code: BILLMAP_CODE,
		msisdn,
		reference,
		amount: amountToBill,
		metadata: metaData,
	};

	try {
		const response = await axios.post<BillmapDebitResponse>(debitUrl, payload, {
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`
			},
			timeout: BILLING_TIMEOUT_MS,
		});

		const code = String(response.data?.responseCode ?? "UNKNOWN");
		logger.info("Response payment BillMap.NET", {
			reference,
			responseCode: code,
			responseMessage: response.data?.responseMessage,
			billMapTransactionId: response.data?.billMapTransactionId,
		});
		return mapResponseCodeToPaymentResult(code);
	} catch (error) {
		const status = isAxiosError(error) ? error.response?.status : undefined;
		if (status === 401) {
			// Token invalide/expire: reauth + un retry.
			billmapAccessToken = null;
			billmapTokenExpiresAt = null;
			token = await getBillmapToken();

			const retryResponse = await axios.post<BillmapDebitResponse>(debitUrl, payload, {
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`
				},
				timeout: BILLING_TIMEOUT_MS,
			});
			const code = String(retryResponse.data?.responseCode ?? "UNKNOWN");
			logger.info("Response payment BillMap.NET retry", {
				reference,
				responseCode: code,
				responseMessage: retryResponse.data?.responseMessage,
				billMapTransactionId: retryResponse.data?.billMapTransactionId,
			});
			return mapResponseCodeToPaymentResult(code);
		}
		throw error;
	}
};

export default async function momoPay({msisdn, reference, amount}: PayParams): Promise<PaymentResult> {
	const MetaData = "USSD PAYMENT";
	
	try {
		const amountToBill = resolveBillingAmount(msisdn, amount, reference);
		logger.info("Init payment payload", {msisdn, reference, amount: amountToBill, MetaData});

		if (hasBillmapNetConfig()) {
			return await payWithBillmapNet(msisdn, reference, amountToBill, MetaData);
		}

		const payload = {
			Code: serviceCode,
			Password: password,
			MSISDN: msisdn,
			Reference: reference,
			Amount: amountToBill.toString(),
			MetaData,
		};

		const params = new URLSearchParams(payload);

		const response = await axios.post(BILLING_URL, params, {
			headers: {'Content-Type': 'application/x-www-form-urlencoded'},
			timeout: BILLING_TIMEOUT_MS,
		});

		const xml = billingResponseToString(response.data);
		logger.info("Response payment legacy", {response: xml});

		const match = xml.match(/<ResponseCode>(.*?)<\/ResponseCode>/);
		const code = match ? match[1] : "UNKNOWN";
		return mapResponseCodeToPaymentResult(code);
	} catch (error) {
		const axiosError = isAxiosError(error) ? (error as {code?: string; response?: {status?: number}; message?: string}) : null;
		const timedOut = axiosError?.code === 'ECONNABORTED';
		if (isAxiosError(error)) {
			logger.error("Error payment with MSISDN %s", msisdn, {
				axiosCode: axiosError?.code,
				status: axiosError?.response?.status,
				message: axiosError?.message,
				isTimeout: timedOut,
			});
		} else {
			logger.error("Error payment with MSISDN %s", msisdn, {error});
		}
		return {
			success: false,
			code: timedOut ? 'TIMEOUT' : 'ERR',
			message: timedOut
				? 'Le service de paiement met trop longtemps à répondre. Veuillez réessayer dans un instant.'
				: 'Le système est momentanément indisponible veuillez essayer plus tard.'
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