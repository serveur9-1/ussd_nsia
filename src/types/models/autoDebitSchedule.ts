import {TypeProductCommission} from "./commission";

export interface AutoDebitSchedule {
	id: BigInt;
	product: TypeProductCommission;
	subscription_id: number;
	plan: any;
	next_debit_date: Date;
	retry_count: number;
	status: AutoDebitStatus;
	notified?: boolean
	processing?: boolean
	created_at: Date;
	updated_at: Date;
	deleted_at?: Date | null;
}

export type AutoDebitScheduleFilter = Partial<Pick<
	AutoDebitSchedule,
	"product" | "subscription_id" | "next_debit_date" | "deleted_at"
>>;

export type AutoDebitScheduleFormData = Omit<AutoDebitSchedule, "id" | "created_at" | "updated_at">

export type AutoDebitStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED'