import axios from "axios";
import {logger} from "../../utils/logger";

export const EVO_BASE_URL = process.env.EVO_BASE_URL ?? "https://evo-test.nsiavieassurances.com";
export const EVO_USERNAME = process.env.EVO_USERNAME ?? "";
export const EVO_PASSWORD = process.env.EVO_PASSWORD ?? "";
const evoTimeoutParsed = Number(process.env.EVO_TIMEOUT_MS);
/** Defaut 45s : save-simple-contrat / payment/echeance peuvent depasser 15s sur evo-test. */
export const EVO_TIMEOUT_MS =
	Number.isFinite(evoTimeoutParsed) && evoTimeoutParsed >= 5000 ? evoTimeoutParsed : 45_000;

export const evoLogin = async (): Promise<string> => {
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

export const evoAuthConfigured = (): boolean => {
	return Boolean(EVO_USERNAME && EVO_PASSWORD && EVO_BASE_URL);
};

export const logEvoSkip = (reason: string, meta?: Record<string, unknown>) => {
	logger.warn("[EVO_SKIP]", {reason, ...meta});
};
