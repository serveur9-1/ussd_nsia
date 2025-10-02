import {logger} from "../utils/logger";
import {ResponseService} from "../types/appTypes";
import {NsiaAutresProduits, StatePayment} from "../types/models/nsiaAutresProduits";
import prisma from "../lib/prisma";

export default class NsiaAutresProduitsRepository {
	static async impayesAutresProduits(numeroPolice: string): Promise<ResponseService<NsiaAutresProduits[]>> {
		try {
			const results = await prisma.$queryRaw<NsiaAutresProduits[]>`
    		SELECT
      		NUMERO_POLICE AS Numero_police,
      		MONTANT AS Montant,
      		NOM_PRODUIT AS Nom_produit,
      		PERIODE_FACTURE AS Periode_facture
    		FROM nsia_autres_produits
    			WHERE NUMERO_POLICE = ${numeroPolice}
      		AND ETAT_PAIEMENT = 'impayé'
    			LIMIT 3`;
			
			return {
				data: results,
				status: true,
			};
		} catch (error) {
			logger.error("Erreur lors de la récupération des produits impayés NSIA", {error});
			return {
				data: undefined,
				status: false,
			};
		}
	}
	
	static async impayesAutresProduitsNsia(userInput: string): Promise<ResponseService<NsiaAutresProduits>> {
		try {
			const [results] = await prisma.$queryRaw<NsiaAutresProduits[]>`
    		SELECT *
    		FROM nsia_autres_produits
    			WHERE NUMERO_POLICE = ${userInput}
      		AND ETAT_PAIEMENT = 'impayé'
      	LIMIT 1`;
			
			return {
				data: results,
				status: true,
			};
		} catch (error) {
			logger.error("Erreur lors de la récupération des produits impayés NSIA", {error});
			return {
				data: undefined,
				status: false,
			};
		}
	}
	
	static async updateAutresProduitsState(numeroPolice: string, etat: StatePayment, produit: string, periode: string): Promise<ResponseService<boolean>> {
		try {
			const result = await prisma.$executeRaw`
        UPDATE nsia_autres_produits
        SET ETAT_PAIEMENT = ${etat}
        WHERE NUMERO_POLICE = ${numeroPolice}
          AND NOM_PRODUIT = ${produit}
          AND PERIODE_FACTURE = ${periode};
      `;
			
			return {
				data: result > 0,
				status: true
			};
		} catch (error) {
			logger.error("Erreur lors de la mise à jour de l'état du produit autre :", error);
			return {
				data: false,
				status: false
			};
		}
	}
}
