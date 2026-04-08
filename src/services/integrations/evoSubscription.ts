import axios from "axios";
import {formatDate, splitFullName} from "../../utils/format";
import {logger} from "../../utils/logger";

type ProductKey = "BLEBLE" | "IFOH";

const EVO_BASE_URL = process.env.EVO_BASE_URL ?? "https://evo-test.nsiavieassurances.com";
const EVO_USERNAME = process.env.EVO_USERNAME ?? "";
const EVO_PASSWORD = process.env.EVO_PASSWORD ?? "";
const EVO_TIMEOUT_MS = Number(process.env.EVO_TIMEOUT_MS ?? 15000);

const PRODUCT_ID: Record<ProductKey, number> = {
	BLEBLE: 47,
	IFOH: 50
};

const PERIODICITE_API = {
	MENSUEL: {simulate: 12, save: "MENSUEL"},
	TRIMESTRIEL: {simulate: 4, save: "TRIMESTRIEL"},
	ANNUEL: {simulate: 1, save: "ANNUEL"}
} as const;

const addYears = (date: Date, years: number) => {
	const d = new Date(date);
	d.setFullYear(d.getFullYear() + years);
	return d;
};

const toIsoDate = (date: Date) => formatDate(date, "YYYY-MM-DD");
const toFrDate = (date: Date) => formatDate(date, "DD/MM/YYYY");

const parseBirthDate = (date: string): string => {
	const [dd, mm, yyyy] = date.split("/");
	return `${yyyy}-${mm}-${dd}`;
};

const computeAge = (birthDateDdMmYyyy: string): number => {
	const [dd, mm, yyyy] = birthDateDdMmYyyy.split("/").map(Number);
	const birth = new Date(yyyy, mm - 1, dd);
	const today = new Date();
	let age = today.getFullYear() - birth.getFullYear();
	const birthdayPassed = today.getMonth() > birth.getMonth()
		|| (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate());
	if (!birthdayPassed) {
		age -= 1;
	}
	return age;
};

const login = async (): Promise<string> => {
	const response = await axios.post(
		`${EVO_BASE_URL}/api/login`,
		{
			username: EVO_USERNAME,
			password: EVO_PASSWORD
		},
		{timeout: EVO_TIMEOUT_MS}
	);

	const accessToken = response.data?.data?.access_token as string | undefined;
	if (!accessToken) {
		throw new Error("Token EVO manquant dans la réponse login");
	}
	return accessToken;
};

export const buildEvoSyncPayload = (payload: {
	product: ProductKey;
	fullName: string;
	birthDate: string;
	msisdn: string;
	beneficiaryName: string;
	primePeriodique: number;
	duree?: number;
	periodicite?: "MENSUEL" | "TRIMESTRIEL" | "ANNUEL";
}): Record<string, unknown> => {
	const periodicite = payload.periodicite ?? "MENSUEL";
	const duree = payload.duree ?? 1;
	const dateEffet = new Date();
	const dateEcheance = addYears(dateEffet, duree);
	const {lastName, firstName} = splitFullName(payload.fullName);
	const birthDateIso = parseBirthDate(payload.birthDate);
	const produit = PRODUCT_ID[payload.product];
	const period = PERIODICITE_API[periodicite];

	return {
		simulate: {
			primePeriodique: payload.primePeriodique,
			dureeContrat: duree,
			dureeCotisation: duree,
			dureeService: 0,
			age: computeAge(payload.birthDate),
			periodicitePaiementPrime: period.simulate,
			produit,
			dateEffet: toFrDate(dateEffet)
		},
		save: {
			souscripteur: {
				nom: lastName,
				prenom: firstName || lastName,
				dateDeNaissance: birthDateIso,
				telephone1: payload.msisdn
			},
			assures: [
				{
					telephone1: payload.msisdn,
					prenom: firstName || lastName,
					nom: lastName,
					lienParente: "Souscripteur",
					dateDeNaissance: birthDateIso
				}
			],
			beneficiaires: [
				{
					nom: payload.beneficiaryName,
					typeBeneficiaire: 1,
					partBeneficiaire: 100
				}
			],
			produit,
			duree,
			periodicite: period.save,
			dateEffet: toIsoDate(dateEffet),
			dateEcheance: toIsoDate(dateEcheance),
			primePeriodique: payload.primePeriodique
		}
	};
};

export const syncEvoSubscription = async (queuePayload: Record<string, unknown>) => {
	const token = await login();

	const simulatePayload = queuePayload.simulate as Record<string, unknown>;
	const savePayload = queuePayload.save as Record<string, unknown>;

	const simulationResponse = await axios.post(
		`${EVO_BASE_URL}/api/v2/simulate-vie`,
		simulatePayload,
		{
			headers: {Authorization: `Bearer ${token}`},
			timeout: EVO_TIMEOUT_MS
		}
	);

	const simulationId = simulationResponse.data?.data?.id as number | undefined;
	if (!simulationId) {
		throw new Error("Simulation EVO sans id");
	}

	await axios.post(
		`${EVO_BASE_URL}/api/v2/save-simple-contrat`,
		{
			...savePayload,
			simulationId
		},
		{
			headers: {Authorization: `Bearer ${token}`},
			timeout: EVO_TIMEOUT_MS
		}
	);

	logger.info("[EVO_SYNC_SUCCESS]", {simulationId});
};
