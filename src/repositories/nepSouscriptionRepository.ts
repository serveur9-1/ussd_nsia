import {logger} from "../utils/logger";
import {ResponseService, TimeUnit} from "../types/appTypes";
import {NepSouscription, NepSouscriptionFormData} from "../types/models/nepSouscription";
import utilitiesDate from "../utils/date";
import {PaymentResponseCode} from "../types/paymentTypes";
import prisma from "../lib/prisma";

export default class NepSouscriptionsRepository {
	static async insert(data: NepSouscriptionFormData): Promise<ResponseService<NepSouscription>> {
		try {
			const subscription = await prisma.nep_souscriptions.create({data}) as unknown as NepSouscription;
			
			return {
				data: subscription,
				status: true,
			};
		} catch (error) {
			logger.error("Erreur lors de l'insertion de la souscription NEP", {error});
			return {
				data: undefined,
				status: false,
			};
		}
	}
	
	static async activityDuration(idSouscription: number): Promise<ResponseService<number | undefined>> {
		try {
			const subscription = await prisma.nep_souscriptions.findUnique({
				where: {ID_SOUSCRIPTION: idSouscription},
				select: {DATE_SOUSCRIPTION: true}
			});
			
			if (!subscription) {
				return {
					data: undefined,
					status: false
				};
			}
			
			
			const currentDate = new Date();
			const diff = utilitiesDate.daysBetween(subscription.DATE_SOUSCRIPTION, currentDate);
			
			return {
				data: diff,
				status: true
			};
		} catch (error) {
			logger.error("Erreur lors de la récupération de la durée d'activité :", error);
			return {
				data: undefined,
				status: false
			};
		}
	}
	
	static async update(
		options: { idSouscription?: number; reference?: string },
		etat: PaymentResponseCode
	): Promise<ResponseService<number>> {
		try {
			if (!options.idSouscription && !options.reference) {
				return {
					data: 0,
					status: false
				};
			}
			
			const where = options.idSouscription
				? {ID_SOUSCRIPTION: options.idSouscription}
				: {REFERENCE_SOUSCRIPTION: options.reference!};
			
			const result = await prisma.nep_souscriptions.updateMany({
				where,
				data: {ETAT_SOUSCRIPTION: etat},
			});
			
			return {
				data: result.count,
				status: true
			};
		} catch (error) {
			logger.error("Erreur lors de la mise à jour de la souscription :", error);
			return {
				data: 0,
				status: false
			};
		}
	}
	
	static async updateNextPayment(idSouscription: number, nbrJours: number, timeUnit: TimeUnit): Promise<ResponseService<boolean>> {
		try {
			const allowedUnits = ["DAY", "MONTH", "YEAR"] as const;
			
			if (!allowedUnits.includes(timeUnit)) {
				return {
					data: false,
					status: false
				};
			}
			
			const query = `
      UPDATE nep_souscriptions
      SET PROCHAIN_PAIEMENT = DATE_ADD(PROCHAIN_PAIEMENT, INTERVAL ? ${timeUnit})
      WHERE ID_SOUSCRIPTION = ?
    `;
			
			const result = await prisma.$executeRawUnsafe(query, nbrJours, idSouscription);
			
			return {
				data: result > 0,
				status: true
			};
		} catch (error) {
			logger.error("Erreur lors de la mise à jour de la souscription :", error);
			return {
				data: false,
				status: false
			};
		}
	}

	static async updateEvoContractData(
		idSouscription: number,
		data: {numeroPolice?: string | null; evoContractId?: number | null}
	): Promise<ResponseService<boolean>> {
		try {
			const payload: {NUMERO_POLICE?: string | null; EVO_CONTRACT_ID?: number | null} = {};
			if (data.numeroPolice !== undefined) payload.NUMERO_POLICE = data.numeroPolice;
			if (data.evoContractId !== undefined) payload.EVO_CONTRACT_ID = data.evoContractId;
			if (Object.keys(payload).length === 0) {
				return {data: false, status: false};
			}

			const result = await prisma.nep_souscriptions.updateMany({
				where: {ID_SOUSCRIPTION: idSouscription},
				data: payload
			});

			return {data: result.count > 0, status: true};
		} catch (error) {
			logger.error("Erreur lors de la mise à jour des infos EVO NEP :", error);
			return {data: false, status: false};
		}
	}
	
	static async getByIdWithClient(idSouscription: number): Promise<ResponseService<NepSouscription & {
		FIRST_NAME: string,
		LAST_NAME: string
	}>> {
		try {
			const result = await prisma.$queryRaw`
            SELECT s.*, c.*, c.MSISDN as MSISDN
            FROM nep_souscriptions s
            JOIN nep_clients c ON s.ID_CLIENT = c.ID_CLIENT
            WHERE s.ID_SOUSCRIPTION = ${idSouscription}
            AND s.ETAT_SOUSCRIPTION = '01'
        ` as NepSouscription [];
			
			if (!result || result.length === 0) {
				return {data: undefined, status: false};
			}
			
			return {data: result[0] as NepSouscription & { FIRST_NAME: string, LAST_NAME: string }, status: true};
		} catch (error) {
			logger.error("Erreur lors de la récupération de la souscription avec client :", error);
			return {data: undefined, status: false};
		}
	}
}
