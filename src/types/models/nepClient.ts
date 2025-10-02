export interface NepClient {
	ID_CLIENT: number;
	MSISDN: string;
	GENDER: string;
	BIRTH_DATE: string;
	TITLE: string;
	FIRST_NAME: string;
	LAST_NAME: string;
}

export type NepClientFormData = Omit<NepClient, 'ID_CLIENT'>