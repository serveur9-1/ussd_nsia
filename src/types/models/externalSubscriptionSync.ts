export type ExternalSyncStatus = "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED";

export interface ExternalSubscriptionSync {
	id: number;
	product: "BLEBLE" | "IFOH";
	local_reference: string;
	local_subscription_id: number;
	msisdn: string;
	payload: string;
	status: ExternalSyncStatus;
	retry_count: number;
	last_error?: string | null;
	next_retry_at: Date;
	created_at: Date;
	updated_at: Date;
}
