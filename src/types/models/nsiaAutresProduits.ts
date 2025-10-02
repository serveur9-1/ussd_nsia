export interface NsiaAutresProduits {
	ID_SOUSCRIPTION: number;
	NUMERO_POLICE: string;
	MONTANT: string;
	NOM_PRODUIT: string;
	PERIODE_FACTURE: string;
	ETAT_PAIEMENT: StatePayment;
	
	Numero_police: string,
	Montant: string
	Nom_produit: string,
	Periode_facture: string
}

export type StatePayment = 'impayé' | 'payé'