import prisma from "../lib/prisma";
import {ExternalSubscriptionSync} from "../types/models/externalSubscriptionSync";
import {logger} from "../utils/logger";

export default class ExternalSubscriptionSyncRepository {
	static async insert(data: {
		product: "BLEBLE" | "IFOH";
		localReference: string;
		localSubscriptionId: number;
		msisdn: string;
		payload: Record<string, unknown>;
		nextRetryAt?: Date;
	}): Promise<boolean> {
		try {
			const nextRetryAt = data.nextRetryAt ?? new Date();
			await prisma.$executeRaw`
				INSERT INTO external_subscription_sync
				(product, local_reference, local_subscription_id, msisdn, payload, status, retry_count, next_retry_at, created_at, updated_at)
				VALUES
				(${data.product}, ${data.localReference}, ${data.localSubscriptionId}, ${data.msisdn}, ${JSON.stringify(data.payload)}, 'PENDING', 0, ${nextRetryAt}, NOW(), NOW())
			`;
			return true;
		} catch (error) {
			logger.error("[EXTERNAL_SYNC_QUEUE_INSERT_ERROR]", {error, localReference: data.localReference});
			return false;
		}
	}

	static async getReady(limit: number = 20): Promise<ExternalSubscriptionSync[]> {
		try {
			const rows = await prisma.$queryRaw<ExternalSubscriptionSync[]>`
				SELECT *
				FROM external_subscription_sync
				WHERE status IN ('PENDING', 'FAILED')
				  AND next_retry_at <= NOW()
				ORDER BY next_retry_at ASC
				LIMIT ${limit}
			`;
			return rows ?? [];
		} catch (error) {
			logger.error("[EXTERNAL_SYNC_QUEUE_GET_READY_ERROR]", {error});
			return [];
		}
	}

	static async markProcessing(id: number): Promise<void> {
		await prisma.$executeRaw`
			UPDATE external_subscription_sync
			SET status = 'PROCESSING', updated_at = NOW()
			WHERE id = ${id}
		`;
	}

	static async markSuccess(id: number): Promise<void> {
		await prisma.$executeRaw`
			DELETE FROM external_subscription_sync
			WHERE id = ${id}
		`;
	}

	static async markFailed(id: number, retryCount: number, errorMessage: string, nextRetryAt: Date): Promise<void> {
		await prisma.$executeRaw`
			UPDATE external_subscription_sync
			SET status = 'FAILED',
			    retry_count = ${retryCount},
			    last_error = ${errorMessage},
			    next_retry_at = ${nextRetryAt},
			    updated_at = NOW()
			WHERE id = ${id}
		`;
	}
}
