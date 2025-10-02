import {ResponseService} from "../types/appTypes";
import {Bonus, TypeNiveau} from "../types/models/bonus";
import prisma from "../lib/prisma";
import {logger} from "../utils/logger";
import {TypeProductCommission} from "../types/models/commission";

export default class BonusRepository {
	static async getMerchantClientBonus(produit: TypeProductCommission, level: TypeNiveau): Promise<ResponseService<Bonus>> {
		try {
			const result = await prisma.$queryRaw<Bonus[]>`
        SELECT *
        FROM bonus
        WHERE produit = ${produit}
          AND niveau = ${level}
      `;
			
			if (result.length <= 0) {
				return {
					status: false,
				};
			}
			
			return {
				status: true,
				data: result[0],
			};
		} catch (error) {
			logger.error("Erreur lors de la récupération du bonus merchant:", error);
			return {
				status: false,
			};
		}
	}
	
	static async insertMerchantBonus(
		tableName: string,
		idMerchantTransaction: number,
		idMerchant: number,
		montant: number
	): Promise<number> {
		try {
			const insertedRows: { id: number }[] = await prisma.$queryRawUnsafe(
				`INSERT INTO ${tableName} (id_merchant_transaction, id_merchant, montant)
       VALUES (?, ?, ?) RETURNING id`,
				idMerchantTransaction,
				idMerchant,
				montant
			);
			
			if (insertedRows.length > 0) {
				return insertedRows[0].id;
			} else {
				return 0;
			}
		} catch (error) {
			logger.error('Error inserting merchant bonus:', error);
			return 0;
		}
	}
}
