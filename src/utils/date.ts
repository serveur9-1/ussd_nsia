import {TypeFrequencyPlan} from "../types/plan";

const utilitiesDate = {
	daysBetween: (startDate: Date, endDate: Date): number => {
		const msPerDay = 1000 * 60 * 60 * 24;
		
		const utcStart = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
		const utcEnd = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
		
		return Math.floor((utcEnd - utcStart) / msPerDay);
	},
	getNextPaymentDate: ({
		                     frequency,
		                     interval = 1,
		                     fromDate = new Date(),
		                     withTime = false,
		                     forceFirstOfNextMonth = true
	                     }: {
		frequency: TypeFrequencyPlan,
		interval?: number,
		fromDate?: Date,
		withTime?: boolean,
		forceFirstOfNextMonth?: boolean
	}): string => {
		const base = new Date(fromDate);
		let next: Date;
		
		if (forceFirstOfNextMonth) {
			next = new Date(base.getFullYear(), base.getMonth() + 1, 1);
			next.setHours(base.getHours(), base.getMinutes(), base.getSeconds(), base.getMilliseconds());
		} else {
			next = new Date(base);
			if (frequency === "weekly") {
				next.setDate(base.getDate() + 7 * interval);
			} else if (frequency === "monthly") {
				next.setMonth(base.getMonth() + interval);
			} else if (frequency === "yearly") {
				next.setFullYear(base.getFullYear() + interval);
			}
		}
		
		const day = String(next.getDate()).padStart(2, "0");
		const month = String(next.getMonth() + 1).padStart(2, "0");
		const year = next.getFullYear();
		
		let formatted = `${day}/${month}/${year}`;
		
		if (withTime) {
			const hours = String(next.getHours()).padStart(2, "0");
			const minutes = String(next.getMinutes()).padStart(2, "0");
			const seconds = String(next.getSeconds()).padStart(2, "0");
			formatted += ` ${hours}:${minutes}:${seconds}`;
		}
		
		return formatted;
	},
	parseToDate: (str: string): Date => {
		const [datePart, timePart] = str.split(" ");
		const [day, month, year] = datePart.split("/").map(Number);
		const [hours = 0, minutes = 0, seconds = 0] = timePart ? timePart.split(":").map(Number) : [];
		return new Date(year, month - 1, day, hours, minutes, seconds);
	}
}

export default utilitiesDate
