import {PaymentResponseCode} from "../paymentTypes";

export interface NafSouscription {
	ID_SOUSCRIPTION: number;
	ID_CLIENT: number;
	ID_BENEFICIAIRE: number;
	MONTANT_SOUSCRIPTION: bigint;
	DATE_SOUSCRIPTION: Date;
	ETAT_SOUSCRIPTION: PaymentResponseCode;
	REFERENCE_SOUSCRIPTION: string;
	PROCHAIN_PAIEMENT: Date;
	NUMERO_POLICE: string | null;
	EVO_CONTRACT_ID?: number | null;
	MSISDN?: string,
}

export type NafSouscriptionFormData = Omit<NafSouscription, 'ID_SOUSCRIPTION' | 'NUMERO_POLICE' | 'EVO_CONTRACT_ID' | 'DATE_SOUSCRIPTION'>