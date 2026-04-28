import axios from "axios";
import {formatPhoneNumber} from "../../utils/format";
import {logger} from "../../utils/logger";
import ExternalEvoOperationSyncRepository from "../../repositories/externalEvoOperationSyncRepository";
import {EVO_BASE_URL, EVO_TIMEOUT_MS, evoAuthConfigured, evoLogin, logEvoSkip} from "./evoAuth";
import {asRecord, resolveEvoContractForProduct, type EvoProductKey, PRODUCT_ID} from "./evoContractResolve";
import {syncEvoChangeBeneficiary, type EvoChangeBeneficiaryPayload} from "./evoChangeBeneficiary";

export type {EvoProductKey};
export {PRODUCT_ID};

const EVO_PAYMENT_MODE = process.env.EVO_PAYMENT_MODE ?? "MOBILE MONEY";

export type EvoMomoPaymentPayload = {
	msisdn: string;
	referencePaiement: string;
	amount: string;
	product: EvoProductKey;
	evoContractId?: number | null;
	numeroPolice?: string | null;
};

export type EvoRachatPayload = {
	msisdn: string;
	montant: number;
	typeRachat: "PARTIEL" | "TOTAL";
	localReference: string;
	product: EvoProductKey;
	evoContractId?: number | null;
	numeroPolice?: string | null;
};

type EcheanceCandidate = {
	id: number;
	montant: number;
};

