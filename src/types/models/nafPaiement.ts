import {PaymentResponseCode} from "../paymentTypes";

export interface NafPaiement {
	ID_PAIEMENT: number;
	ID_SOUSCRIPTION: number;
	MONTANT_PAIEMENT: bigint;
	DATE_PAIEMENT: Date;
	REFERENCE_PAIEMENT: string;
	ETAT_PAIEMENT: PaymentResponseCode;
	MSISDN?: string | null
}

export type NafPaiementFormData = Omit<NafPaiement, 'ID_PAIEMENT'>