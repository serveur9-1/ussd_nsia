import axios from "axios";
import {formatPhoneNumber, splitFullName} from "../../utils/format";
import {logger} from "../../utils/logger";
import ExternalEvoOperationSyncRepository from "../../repositories/externalEvoOperationSyncRepository";
import {EVO_BASE_URL, EVO_TIMEOUT_MS, evoAuthConfigured, logEvoSkip} from "./evoAuth";
import {resolveEvoContractForProduct, type EvoProductKey} from "./evoContractResolve";

/**
 * Corps d'un bénéficiaire pour POST /api/avenants/change-beneficiaire (doc NSIA).
 */
export type EvoBeneficiaireAvenantBody = {
	adresse: string;
	typeDePiece: string;
	numeroDePiece: string;
	telephone1: string;
	prenom: string;
	nom: string;
	employeur: string;
	numeroMobileMoney: string;
	numeroTelEmployeur: string;
	profession: string;
	dateDeNaissance: string;
	lieuDeNaissance: string;
	sexe: string;
	email: string;
	type: string;
	typeBeneficiaire: number;
	dateDexpiration?: string | null;
};

export type EvoChangeBeneficiaryPayload = {
	msisdn: string;
	product: EvoProductKey;
	dateAvenant: string;
	ancienBeneficiaires: EvoBeneficiaireAvenantBody[];
	nouveauBeneficiaires: EvoBeneficiaireAvenantBody[];
	idempotencyKey: string;
};

const emptyBeneficiaireShell = (): Omit<EvoBeneficiaireAvenantBody, "prenom" | "nom" | "typeBeneficiaire"> => ({
	adresse: "",
	typeDePiece: "",
	numeroDePiece: "",
	telephone1: "",
	employeur: "",
	numeroMobileMoney: "",
	numeroTelEmployeur: "",
	profession: "",
	dateDeNaissance: "1990-01-01",
	lieuDeNaissance: "",
	sexe: "",
	email: "",
	type: "PHYSIQUE",
	dateDexpiration: null
});

/**
 * Construit un bénéficiaire minimal à partir du nom complet local (ex. nep_beneficiaires.NOM_BENEFICIAIRE).
 * À affiner si vous collectez naissance / lieu / sexe en USSD.
 */
export const buildBeneficiaireAvenantFromFullName = (
	fullName: string,
	typeBeneficiaire: 1 | 2 = 1,
	overrides: Partial<Pick<EvoBeneficiaireAvenantBody, "dateDeNaissance" | "lieuDeNaissance" | "sexe">> = {}
): EvoBeneficiaireAvenantBody => {
	const {lastName, firstName} = splitFullName(fullName.trim());
	return {
		...emptyBeneficiaireShell(),
		prenom: firstName || lastName,
		nom: lastName,
		typeBeneficiaire,
		dateDeNaissance: overrides.dateDeNaissance ?? "1990-01-01",
		lieuDeNaissance: overrides.lieuDeNaissance ?? "",
		sexe: overrides.sexe ?? ""
	};
};

export const syncEvoChangeBeneficiary = async (payload: EvoChangeBeneficiaryPayload): Promise<void> => {
	if (!evoAuthConfigured()) {
		logEvoSkip("credentials_manquantes", {idempotencyKey: payload.idempotencyKey});
		return;
	}

	const {contractId, token} = await resolveEvoContractForProduct(payload.msisdn, payload.product);

	await axios.post(
		`${EVO_BASE_URL}/api/avenants/change-beneficiaire`,
		{
			contrat: contractId,
			dateAvenant: payload.dateAvenant,
			ancienBeneficiaires: payload.ancienBeneficiaires,
			nouveauBeneficiaires: payload.nouveauBeneficiaires
		},
		{
			headers: {Authorization: `Bearer ${token}`},
			timeout: EVO_TIMEOUT_MS
		}
	);

	logger.info("[EVO_CHANGE_BENEF_OK]", {
		idempotencyKey: payload.idempotencyKey,
		contractId
	});
};

/**
 * Après mise à jour locale du bénéficiaire : appeler cette fonction (ou la version file d'attente).
 * Exemple d'appel :
 * queueEvoChangeBeneficiary({
 *   msisdn,
 *   product: "BLEBLE",
 *   dateAvenant: formatDate(new Date(), "YYYY-MM-DD"),
 *   ancienBeneficiaires: [buildBeneficiaireAvenantFromFullName(ancienNom)],
 *   nouveauBeneficiaires: [buildBeneficiaireAvenantFromFullName(nouveauNom)],
 *   idempotencyKey: `BENEF-${idSouscription}-${Date.now()}`
 * });
 */
export const queueEvoChangeBeneficiary = async (payload: EvoChangeBeneficiaryPayload): Promise<void> => {
	try {
		await syncEvoChangeBeneficiary(payload);
	} catch (error) {
		logger.error("[EVO_CHANGE_BENEF_ERROR]", {error, idempotencyKey: payload.idempotencyKey});
		await ExternalEvoOperationSyncRepository.insert({
			operationType: "CHANGE_BENEF",
			product: payload.product,
			msisdn: formatPhoneNumber(payload.msisdn),
			idempotencyKey: payload.idempotencyKey,
			payload: {...payload} as Record<string, unknown>
		});
	}
};
