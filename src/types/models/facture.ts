export interface Facture {
	ID_FACTURE: number
	REFERENCE: string;
	AMOUNT: string
	MSISDN: string;
	BILLMAP_TRANSACTION_ID: string;
	EWP_TRANSACTION_ID: string;
	RESPONSE_CODE: string;
	RESPONSE_MESSAGE: string;
	Date_transaction: string
	prime: string;
}

export type FactureFormData = Omit<Facture, 'ID_FACTURE'>