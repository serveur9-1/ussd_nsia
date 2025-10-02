import {TypeMerchant} from "./commission";

export interface Merchant {
	id: number;
	noms_prenoms: string;
	phoneNo: string;
	commission: string;
	id_equipe: number;
	type_merchant: TypeMerchant;
	status: number;
	created_at: Date;
	updated_at: Date;
}