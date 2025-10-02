export interface NafBeneficiaire {
	ID_BENEFICIAIRE: number;
	NOM_BENEFICIAIRE: string;
	TELEPHONE_BENEFICIAIRE: string;
	TYPE_BENEFICIAIRE: TypeBeneficiary;
}

export type TypeBeneficiary = 'Conjoint' | 'Pere_Mere' | 'Enfant'

export type NatBeneficiaireFormData = Omit<NafBeneficiaire, 'ID_BENEFICIAIRE'>