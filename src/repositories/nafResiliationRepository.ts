import {logger} from "../utils/logger";
import prisma from "../lib/prisma";
import {ResponseService} from "../types/appTypes";
import {NafResiliation, NafResiliationFormData} from "../types/models/nafResiliation";
import {formatDate, getCurrentDate} from "../utils/format";

export default class NafResiliationRepository {
	static async insert(data: NafResiliationFormData): Promise<ResponseService<NafResiliation | undefined>> {
		try {
			const result = await prisma.naf_resiliation.create({
				data: {
					...data,
					date_resiliation: formatDate(getCurrentDate(), 'DD-MM-YYYY')
				}
			});
			
			return {
				data: result,
				status: true
			};
		} catch (error) {
			logger.error('Erreur lors de l\'insertion de la résiliation NAF:', error);
			return {
				data: undefined,
				status: false
			};
		}
	}
}