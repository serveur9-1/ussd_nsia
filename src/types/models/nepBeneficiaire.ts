export interface NepBeneficiaire {
	ID_BENEFICIAIRE: number;
	NOM_BENEFICIAIRE: string;
	TELEPHONE_BENEFICIAIRE: string;
	TYPE_BENEFICIAIRE: string;
}

export type NepBeneficiareFormData = Omit<NepBeneficiaire, 'ID_BENEFICIAIRE'>
