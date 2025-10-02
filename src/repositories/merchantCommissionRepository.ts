import prisma from "../lib/prisma";
import {ResponseService} from "../types/appTypes";
import {logger} from "../utils/logger";
import {Commission, TypeMerchant, TypeProductCommission, TypeTransaction} from "../types/models/commission";

export default class MerchantCommissionRepository {
	static async getCommission(
		typeMerchant: TypeMerchant,
		produit: TypeProductCommission,
		typeTransaction: TypeTransaction
	): Promise<ResponseService<Commission>> {
		try {
			const result = await prisma.$queryRaw<
				Commission[]
			>`
        SELECT *
        FROM commission
        WHERE produit = ${produit}
          AND type_merchant = ${typeMerchant}
          AND type_transaction = ${typeTransaction}
        LIMIT 1
      `;
			
			if (result?.length >= 0) {
				return {
					status: true,
					data: result[0],
				};
			}
			
			return {
				status: false,
			};
		} catch (error) {
			logger.error("Erreur lors de la récupération de la commission merchant :", error);
			return {
				status: false,
			};
		}
	}
	
	static async updateCommission(
		commission: number,
		phoneNo: string
	): Promise<ResponseService<boolean>> {
		try {
			const result = await prisma.$executeRaw`
        UPDATE merchant
        SET commission = ${commission}
        WHERE phoneNo = ${"225" + phoneNo} OR phoneNo = ${phoneNo}
      `;
			
			return {
				status: true,
				data: result > 0,
			};
		} catch (error) {
			logger.error("Erreur lors de la mise à jour de la commission merchant :", error);
			return {
				status: false,
				data: false,
			};
		}
	}
}
