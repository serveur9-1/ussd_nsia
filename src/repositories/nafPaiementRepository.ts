import {logger} from "../utils/logger";
import prisma from "../lib/prisma";
import {ResponseService} from "../types/appTypes";
import {NafPaiement, NafPaiementFormData} from "../types/models/nafPaiement";
import {PaymentResponseCode} from "../types/paymentTypes";
import {NepPaiement} from "../types/models/nepPaiement";

export default class NafPaiementRepository {
	static async insert(data: NafPaiementFormData): Promise<ResponseService<NafPaiement | undefined>> {
		try {
			
			const result = await prisma.naf_paiements.create({data}) as unknown as NafPaiement;
			
			return {
				data: result,
				status: true
			};
		} catch (error) {
			logger.error('Erreur lors de l\'insertion du paiement NAF:', error);
			return {
				data: undefined,
				status: false
			};
		}
	}
	
	static async total(subscriptionId: number): Promise<ResponseService<number>> {
		try {
			const result: [{ SOMME?: number }] = await prisma.$queryRaw`
        SELECT SUM(MONTANT_PAIEMENT) AS SOMME
        FROM naf_paiements
        WHERE ID_SOUSCRIPTION = ${subscriptionId}
          AND ETAT_PAIEMENT = '01'
      `;
			
			const somme = result[0]?.SOMME || 0;
			
			return {
				data: Number(somme),
				status: true
			};
		} catch (error) {
			logger.error('Erreur lors de la récupération du total des paiements NAF:', error);
			return {
				data: 0,
				status: false
			};
		}
	}
	
	static async update(reference: string, etat: PaymentResponseCode): Promise<ResponseService<boolean>> {
		try {
			const result = await prisma.naf_paiements.updateMany({
				where: {REFERENCE_PAIEMENT: reference},
				data: {ETAT_PAIEMENT: etat},
			});
			
			return {
				data: result.count > 0,
				status: true
			};
		} catch (error) {
			logger.error(`Erreur lors de la mise à jour de l'état du paiement ${reference}:`, error);
			return {
				data: false,
				status: true
			};
		}
	}
	
	static async getByReference(reference: string): Promise<ResponseService<NafPaiement | undefined>> {
		try {
			const paiement = await prisma.naf_paiements.findFirst({
				where: {REFERENCE_PAIEMENT: reference},
			});
			
			if (paiement) {
				return {
					data: paiement,
					status: true
				};
			}
			
			return {
				status: false
			};
		} catch (error) {
			logger.error(`Erreur lors de la récupération du paiement ${reference}:`, error);
			return {
				status: false
			};
		}
	}
}