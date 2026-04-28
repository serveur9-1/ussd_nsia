import {PaymentResponseCode} from "../paymentTypes";

export interface NepSouscription {
	ID_CLIENT: number;
	ID_BENEFICIAIRE: number;
	DATE_SOUSCRIPTION: Date;
	REFERENCE_SOUSCRIPTION: string;
	PROCHAIN_PAIEMENT: Date;
	NUMERO_POLICE: string | null;
	EVO_CONTRACT_ID?: number | null;
	ETAT_SOUSCRIPTION: PaymentResponseCode;
	ID_SOUSCRIPTION: number;
	MONTANT_SOUSCRIPTION: bigint | number;
	MSISDN?: string;
	BIRTH_DATE?: string
}

export type NepSouscriptionFormData = Omit<NepSouscription, 'ID_SOUSCRIPTION' | 'NUMERO_POLICE' | 'EVO_CONTRACT_ID'>