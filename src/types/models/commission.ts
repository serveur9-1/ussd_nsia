export interface Commission {
  id: number;
  montant: string;
  produit: TypeProductCommission;
  type_merchant: TypeMerchant;
  type_transaction: TypeTransaction;
}

export type TypeTransaction = 'souscription' | 'paiement'
export type TypeProductCommission = 'BLEBLE' | 'IFOH'
export type TypeMerchant = 1 | 2
