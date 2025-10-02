import prisma from "../lib/prisma";
import {ResponseService} from "../types/appTypes";
import {logger} from "../utils/logger";
import {NepRetrait, NepRetraitFormData} from "../types/models/nepRetrait";

export default class NepRetraitsRepository {
	static async totalWithdrawal(idSouscription: number): Promise<ResponseService<number>> {
		try {
			const result = await prisma.$queryRaw<Array<{ SOMME?: number }>>`
        SELECT SUM(MONTANT_RETRAIT) AS SOMME
        FROM nep_retraits
        WHERE ID_SOUSCRIPTION = ${idSouscription}
      `;
			
			return {
				data: Number(result[0]?.SOMME ?? 0),
				status: true
			};
		} catch (error) {
			console.error("Erreur lors du calcul du total des retraits :", error);
			return {
				data: 0,
				status: false
			};
		}
	}
	
	static async nepRetraitByIdSubscription(
		subscriptionId: number,
		begin: Date,
		end: Date
	): Promise<ResponseService<NepRetrait[]>> {
		try {
			const retraits = await prisma.nep_retraits.findMany({
				where: {
					ID_SOUSCRIPTION: subscriptionId,
					DATE_RETRAIT: {
						gte: begin,
						lte: end,
					},
				},
			}) as unknown as NepRetrait[];
			
			return {
				data: retraits,
				status: true
			};
		} catch (error) {
			logger.error('Erreur lors de la récupération des retraits :', error);
			return {
				data: [],
				status: false
			};
		}
	}
	
	static async insert(data: NepRetraitFormData): Promise<ResponseService<NepRetrait>> {
		try {
			const withdraw = await prisma.nep_retraits.create({data}) as unknown as NepRetrait;
			
			return {
				data: withdraw,
				status: true
			};
		} catch (error) {
			console.error('Erreur lors de l’insertion du retrait :', error);
			return {
				data: undefined,
				status: false
			};
		}
	}
}
