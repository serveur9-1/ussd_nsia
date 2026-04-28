import {logger} from "../utils/logger";
import prisma from "../lib/prisma";
import {ResponseService, TimeUnit} from "../types/appTypes";
import {NafSouscription, NafSouscriptionFormData} from "../types/models/nafSouscription";
import {PaymentResponseCode} from "../types/paymentTypes";
import {NepSouscription} from "../types/models/nepSouscription";

export default class NafSouscriptionRepository {
	static async insert(data: NafSouscriptionFormData): Promise<ResponseService<NafSouscription | undefined>> {
		try {
			const result = await prisma.naf_souscriptions.create({
				data: {
					...data,
					DATE_SOUSCRIPTION: new Date()
				}
			}) as unknown as NafSouscription;
			
			return {
				data: result,
				status: true
			};
		} catch (error) {
			logger.error('Erreur lors de l\'insertion de la souscription NAF:', error);
			return {
				data: undefined,
				status: false
			};
		}
	}
	
	static async activityDuration(idSouscription: string): Promise<ResponseService<number>> {
		try {
			const result = await prisma.$queryRaw<[{ DIFF_DATE: string | number | null }]>`
        SELECT DATEDIFF(PROCHAIN_PAIEMENT, DATE_SOUSCRIPTION) AS DIFF_DATE
        FROM naf_souscriptions
        WHERE ID_SOUSCRIPTION = ${idSouscription}
      `;
			
			const diffRaw = result[0]?.DIFF_DATE;
			const diffDate = diffRaw ? Number(diffRaw) : 0;
			
			return {
				data: diffDate,
				status: true
			};
		} catch (error) {
			logger.error('Erreur lors de la récupération de la durée d\'activité NAF:', error);
			return {
				data: 0,
				status: false
			};
		}
	}
	
	static async update(
		etat: PaymentResponseCode,
		options: { idSouscription?: number; referenceSouscription?: string }
	): Promise<ResponseService<number>> {
		try {
			if (!options.idSouscription && !options.referenceSouscription) {
				logger.error("Vous devez fournir soit 'idSouscription' soit 'referenceSouscription'")
				return {
					status: false,
					data: 0
				}
			}
			
			const where: any = {};
			
			if (options.idSouscription) {
				where.ID_SOUSCRIPTION = options.idSouscription;
			} else if (options.referenceSouscription) {
				where.REFERENCE_SOUSCRIPTION = options.referenceSouscription;
			}
			
			const result = await prisma.naf_souscriptions.updateMany({
				where,
				data: {
					ETAT_SOUSCRIPTION: etat
				}
			});
			
			return {
				status: result.count > 0,
				data: result.count
			};
		} catch (error) {
			logger.error("Erreur lors de la mise à jour de la souscription NAF:", error);
			return {
				status: false,
				data: 0
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
      UPDATE naf_souscriptions
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

			const result = await prisma.naf_souscriptions.updateMany({
				where: {ID_SOUSCRIPTION: idSouscription},
				data: payload
			});

			return {data: result.count > 0, status: true};
		} catch (error) {
			logger.error("Erreur lors de la mise à jour des infos EVO NAF :", error);
			return {data: false, status: false};
		}
	}
	
	static async getByIdWithClient(idSouscription: number): Promise<ResponseService<NafSouscription & {
		FIRST_NAME: string,
		LAST_NAME: string
	}>> {
		try {
			const result = await prisma.$queryRaw`
            SELECT s.*, c.*, c.MSISDN as MSISDN
            FROM naf_souscriptions s
            JOIN naf_clients c ON s.ID_CLIENT = c.ID_CLIENT
            WHERE s.ID_SOUSCRIPTION = ${idSouscription}
            AND s.ETAT_SOUSCRIPTION = '01'
        ` as NafSouscription[];
			
			if (!result || result.length === 0) {
				return {data: undefined, status: false};
			}
			
			return {
				data: result[0] as NafSouscription & {
					FIRST_NAME: string,
					LAST_NAME: string
				}, status: true
			};
		} catch (error) {
			logger.error("Erreur lors de la récupération de la souscription avec client :", error);
			return {data: undefined, status: false};
		}
	}
}