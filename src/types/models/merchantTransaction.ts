import {PaymentResponseCode} from "../paymentTypes";

export interface MerchantTransaction {
	id: number
	id_client: number;
	id_merchant: number;
	reference_transaction: string;
	etat_transaction: PaymentResponseCode;
	montant_transaction: string;
	date_transaction: string;
}

export type MerchantTransactionFormData = Omit<MerchantTransaction, 'id'>