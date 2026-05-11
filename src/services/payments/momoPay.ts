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

/** Client dedie : ne jamais rejeter sur HTTP 4xx (sinon ERR_BAD_REQUEST sans corps exploitable). */
const billmapHttp = axios.create({
	timeout: BILLING_TIMEOUT_MS,
	validateStatus: () => true,
});

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

/** BillMap.NET attend en general le MSISDN au format international sans + (ex: 22505xxxxxxxx). */
const msisdnForBillmapNet = (msisdn: string): string => {
	const digits = msisdn.replace(/\D/g, "");
	if (digits.startsWith("225") && digits.length >= 12) {
		return digits.slice(0, 13);
	}
	const local = formatPhoneNumber(msisdn);
	if (local.length === 10 && local.startsWith("0")) {
		return `225${local}`;
	}
	return local.length >= 10 ? `225${local}` : local;
};

const parseBillmapDebitBody = (data: unknown): BillmapDebitResponse | null => {
	if (data && typeof data === "object" && ("responseCode" in data || "responseMessage" in data)) {
		return data as BillmapDebitResponse;
	}
	return null;
};

const getBillmapToken = async (): Promise<string> => {
	if (isTokenStillValid()) {
		return billmapAccessToken as string;
	}

	const authUrl = toAbsoluteUrl(BILLMAP_BASE_URL, BILLMAP_AUTH_PATH);
	const response = await billmapHttp.post<BillmapTokenResponse>(
		authUrl,
		{
			key: BILLMAP_KEY,
			secret: BILLMAP_SECRET,
		},
		{
			headers: {"Content-Type": "application/json"},
		}
	);

	if (response.status < 200 || response.status >= 300) {
		logger.error("[BILLMAP_NET_AUTH_HTTP]", {
			status: response.status,
			data: response.data,
			dataText: billingResponseToString(response.data),
		});
		throw new Error(`BillMap.NET authentification HTTP ${response.status}`);
	}

	const token = response.data?.token;
	if (!token) {
		logger.error("[BILLMAP_NET_AUTH_NO_TOKEN]", {
			data: response.data,
			dataText: billingResponseToString(response.data),
		});
		throw new Error("BillMap.NET token manquant dans la reponse d'authentification.");
	}

	logger.info("[BILLMAP_NET_AUTH_OK]", {
		tokenExpires: response.data?.tokenExpires ?? null,
	});

	billmapAccessToken = token;
	const expiresAt = response.data?.tokenExpires ? new Date(response.data.tokenExpires).getTime() : NaN;
	billmapTokenExpiresAt = Number.isFinite(expiresAt) ? expiresAt : Date.now() + 10 * 60_000;
	return token;
};

