import prisma from "../lib/prisma";
import {MerchantTransaction, MerchantTransactionFormData} from "../types/models/merchantTransaction";
import {ResponseService} from "../types/appTypes";
import {logger} from "../utils/logger";
import {PaymentResponseCode} from "../types/paymentTypes";

export default class MerchantTransactionRepository {
	static async insert(data: MerchantTransactionFormData): Promise<ResponseService<MerchantTransaction>> {
		try {
			const transaction = await prisma.merchant_transactions.create({data});
			
			return {
				data: transaction,
				status: true
			}
		} catch (error) {
			logger.error("Erreur lors de l'insertion de la transaction :", error);
			
			return {
				status: false
			};
		}
	}
	
	static async nbrSubscriptionDoneByMerchantThisDay(id_merchant: number): Promise<ResponseService<number>> {
		try {
			const result = await prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*) AS count
        FROM merchant_transactions
        WHERE id_merchant = ${id_merchant}
          AND etat_transaction = '01'
          AND DATE(date_transaction) = CURRENT_DATE
      `;
			
			const count = result[0]?.count ? Number(result[0].count) : 0;
			
			return {
				status: true,
				data: count,
			};
		} catch (error) {
			logger.error("Erreur lors du comptage des transactions merchant:", error);
			return {
				status: false,
				data: 0,
			};
		}
	}
	
	static async getMerchantTransaction(referenceTransaction: string): Promise<ResponseService<MerchantTransaction>> {
		try {
			const result = await prisma.$queryRaw<MerchantTransaction[]>`
        SELECT *
        FROM merchant_transactions
        WHERE reference_transaction = ${referenceTransaction}
        LIMIT 1
      `;
			
			if (result.length <= 0) {
				return {
					status: false
				};
			}
			
			return {
				status: true,
				data: result[0],
			};
		} catch (error) {
			logger.error("Erreur lors de la récupération de la transaction merchant:", error);
			return {
				status: false,
			};
		}
	}
	
	static async updateTransactionState(
		reference: string,
		etat: PaymentResponseCode
	): Promise<ResponseService<boolean>> {
		try {
			const result = await prisma.$executeRaw`
        UPDATE merchant_transactions
        SET etat_transaction = ${etat}
        WHERE reference_transaction = ${reference}
      `;
			
			return {
				status: true,
				data: result > 0,
			};
		} catch (error) {
			logger.error("Erreur lors de la mise à jour de l'état de la transaction merchant :", error);
			return {
				status: false,
				data: false,
			};
		}
	}
}