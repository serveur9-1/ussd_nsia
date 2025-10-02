export interface NepRetrait {
  ID_RETRAIT: number;
  ID_SOUSCRIPTION: number;
  MONTANT_RETRAIT: number;
  DATE_RETRAIT: Date;
  REFERENCE_RETRAIT: string;
  TYPE_RETRAIT: TypeRetrait;
	MSISDN?: string;
}

export type TypeRetrait = 'RACHAT_TOTAL' | 'RACHAT_PARTIEL'

export type NepRetraitFormData = Omit<NepRetrait, 'ID_RETRAIT'>