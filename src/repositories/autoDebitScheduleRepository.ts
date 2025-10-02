import {logger} from "../utils/logger";
import {ResponseService} from "../types/appTypes";
import {AutoDebitSchedule, AutoDebitScheduleFilter, AutoDebitScheduleFormData} from "../types/models/autoDebitSchedule";
import prisma from "../lib/prisma";

export default class AutoDebitScheduleRepository {
	static async getOne(filter: AutoDebitScheduleFilter): Promise<ResponseService<AutoDebitSchedule | undefined>> {
		try {
			const schedule = await prisma.auto_debit_schedule.findFirst({
				where: {
					...filter,
					deleted_at: null
				},
			}) as unknown as AutoDebitSchedule | null;
			
			if (!schedule) {
				return {data: undefined, status: false};
			}
			
			const scheduleWithParsedPlan = {
				...schedule,
				plan: JSON.parse(schedule.plan as unknown as string)
			};
			
			return {data: scheduleWithParsedPlan, status: true};
		} catch (error) {
			logger.error("Erreur lors de la récupération d'un auto debit schedule", {error});
			return {data: undefined, status: false};
		}
	}
	
	static async insert(data: AutoDebitScheduleFormData): Promise<ResponseService<AutoDebitSchedule>> {
		try {
			const schedule = await prisma.auto_debit_schedule.create({data}) as unknown as AutoDebitSchedule;
			
			return {
				data: schedule,
				status: true,
			};
		} catch (error) {
			logger.error("Erreur lors de l'insertion d'un auto debit schedule", {error});
			console.log(error)
			return {
				data: undefined,
				status: false,
			};
		}
	}
	
	static async update(id: number, data: Partial<AutoDebitScheduleFormData>): Promise<ResponseService<AutoDebitSchedule | undefined>> {
		try {
			const schedule = await prisma.auto_debit_schedule.update({
				where: {
					id,
					deleted_at: null
				},
				data,
			}) as unknown as AutoDebitSchedule;
			
			return {
				data: schedule,
				status: true,
			};
		} catch (error) {
			logger.error("Erreur lors de la mise à jour d'un auto debit schedule", {error});
			return {
				data: undefined,
				status: false,
			};
		}
	}
	
	static async delete(id: number): Promise<ResponseService<boolean>> {
		try {
			await prisma.auto_debit_schedule.delete({
				where: {id},
			});
			
			return {data: true, status: true};
		} catch (error) {
			logger.error("Erreur lors de la suppression d'un auto debit schedule", {error});
			return {data: false, status: false};
		}
	}
	
}
