import ExternalSubscriptionSyncRepository from "../repositories/externalSubscriptionSyncRepository";
import NafSouscriptionRepository from "../repositories/nafSouscriptionRepository";
import NepSouscriptionsRepository from "../repositories/nepSouscriptionRepository";
import {syncEvoSubscription} from "../services/integrations/evoSubscription";
import {logger} from "../utils/logger";

const MAX_RETRY = Number(process.env.EVO_SYNC_MAX_RETRY ?? 10);
const RETRY_DELAY_MINUTES = Number(process.env.EVO_SYNC_RETRY_DELAY_MINUTES ?? 15);

export default async function processExternalSubscriptionSync() {
	const rows = await ExternalSubscriptionSyncRepository.getReady(20);
	if (rows.length === 0) {
		return;
	}

	logger.info("[EXTERNAL_SYNC_PROCESS_START]", {count: rows.length});

	for (const row of rows) {
		if (row.retry_count >= MAX_RETRY) {
			continue;
		}

		try {
			await ExternalSubscriptionSyncRepository.markProcessing(Number(row.id));
			const parsedPayload = JSON.parse(row.payload) as Record<string, unknown>;
			const evoResult = await syncEvoSubscription(parsedPayload);
			const localSubscriptionId = Number(parsedPayload.localSubscriptionId ?? row.local_subscription_id);
			if (Number.isFinite(localSubscriptionId)) {
				if (row.product === "BLEBLE") {
					await NepSouscriptionsRepository.updateEvoContractData(localSubscriptionId, {
						evoContractId: evoResult.evoContractId,
						numeroPolice: evoResult.numeroPolice
					});
				}
				if (row.product === "IFOH") {
					await NafSouscriptionRepository.updateEvoContractData(localSubscriptionId, {
						evoContractId: evoResult.evoContractId,
						numeroPolice: evoResult.numeroPolice
					});
				}
			}
			await ExternalSubscriptionSyncRepository.markSuccess(Number(row.id));
		} catch (error) {
			const nextRetryCount = row.retry_count + 1;
			const delayMinutes = RETRY_DELAY_MINUTES * Math.max(1, nextRetryCount);
			const nextRetryAt = new Date(Date.now() + delayMinutes * 60 * 1000);
			const rawError = error instanceof Error ? error.message : "Erreur inconnue";
			const errorMessage = nextRetryCount >= MAX_RETRY
				? `[MAX_RETRY_REACHED] ${rawError}`
				: rawError;

			await ExternalSubscriptionSyncRepository.markFailed(
				Number(row.id),
				nextRetryCount,
				errorMessage,
				nextRetryAt
			);
			logger.error("[EXTERNAL_SYNC_PROCESS_ITEM_ERROR]", {id: row.id, error});
		}
	}
}
