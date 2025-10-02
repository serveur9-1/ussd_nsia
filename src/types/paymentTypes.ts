export type PaymentResponseCode = "01" | "1000" | "100" | "529" | "515" | "-1" | "00" | string;

export type PaymentResult = { success: true; code: "1000" | "01"; message: string } | {
	success: false;
	code: PaymentResponseCode;
	message: string
};

export interface PayParams {
	msisdn: string,
	reference: string,
	amount: number,
	message?: string
}