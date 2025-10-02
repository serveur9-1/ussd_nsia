import {logger} from "../utils/logger";
import prisma from "../lib/prisma";
import {ResponseService} from "../types/appTypes";
import {NafClient, NafClientFormData} from "../types/models/napClient";
import NafPaiementRepository from "./nafPaiementRepository";
import NafRetraitRepository from "./nafRetraitRepository";
import {Prisma} from "@prisma/client";

export default class NafClientRepository {
	static async informations(
		msisdn: string,
		birthDate?: string
	): Promise<ResponseService<NafClient | undefined>> {
		try {
			const result = await prisma.$queryRaw<NafClient[]>`
            SELECT
                c.ID_CLIENT,
                c.MSISDN,
                s.ID_SOUSCRIPTION,
                s.ID_BENEFICIAIRE,
                s.MONTANT_SOUSCRIPTION,
                s.DATE_SOUSCRIPTION,
                s.REFERENCE_SOUSCRIPTION,
                s.PROCHAIN_PAIEMENT,
                s.NUMERO_POLICE,
                s.ETAT_SOUSCRIPTION
            FROM naf_clients c
            INNER JOIN naf_souscriptions s
                ON c.ID_CLIENT = s.ID_CLIENT
            WHERE s.ETAT_SOUSCRIPTION = '01'
              AND (c.MSISDN = ${msisdn} OR s.NUMERO_POLICE = ${msisdn})
              ${birthDate ? Prisma.sql`AND c.BIRTH_DATE = ${birthDate}` : Prisma.empty}
        `;
			
			return {
				data: result.length > 0 ? result[0] : undefined,
				status: result.length > 0
			};
		} catch (error) {
			logger.error('Erreur lors de la récupération des informations client NAF:', error);
			return {
				data: undefined,
				status: false
			};
		}
	}
	
	
	static async insert(data: NafClientFormData): Promise<ResponseService<NafClient | undefined>> {
		try {
			const client = await prisma.naf_clients.create({data});
			
			return {
				data: client as NafClient,
				status: true
			};
		} catch (error) {
			logger.error('Erreur lors de l\'insertion du client NAF:', error);
			return {
				data: undefined,
				status: false
			};
		}
	}
	
	static async balance(subscriptionId: number): Promise<ResponseService<{
		balance: number,
		totalPay: number,
		totalWithdrawal: number
	}>> {
		try {
			const resultPayment = await NafPaiementRepository.total(subscriptionId)
			const resultWithdrawal = await NafRetraitRepository.total(subscriptionId)
			
			return {
				data: {
					balance: (resultPayment.data || 0) - (resultWithdrawal.data || 0),
					totalPay: resultPayment.data || 0,
					totalWithdrawal: resultWithdrawal.data || 0
				},
				status: true
			}
		} catch (error) {
			logger.error('Erreur lors de l\'insertion du client NAF:', error);
			return {
				data: {
					balance: 0,
					totalPay: 0,
					totalWithdrawal: 0
				},
				status: false
			}
		}
	}
}