const formatDatePaiement = (d = new Date()) => {
	const pad = (n: number) => n.toString().padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const toIntlMsisdn = (msisdn: string) => `+225${formatPhoneNumber(msisdn)}`;

const parseAmount = (amount: string): number => {
	const [whole] = amount.split(".", 2);
	const n = parseInt(whole || "0", 10);
	return Number.isFinite(n) ? n : 0;
};

const parseEcheancesArray = (body: unknown): EcheanceCandidate[] => {
	const root = asRecord(body);
	const raw = root?.data ?? body;
	const arr = Array.isArray(raw) ? raw : Array.isArray(asRecord(raw)?.data) ? (asRecord(raw)!.data as unknown[]) : [];
	const out: EcheanceCandidate[] = [];
	for (const row of arr) {
		const o = asRecord(row);
		if (!o) {
			continue;
		}
		const id = o.id;
		const montant = o.montant;
		if (typeof id === "number" && (typeof montant === "number" || typeof montant === "string")) {
			out.push({id, montant: Number(montant)});
		}
	}
	return out;
};

const collectUnpaidFromCotisations = (contract: Record<string, unknown>): EcheanceCandidate[] => {
	const cotisations = contract.cotisations;
	if (!Array.isArray(cotisations)) {
		return [];
	}
	const out: EcheanceCandidate[] = [];
	for (const cot of cotisations) {
		const co = asRecord(cot);
		const echs = co?.echeances;
		if (!Array.isArray(echs)) {
			continue;
		}
		for (const e of echs) {
			const eo = asRecord(e);
			if (!eo) {
				continue;
			}
			const st = String(eo.statut ?? "");
			if (st === "PAYE") {
				continue;
			}
			const id = eo.id;
			const montant = eo.montant;
			if (typeof id === "number" && montant !== undefined) {
				out.push({id, montant: Number(montant)});
			}
		}
	}
	return out;
};

const pickEcheanceForAmount = (candidates: EcheanceCandidate[], paid: number): EcheanceCandidate | null => {
	if (candidates.length === 0) {
		return null;
	}
	let best = candidates[0]!;
	let bestDiff = Math.abs(best.montant - paid);
	for (const c of candidates) {
		const d = Math.abs(c.montant - paid);
		if (d < bestDiff) {
			best = c;
			bestDiff = d;
		}
	}
	return best;
};

const pickFirstEcheanceFromContract = (contractData?: Record<string, unknown>): EcheanceCandidate | null => {
	if (!contractData) {
		return null;
	}
	const cotisations = Array.isArray(contractData.cotisations) ? contractData.cotisations : [];
	const firstCotisation = asRecord(cotisations[0]);
	const echeances = Array.isArray(firstCotisation?.echeances) ? firstCotisation.echeances : [];
	const firstEcheance = asRecord(echeances[0]);
	if (!firstEcheance || typeof firstEcheance.id !== "number") {
		return null;
	}
	const montant = Number(firstEcheance.montant ?? 0);
	return {
		id: firstEcheance.id,
		montant: Number.isFinite(montant) ? montant : 0
	};
};

const resolveContractFromPayload = async (payload: {
	msisdn: string;
	product: EvoProductKey;
	evoContractId?: number | null;
	numeroPolice?: string | null;
}) => {
	if (payload.evoContractId || payload.numeroPolice) {
		const token = await evoLogin();
		let contractId = payload.evoContractId ?? null;
		let numeroContrat = payload.numeroPolice ?? null;
		let contractData: Record<string, unknown> | undefined;

		if (numeroContrat) {
			const byNum = await axios.get(`${EVO_BASE_URL}/api/contrats/by-numero`, {
				params: {numero: numeroContrat},
				headers: {Authorization: `Bearer ${token}`},
				timeout: EVO_TIMEOUT_MS
			});
			contractData = asRecord(byNum.data)?.data as Record<string, unknown> | undefined;
			if (!contractId && typeof contractData?.id === "number") {
				contractId = contractData.id;
			}
		}

		if (!contractId) {
			throw new Error("EVO: contractId manquant pour paiement/rachat");
		}

		return {
			contractId,
			numeroContrat: numeroContrat ?? "",
			contractData,
			token
		};
	}

	return resolveEvoContractForProduct(payload.msisdn, payload.product);
};

export const syncEvoMomoPayment = async (payload: EvoMomoPaymentPayload): Promise<void> => {
	if (!evoAuthConfigured()) {
		logEvoSkip("credentials_manquantes", {reference: payload.referencePaiement});
		return;
	}

	const {contractId, numeroContrat, contractData, token} = await resolveContractFromPayload(payload);

	// Nouveau flow: prendre la 1ere echeance non payee du contrat retourne par /api/contrats/by-numero.
	let echeance = pickFirstEcheanceFromContract(contractData);
	if (!echeance) {
		let imp = await axios
			.get(`${EVO_BASE_URL}/api/contrat/echeances-impayes`, {
				params: {numeroContrat},
				headers: {Authorization: `Bearer ${token}`},
				timeout: EVO_TIMEOUT_MS
			})
			.then(r => parseEcheancesArray(r.data))
			.catch(() => [] as EcheanceCandidate[]);
		if (imp.length === 0 && contractData) {
			imp = collectUnpaidFromCotisations(contractData);
		}
		const paid = parseAmount(payload.amount);
		echeance = pickEcheanceForAmount(imp, paid);
	}

	if (!echeance) {
		throw new Error("EVO: aucune échéance impayée à rapprocher");
	}

	await axios.post(
		`${EVO_BASE_URL}/api/payment/echeance`,
		{
			contractId,
			echeances: [
				{
					id: echeance.id,
					modePaiement: EVO_PAYMENT_MODE,
					datePaiement: formatDatePaiement(),
					referencePaiement: payload.referencePaiement
				}
			]
		},
		{
			headers: {Authorization: `Bearer ${token}`},
			timeout: EVO_TIMEOUT_MS
		}
	);

	logger.info("[EVO_PAYMENT_SYNC_OK]", {
		reference: payload.referencePaiement,
		contractId,
		echeanceId: echeance.id,
		numeroContrat
	});
};

export const syncEvoRachat = async (payload: EvoRachatPayload): Promise<void> => {
	if (!evoAuthConfigured()) {
		logEvoSkip("credentials_manquantes", {localReference: payload.localReference});
		return;
	}

	const {contractId, token} = await resolveContractFromPayload(payload);

	await axios.post(
		`${EVO_BASE_URL}/api/rachats`,
		{
			banqueOperateur: "MTN",
			numero: toIntlMsisdn(payload.msisdn),
			montant: String(Math.max(0, Math.floor(payload.montant))),
			type: payload.typeRachat,
			typePaiement: "MOBILE",
			commentaire: `USSD ${payload.localReference}`.slice(0, 500),
			contrat: contractId
		},
		{
			headers: {Authorization: `Bearer ${token}`},
			timeout: EVO_TIMEOUT_MS
		}
	);

	logger.info("[EVO_RACHAT_SYNC_OK]", {
		localReference: payload.localReference,
		contractId,
		productId: PRODUCT_ID[payload.product]
	});
};

export const queueEvoMomoPayment = async (payload: EvoMomoPaymentPayload): Promise<void> => {
	try {
		await syncEvoMomoPayment(payload);
	} catch (error) {
		logger.error("[EVO_PAYMENT_SYNC_ERROR]", {error, reference: payload.referencePaiement});
		await ExternalEvoOperationSyncRepository.insert({
			operationType: "PAYMENT",
			product: payload.product,
			msisdn: formatPhoneNumber(payload.msisdn),
			idempotencyKey: payload.referencePaiement,
			payload: {...payload} as Record<string, unknown>
		});
	}
};

export const queueEvoRachat = async (payload: EvoRachatPayload): Promise<void> => {
	try {
		await syncEvoRachat(payload);
	} catch (error) {
		logger.error("[EVO_RACHAT_SYNC_ERROR]", {error, localReference: payload.localReference});
		await ExternalEvoOperationSyncRepository.insert({
			operationType: "RACHAT",
			product: payload.product,
			msisdn: formatPhoneNumber(payload.msisdn),
			idempotencyKey: payload.localReference,
			payload: {...payload} as Record<string, unknown>
		});
	}
};

export const replayEvoOperationPayload = async (
	operationType: "PAYMENT" | "RACHAT" | "CHANGE_BENEF",
	payload: Record<string, unknown>
): Promise<void> => {
	if (operationType === "PAYMENT") {
		const p = payload as unknown as EvoMomoPaymentPayload;
		await syncEvoMomoPayment(p);
		return;
	}
	if (operationType === "RACHAT") {
		const p = payload as unknown as EvoRachatPayload;
		await syncEvoRachat(p);
		return;
	}
	const p = payload as unknown as EvoChangeBeneficiaryPayload;
	await syncEvoChangeBeneficiary(p);
};
