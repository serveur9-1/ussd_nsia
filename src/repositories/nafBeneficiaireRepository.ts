import {logger} from "../utils/logger";
import prisma from "../lib/prisma";
import {ResponseService} from "../types/appTypes";
import {NafBeneficiaire, NatBeneficiaireFormData} from "../types/models/nafBeneficiaire";

export default class NafBeneficiaireRepository {
	static async insert(data: NatBeneficiaireFormData): Promise<ResponseService<NafBeneficiaire | undefined>> {
		try {
			const beneficiary = await prisma.naf_beneficiaires.create({data})
			
			return {
				data: beneficiary as NafBeneficiaire,
				status: true
			};
		} catch (error) {
			logger.error('Erreur lors de l\'insertion du bénéficiaire NAF:', error);
			return {
				data: undefined,
				status: false
			};
		}
	}
}