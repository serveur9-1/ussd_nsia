export type ExternalEvoOperationType = "PAYMENT" | "RACHAT" | "CHANGE_BENEF";
export type ExternalEvoSyncStatus = "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED";

export interface ExternalEvoOperationSync {
	id: number;
	operation_type: ExternalEvoOperationType;
	product: string;
	msisdn: string;
	idempotency_key: string;
	payload: string;
	status: ExternalEvoSyncStatus;
	retry_count: number;
	last_error?: string | null;
	next_retry_at: Date;
	created_at: Date;
	updated_at: Date;
}