const mapResponseCodeToPaymentResult = (code: string): PaymentResult => {
	/** 1000 / Pending (souvent UAT) ; 01 (succes IPN / certains flux) ; 81 = succes cote BillMap.NET PROD (dashboard). */
	if (code === "1000" || code === "01" || code === "81") {
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

	/** PAYER_NOT_FOUND cote BillMap.NET (ex. dashboard) */
	if (code === "105") {
		return {
			success: false,
			code: "105",
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

	logger.warn("[BILLMAP_NET_UNKNOWN_RESPONSE_CODE]", {code});
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
	const msisdnBillmap = msisdnForBillmapNet(msisdn);
	const payload = {
		code: BILLMAP_CODE,
		msisdn: msisdnBillmap,
		reference,
		amount: amountToBill,
		metadata: metaData,
	};

	const postDebit = async (bearer: string) =>
		billmapHttp.post<BillmapDebitResponse>(debitUrl, payload, {
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${bearer}`,
			},
		});

	try {
		logger.info("[BILLMAP_NET_DEBIT_REQUEST]", {
			debitUrl,
			msisdnBillmap,
			reference,
			amount: amountToBill,
			code: BILLMAP_CODE,
		});
		let response = await postDebit(token);

		if (response.status === 401) {
			billmapAccessToken = null;
			billmapTokenExpiresAt = null;
			token = await getBillmapToken();
			response = await postDebit(token);
		}

		if (response.status < 200 || response.status >= 300) {
			const fromBody = parseBillmapDebitBody(response.data);
			if (fromBody?.responseCode != null) {
				const code = String(fromBody.responseCode);
				logger.warn("Response payment BillMap.NET (HTTP non-2xx avec body metier)", {
					httpStatus: response.status,
					reference,
					responseCode: code,
					responseMessage: fromBody.responseMessage,
				});
				return mapResponseCodeToPaymentResult(code);
			}
			logger.error("[BILLMAP_NET_DEBIT_HTTP]", {
				httpStatus: response.status,
				reference,
				body: response.data,
			});
			throw new Error(`BillMap.NET debit HTTP ${response.status}`);
		}

		const code = String(response.data?.responseCode ?? "UNKNOWN");
		logger.info("Response payment BillMap.NET", {
			reference,
			msisdnBillmap,
			responseCode: code,
			responseMessage: response.data?.responseMessage,
			billMapTransactionId: response.data?.billMapTransactionId,
		});
		return mapResponseCodeToPaymentResult(code);
	} catch (error) {
		logger.error("[BILLMAP_NET_DEBIT_EXCEPTION]", {
			reference,
			message: error instanceof Error ? error.message : String(error),
			axios: isAxiosError(error)
				? {
						code: error.code,
						status: error.response?.status,
						dataText: billingResponseToString(error.response?.data),
					}
				: null,
		});
		if (isAxiosError(error)) {
			const body = parseBillmapDebitBody(error.response?.data);
			if (body?.responseCode != null) {
				const code = String(body.responseCode);
				logger.warn("[BILLMAP_NET_DEBIT_AXIOS_BODY]", {
					reference,
					status: error.response?.status,
					responseCode: code,
					responseMessage: body.responseMessage,
				});
				return mapResponseCodeToPaymentResult(code);
			}
		}
		throw error;
	}
};

export default async function momoPay({msisdn, reference, amount}: PayParams): Promise<PaymentResult> {
	const MetaData = "USSD PAYMENT";
	
	try {
		const amountToBill = resolveBillingAmount(msisdn, amount, reference);
		const useBillmapNet = hasBillmapNetConfig();
		logger.info("Init payment payload", {
			msisdn,
			reference,
			amount: amountToBill,
			MetaData,
			provider: useBillmapNet ? "billmap.net" : "legacy",
		});

		if (useBillmapNet) {
			return await payWithBillmapNet(msisdn, reference, amountToBill, MetaData);
		}

		if (!BILLING_URL) {
			logger.error("[PAYMENT_CONFIG]", {
				message: "Ni BillMap.NET (BILLMAP_*) ni ancienne BILLING_URL ne sont configures."
			});
			return {
				success: false,
				code: "CONFIG",
				message:
					"Service de paiement non configure. Contactez le support technique."
			};
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
			validateStatus: () => true,
		});

		if (response.status < 200 || response.status >= 300) {
			logger.error("[LEGACY_BILLING_HTTP]", {
				httpStatus: response.status,
				reference,
				bodyPreview: billingResponseToString(response.data).slice(0, 500),
			});
			return {
				success: false,
				code: "ERR",
				message:
					"Le service de paiement a renvoye une erreur. Veuillez reessayer plus tard ou contacter le support.",
			};
		}

		const xml = billingResponseToString(response.data);
		logger.info("Response payment legacy", {response: xml});

		const match = xml.match(/<ResponseCode>(.*?)<\/ResponseCode>/);
		const code = match ? match[1] : "UNKNOWN";
		return mapResponseCodeToPaymentResult(code);
	} catch (error) {
		type AxiosLike = {
			code?: string;
			message?: string;
			response?: {status?: number; data?: unknown};
		};
		const axiosError = isAxiosError(error) ? (error as AxiosLike) : null;
		const timedOut = axiosError?.code === 'ECONNABORTED';
		if (isAxiosError(error)) {
			logger.error("Error payment with MSISDN %s", msisdn, {
				axiosCode: axiosError?.code,
				status: axiosError?.response?.status,
				message: axiosError?.message,
				isTimeout: timedOut,
				responseData: axiosError?.response?.data,
				responseDataText: billingResponseToString(axiosError?.response?.data),
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