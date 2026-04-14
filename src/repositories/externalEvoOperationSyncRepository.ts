import prisma from "../lib/prisma";
import {ExternalEvoOperationSync} from "../types/models/externalEvoOperationSync";
import {logger} from "../utils/logger";

export default class ExternalEvoOperationSyncRepository {
	static async insert(data: {
		operationType: "PAYMENT" | "RACHAT" | "CHANGE_BENEF";
		product: string;
		msisdn: string;
		idempotencyKey: string;
		payload: Record<string, unknown>;
		nextRetryAt?: Date;
	}): Promise<boolean> {
		try {
			const nextRetryAt = data.nextRetryAt ?? new Date();
			await prisma.$executeRaw`
				INSERT INTO external_evo_operation_sync
				(operation_type, product, msisdn, idempotency_key, payload, status, retry_count, next_retry_at, created_at, updated_at)
				VALUES
				(${data.operationType}, ${data.product}, ${data.msisdn}, ${data.idempotencyKey}, ${JSON.stringify(data.payload)}, 'PENDING', 0, ${nextRetryAt}, NOW(), NOW())
			`;
			return true;
		} catch (error: unknown) {
			const code = (error as {code?: string})?.code;
			if (code === "P2002" || (error as Error)?.message?.includes("Duplicate")) {
				logger.warn("[EXTERNAL_EVO_OP_DUPLICATE]", {key: data.idempotencyKey});
				return false;
			}
			logger.error("[EXTERNAL_EVO_OP_INSERT_ERROR]", {error, key: data.idempotencyKey});
			return false;
		}
	}

	static async getReady(limit: number = 20): Promise<ExternalEvoOperationSync[]> {
		try {
			const rows = await prisma.$queryRaw<ExternalEvoOperationSync[]>`
				SELECT *
				FROM external_evo_operation_sync
				WHERE status IN ('PENDING', 'FAILED')
				  AND next_retry_at <= NOW()
				ORDER BY next_retry_at ASC
				LIMIT ${limit}
			`;
			return rows ?? [];
		} catch (error) {
			logger.error("[EXTERNAL_EVO_OP_GET_READY_ERROR]", {error});
			return [];
		}
	}

	static async markProcessing(id: number): Promise<void> {
		await prisma.$executeRaw`
			UPDATE external_evo_operation_sync
			SET status = 'PROCESSING', updated_at = NOW()
			WHERE id = ${id}
		`;
	}

	static async markSuccess(id: number): Promise<void> {
		await prisma.$executeRaw`
			DELETE FROM external_evo_operation_sync
			WHERE id = ${id}
		`;
	}

	static async markFailed(id: number, retryCount: number, errorMessage: string, nextRetryAt: Date): Promise<void> {
		await prisma.$executeRaw`
			UPDATE external_evo_operation_sync
			SET status = 'FAILED',
			    retry_count = ${retryCount},
			    last_error = ${errorMessage},
			    next_retry_at = ${nextRetryAt},
			    updated_at = NOW()
			WHERE id = ${id}
		`;
	}
}
