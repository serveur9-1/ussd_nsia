import axios from "axios";
import {formatPhoneNumber} from "../../utils/format";
import {logger} from "../../utils/logger";
import ExternalEvoOperationSyncRepository from "../../repositories/externalEvoOperationSyncRepository";
import {EVO_BASE_URL, EVO_TIMEOUT_MS, evoAuthConfigured, evoLogin, logEvoSkip} from "./evoAuth";

const EVO_PAYMENT_MODE = process.env.EVO_PAYMENT_MODE ?? "MOBILE MONEY";

export type EvoProductKey = "BLEBLE" | "IFOH";

const PRODUCT_ID: Record<EvoProductKey, number> = {
	BLEBLE: 47,
	IFOH: 50
};

export type EvoMomoPaymentPayload = {
	msisdn: string;
	referencePaiement: string;
	amount: string;
	product: EvoProductKey;
};

export type EvoRachatPayload = {
	msisdn: string;
	montant: number;
	typeRachat: "PARTIEL" | "TOTAL";
	localReference: string;
	product: EvoProductKey;
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

const asRecord = (v: unknown): Record<string, unknown> | null =>
	v && typeof v === "object" ? (v as Record<string, unknown>) : null;

const parseContractsList = (body: unknown): Record<string, unknown>[] => {
	const root = asRecord(body);
	if (!root) {
		return [];
	}
	const data = root.data;
	if (Array.isArray(data)) {
		return data.map(asRecord).filter(Boolean) as Record<string, unknown>[];
	}
	const nested = asRecord(data);
	if (nested && Array.isArray(nested.data)) {
		return (nested.data as unknown[]).map(asRecord).filter(Boolean) as Record<string, unknown>[];
	}
	return [];
};

const produitIdFromContract = (c: Record<string, unknown>): number | undefined => {
	const p = asRecord(c.produit);
	const id = p?.id;
	return typeof id === "number" ? id : undefined;
};

const pickContract = (contracts: Record<string, unknown>[], productId: number): Record<string, unknown> | null => {
	const candidates = contracts.filter(c => {
		if (c.statut !== "EN_COURS") {
			return false;
		}
		const pid = produitIdFromContract(c);
		if (pid === productId) {
			return true;
		}
		const nom = String(asRecord(c.produit)?.nom ?? "").toLowerCase();
		if (productId === 47 && nom.includes("blé")) {
			return true;
		}
		if (productId === 50 && nom.includes("ifo")) {
			return true;
		}
		return false;
	});

	if (candidates.length === 0) {
		return null;
	}

	const byDate = (a: Record<string, unknown>, b: Record<string, unknown>) => {
		const da = new Date(String(a.createdAt ?? 0)).getTime();
		const db = new Date(String(b.createdAt ?? 0)).getTime();
		return db - da;
	};
	candidates.sort(byDate);
	return candidates[0] ?? null;
};

const parseAmount = (amount: string): number => {
	const [whole] = amount.split(".", 2);
	const n = parseInt(whole || "0", 10);
	return Number.isFinite(n) ? n : 0;
};

const parseEcheancesArray = (body: unknown): EcheanceCandidate[] => {
	const root = asRecord(body);
	const raw = root?.data ?? body;
	const arr = Array.isArray(raw) ? raw : Array.isArray(asRecord(raw)?.data) ? asRecord(raw)!.data as unknown[] : [];
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

export const syncEvoMomoPayment = async (payload: EvoMomoPaymentPayload): Promise<void> => {
	if (!evoAuthConfigured()) {
		logEvoSkip("credentials_manquantes", {reference: payload.referencePaiement});
		return;
	}

	const productId = PRODUCT_ID[payload.product];
	const token = await evoLogin();
	const telephone = formatPhoneNumber(payload.msisdn);

	const parTel = await axios.get(`${EVO_BASE_URL}/api/contrat/par-telephone`, {
		params: {telephone},
		headers: {Authorization: `Bearer ${token}`},
		timeout: EVO_TIMEOUT_MS
	});

	const contracts = parseContractsList(parTel.data);
	const chosen = pickContract(contracts, productId);
	if (!chosen?.numero) {
		throw new Error("EVO: aucun contrat EN_COURS pour ce produit");
	}
	const numeroContrat = String(chosen.numero);

	const byNum = await axios.get(`${EVO_BASE_URL}/api/contrats/by-numero`, {
		params: {numero: numeroContrat},
		headers: {Authorization: `Bearer ${token}`},
		timeout: EVO_TIMEOUT_MS
	});

	const contractData = asRecord(byNum.data?.data) ?? asRecord(byNum.data);
	const contractId = contractData?.id;
	if (typeof contractId !== "number") {
		throw new Error("EVO: contractId introuvable (by-numero)");
	}

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
	const echeance = pickEcheanceForAmount(imp, paid);
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

	const productId = PRODUCT_ID[payload.product];
	const token = await evoLogin();
	const telephone = formatPhoneNumber(payload.msisdn);

	const parTel = await axios.get(`${EVO_BASE_URL}/api/contrat/par-telephone`, {
		params: {telephone},
		headers: {Authorization: `Bearer ${token}`},
		timeout: EVO_TIMEOUT_MS
	});

	const contracts = parseContractsList(parTel.data);
	const chosen = pickContract(contracts, productId);
	if (!chosen?.numero) {
		throw new Error("EVO rachat: aucun contrat EN_COURS pour ce produit");
	}

	const byNum = await axios.get(`${EVO_BASE_URL}/api/contrats/by-numero`, {
		params: {numero: String(chosen.numero)},
		headers: {Authorization: `Bearer ${token}`},
		timeout: EVO_TIMEOUT_MS
	});

	const contractData = asRecord(byNum.data?.data) ?? asRecord(byNum.data);
	const contractId = contractData?.id;
	if (typeof contractId !== "number") {
		throw new Error("EVO rachat: contractId introuvable");
	}

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
		productId
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
	operationType: "PAYMENT" | "RACHAT",
	payload: Record<string, unknown>
): Promise<void> => {
	if (operationType === "PAYMENT") {
		const p = payload as unknown as EvoMomoPaymentPayload;
		await syncEvoMomoPayment(p);
		return;
	}
	const p = payload as unknown as EvoRachatPayload;
	await syncEvoRachat(p);
};
