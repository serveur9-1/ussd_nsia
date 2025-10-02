import {PaymentResponseCode} from "../paymentTypes";

export interface NepPaiement {
	ID_PAIEMENT: number;
	ID_SOUSCRIPTION: number;
	MONTANT_PAIEMENT: BigInt;
	DATE_PAIEMENT: Date;
	REFERENCE_PAIEMENT: string;
	ETAT_PAIEMENT: PaymentResponseCode;
	prime: string;
	MSISDN?: string | null
}

export type NepPaiementFormData = Omit<NepPaiement, 'ID_PAIEMENT'>