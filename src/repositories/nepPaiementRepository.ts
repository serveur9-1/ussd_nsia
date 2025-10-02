import prisma from "../lib/prisma";
import {logger} from "../utils/logger";
import {ResponseService} from "../types/appTypes";
import {NepPaiement, NepPaiementFormData} from "../types/models/nepPaiement";
import {PaymentResponseCode} from "../types/paymentTypes";

export default class NepPaiementRepository {
	static async totalPaymentBySubscription(idSouscription: number): Promise<ResponseService<number>> {
		try {
			const result: [{ SOMME?: number }] = await prisma.$queryRaw`
      SELECT SUM(prime) AS SOMME
      FROM nep_paiements
      WHERE ID_SOUSCRIPTION = ${idSouscription}
      AND ETAT_PAIEMENT = '01'`;
			
			return {
				data: Number(result[0]?.SOMME ?? 0),
				status: true
			}
		} catch (error) {
			logger.error('Error retrieving total NEP payments', {error});
			return {
				data: 0,
				status: false
			}
		}
	}
	
	static async insert(data: NepPaiementFormData): Promise<ResponseService<NepPaiement>> {
		try {
			const payment = await prisma.nep_paiements.create({
				data: {
					...data,
					MONTANT_PAIEMENT: Number(data.MONTANT_PAIEMENT)
				}
			});
			
			return {
				data: payment,
				status: true
			}
		} catch (error) {
			console.error("Error when inserting a payment:", error);
			return {
				data: undefined,
				status: false
			};
		}
	}
	
	static async update(reference: string, etat: PaymentResponseCode): Promise<ResponseService<boolean>> {
		try {
			const result = await prisma.nep_paiements.updateMany({
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
	
	static async getByReference(reference: string): Promise<ResponseService<NepPaiement | undefined>> {
		try {
			const paiement = await prisma.nep_paiements.findFirst({
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