import {logger} from "../utils/logger";
import prisma from "../lib/prisma";
import {ResponseService} from "../types/appTypes";

export default class NafRetraitRepository {
	static async total(subscriptionId: number): Promise<ResponseService<number>> {
		try {
			const result = await prisma.$queryRaw<[{ SOMME: string | number | null }]>`
        SELECT SUM(MONTANT_RETRAIT) AS SOMME
        FROM naf_retraits
        WHERE ID_SOUSCRIPTION = ${subscriptionId}
      `;
			
			const sommeRaw = result[0]?.SOMME;
			
			return {
				data: Number(sommeRaw),
				status: true
			};
		} catch (error) {
			logger.error('Erreur lors de la récupération du total des retraits NAF:', error);
			return {
				data: 0,
				status: false
			};
		}
	}
}