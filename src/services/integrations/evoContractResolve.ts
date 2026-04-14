import axios from "axios";
import {formatPhoneNumber} from "../../utils/format";
import {EVO_BASE_URL, EVO_TIMEOUT_MS, evoLogin} from "./evoAuth";

export type EvoProductKey = "BLEBLE" | "IFOH";

export const PRODUCT_ID: Record<EvoProductKey, number> = {
	BLEBLE: 47,
	IFOH: 50
};

export const asRecord = (v: unknown): Record<string, unknown> | null =>
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

/**
 * Résout le contrat EVO (par téléphone + numéro de police) pour Blé Blé / Ifo.
 * Réutilisé pour paiement, rachat, changement de bénéficiaire.
 */
export const resolveEvoContractForProduct = async (
	msisdn: string,
	product: EvoProductKey
): Promise<{
	contractId: number;
	numeroContrat: string;
	contractData: Record<string, unknown>;
	token: string;
}> => {
	const token = await evoLogin();
	const telephone = formatPhoneNumber(msisdn);
	const productId = PRODUCT_ID[product];

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

	return {contractId, numeroContrat, contractData: contractData!, token};
};
