import {PaymentResponseCode} from "../paymentTypes";

export interface NafClient extends NafClientInformation {
	ID_CLIENT: number;
	MSISDN: string;
	GENDER: string;
	BIRTH_DATE: string;
	TITLE: string;
	FIRST_NAME: string;
	LAST_NAME: string;
}

interface NafClientInformation {
	ID_CLIENT: number;
	MSISDN: string;
	ID_SOUSCRIPTION: number;
	ID_BENEFICIAIRE: string;
	MONTANT_SOUSCRIPTION: BigInt;
	DATE_SOUSCRIPTION: Date;
	REFERENCE_SOUSCRIPTION: string;
	PROCHAIN_PAIEMENT: Date;
	NUMERO_POLICE: string;
	EVO_CONTRACT_ID?: number | null;
	ETAT_SOUSCRIPTION: PaymentResponseCode;
}

export type NafClientFormData = Pick<NafClient, 'MSISDN'|'GENDER'|'BIRTH_DATE'|'TITLE'|'FIRST_NAME'|'LAST_NAME'>