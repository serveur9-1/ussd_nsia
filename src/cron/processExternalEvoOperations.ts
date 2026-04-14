import ExternalEvoOperationSyncRepository from "../repositories/externalEvoOperationSyncRepository";
import {replayEvoOperationPayload} from "../services/integrations/evoPaymentRachat";
import {logger} from "../utils/logger";
import {ExternalEvoOperationType} from "../types/models/externalEvoOperationSync";

const MAX_RETRY = Number(process.env.EVO_SYNC_MAX_RETRY ?? 10);
const RETRY_DELAY_MINUTES = Number(process.env.EVO_SYNC_RETRY_DELAY_MINUTES ?? 15);

export default async function processExternalEvoOperations(): Promise<void> {
	const rows = await ExternalEvoOperationSyncRepository.getReady(25);
	if (rows.length === 0) {
		return;
	}

	for (const row of rows) {
		if (row.retry_count >= MAX_RETRY) {
			continue;
		}
		await ExternalEvoOperationSyncRepository.markProcessing(Number(row.id));
		try {
			const payload = JSON.parse(row.payload) as Record<string, unknown>;
			await replayEvoOperationPayload(row.operation_type as ExternalEvoOperationType, payload);
			await ExternalEvoOperationSyncRepository.markSuccess(Number(row.id));
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			logger.error("[EXTERNAL_EVO_OP_RETRY_FAIL]", {id: row.id, msg});
			const next = new Date(Date.now() + RETRY_DELAY_MINUTES * 60 * 1000);
			await ExternalEvoOperationSyncRepository.markFailed(
				Number(row.id),
				row.retry_count + 1,
				msg.slice(0, 2000),
				next
			);
		}
	}
}
