import {PrismaClient} from '@prisma/client';
import {NepSouscription} from "../types/models/nepSouscription";
import {logger} from "../utils/logger";
import {ResponseService} from "../types/appTypes";
import {NepClient, NepClientFormData} from "../types/models/nepClient";
import {Prisma} from '@prisma/client';
import NepPaiementRepository from "./nepPaiementRepository";
import NepRetraitsRepository from "./nepRetraitsRepository";

const prisma = new PrismaClient();

export default class NepClientRepository {
	static async activeNepClientSubscriptionsByMsisdn(
		msisdn: string,
		filterByEtat: boolean = true,
		birthDate?: string
	): Promise<ResponseService<NepSouscription>> {
		try {
			const conditionEtat = filterByEtat
				? Prisma.sql`AND s.ETAT_SOUSCRIPTION = '01'`
				: Prisma.empty;
			
			const conditionBirthDate = birthDate
				? Prisma.sql`AND c.BIRTH_DATE = ${birthDate}`
				: Prisma.empty;
			
			const data: NepSouscription[] = await prisma.$queryRaw`
            SELECT
                c.ID_CLIENT,
                c.MSISDN,
                c.BIRTH_DATE,
                s.ID_SOUSCRIPTION,
                s.ID_BENEFICIAIRE,
                s.MONTANT_SOUSCRIPTION,
                s.DATE_SOUSCRIPTION,
                s.REFERENCE_SOUSCRIPTION,
                s.PROCHAIN_PAIEMENT,
                s.NUMERO_POLICE,
                s.ETAT_SOUSCRIPTION
            FROM nep_clients c
            JOIN nep_souscriptions s ON c.ID_CLIENT = s.ID_CLIENT
            WHERE (c.MSISDN = ${msisdn} OR s.NUMERO_POLICE = ${msisdn})
            ${conditionEtat}
            ${conditionBirthDate}
        `;
			
			if (data?.length > 0) {
				return {
					data: data[0],
					status: true
				};
			}
			
			return {
				data: undefined,
				status: false
			};
		} catch (error) {
			logger.error('Error when get active subscription nepClient MSISDN %s: ', msisdn, {error});
			return {
				data: undefined,
				status: false
			};
		}
	}
	
	
	static async insert(data: NepClientFormData): Promise<ResponseService<NepClient>> {
		try {
			const result = await prisma.nep_clients.create({data}) as NepClient;
			
			return {
				status: true,
				data: result
			};
		} catch (error) {
			logger.error("Error when insert nep client with MSISDN %s", data.MSISDN, {error});
			return {
				status: false,
				data: undefined
			};
		}
	}
	
	static async balance(subscriptionId: number): Promise<ResponseService<{
		balance: number,
		totalPay: number,
		totalWithdrawal: number
	}>> {
		try {
			const resultTotalPayment = await NepPaiementRepository.totalPaymentBySubscription(subscriptionId);
			const resultTotalWithdrawal = await NepRetraitsRepository.totalWithdrawal(subscriptionId);
			return {
				data: {
					balance: (resultTotalPayment.data || 0) - (resultTotalWithdrawal.data || 0),
					totalPay: resultTotalPayment.data || 0,
					totalWithdrawal: resultTotalWithdrawal.data || 0
				},
				status: true
			};
		} catch (error) {
			logger.error('Error when get balance by subscriptionId', {error});
			return {
				data: {
					balance: 0,
					totalPay: 0,
					totalWithdrawal: 0
				},
				status: false
			};
		}
	}
}

