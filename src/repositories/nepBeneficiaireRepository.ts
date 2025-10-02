import {PrismaClient} from "@prisma/client";
import {NepBeneficiaire, NepBeneficiareFormData} from "../types/models/nepBeneficiaire";
import {logger} from "../utils/logger";
import {ResponseService} from "../types/appTypes";

const prisma = new PrismaClient();

export default class NepBeneficiairesRepository {
	static async insert(data: NepBeneficiareFormData): Promise<ResponseService<NepBeneficiaire>> {
		try {
			const beneficiary = await prisma.nep_beneficiaires.create({data});
			
			return {
				data: beneficiary,
				status: true
			}
		} catch (error) {
			logger.error("Error insert NepBeneficiaire", {error});
			return {
				data: undefined,
				status: false
			}
		}
	}
}