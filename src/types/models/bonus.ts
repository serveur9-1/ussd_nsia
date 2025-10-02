import {TypeProductCommission} from "./commission";

export interface Bonus {
	id: number;
	montant: string;
	produit: TypeProductCommission;
	niveau: TypeNiveau;
}

export type TypeNiveau = 3 | 5