export interface NafResiliation {
	id: number
	id_souscription: string
	msisdn: string
	date_resiliation: string
}

export type NafResiliationFormData = Omit<NafResiliation, 'id' | 'date_resiliation'>
