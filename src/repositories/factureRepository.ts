import prisma from "../lib/prisma";
import {logger} from "../utils/logger";
import {Facture, FactureFormData} from "../types/models/facture";
import {ResponseService} from "../types/appTypes";

export default class FactureRepository {
	static async insert(data: FactureFormData): Promise<ResponseService<Facture>> {
		try {
			const result = await prisma.factures.create({data});
			
			return {
				data: result,
				status: true
			}
		} catch (error) {
			logger.error("Erreur lors de l'insertion de la facture :", error);
			return {
				status: false,
			}
		}
	}
	
	static async getFactures(reference: string) {
		const result: any = {Bills: []};
		const tabref = reference.split("_");
		
		if (tabref.length < 4) {
			throw new Error("Référence invalide");
		}
		
		const categorie = tabref[2];
		const action = tabref[3];
		const etat = "1000";
		
		let rows: any[] = [];
		
		if (categorie === "NEP") {
			const detailAction = action.split("-");
			if (action === "SOUS") {
				rows = await prisma.nep_souscriptions.findMany({
					where: {
						REFERENCE_SOUSCRIPTION: reference,
						ETAT_SOUSCRIPTION: etat
					},
					select: {
						REFERENCE_SOUSCRIPTION: true,
						MONTANT_SOUSCRIPTION: true
					}
				});
				result.Bills = rows.map(r => ({
					Reference: r.REFERENCE_SOUSCRIPTION,
					Amount: Number(r.MONTANT_SOUSCRIPTION)
				}));
			}
			
			if (detailAction.length === 3 && detailAction[0] === "PAY") {
				rows = await prisma.nep_paiements.findMany({
					where: {
						REFERENCE_PAIEMENT: reference,
						ETAT_PAIEMENT: etat
					},
					select: {
						REFERENCE_PAIEMENT: true,
						MONTANT_PAIEMENT: true
					}
				});
				result.Bills = rows.map(r => ({
					Reference: r.REFERENCE_PAIEMENT,
					Amount: Number(r.MONTANT_PAIEMENT)
				}));
			}
		}
		
		if (categorie === "NAF") {
			const detailAction = action.split("-");
			if (action === "SOUS") {
				rows = await prisma.naf_souscriptions.findMany({
					where: {
						REFERENCE_SOUSCRIPTION: reference,
						ETAT_SOUSCRIPTION: etat
					},
					select: {
						REFERENCE_SOUSCRIPTION: true,
						MONTANT_SOUSCRIPTION: true
					}
				});
				result.Bills = rows.map(r => ({
					Reference: r.REFERENCE_SOUSCRIPTION,
					Amount: Number(r.MONTANT_SOUSCRIPTION)
				}));
			}
			
			if (detailAction.length === 3 && detailAction[0] === "PAY") {
				rows = await prisma.naf_paiements.findMany({
					where: {
						REFERENCE_PAIEMENT: reference,
						ETAT_PAIEMENT: etat
					},
					select: {
						REFERENCE_PAIEMENT: true,
						MONTANT_PAIEMENT: true
					}
				});
				result.Bills = rows.map(r => ({
					Reference: r.REFERENCE_PAIEMENT,
					Amount: Number(r.MONTANT_PAIEMENT)
				}));
			}
		}
		
		return result;
	}
}
