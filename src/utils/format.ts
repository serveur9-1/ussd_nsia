import {Action, ProductTypes} from "../types/productTypes";

export const formatPhoneNumber = (msisdn: string, indicatif: string = '225', minLength: number = 10): string => {
	msisdn = msisdn.replace(/\s+/g, "");
	
	let formattedNumber = "";
	
	if (msisdn.length === minLength) {
		formattedNumber = msisdn;
	} else if (msisdn.length > minLength) {
		if (msisdn.startsWith("+" + indicatif)) {
			formattedNumber = msisdn.replace(new RegExp("^\\+" + indicatif), "");
		} else if (msisdn.startsWith(indicatif)) {
			formattedNumber = msisdn.replace(new RegExp("^" + indicatif), "");
		} else {
			formattedNumber = msisdn;
		}
	}
	
	return formattedNumber;
}

export const generateReference = (produit: ProductTypes, action: Action, msisdn: string) => {
	const now = new Date();
	
	const year = now.getFullYear();
	const month = now.getMonth() + 1;
	const day = now.getDate();
	const hour = now.getHours();
	const minute = now.getMinutes();
	const second = now.getSeconds();
	
	const pad2 = (n: number) => n.toString().padStart(2, '0');
	
	return "MQASH_" +
		msisdn + "_" +
		produit + "_" +
		action + "_" +
		year.toString() +
		pad2(month) +
		pad2(day) +
		pad2(hour) +
		pad2(minute) +
		pad2(second);
}

export const getCurrentDate = () => {
	const now = new Date();
	
	const month = (now.getMonth() + 1).toString().padStart(2, '0');
	const day = now.getDate().toString().padStart(2, '0');
	const year = now.getFullYear();
	
	return `${month}/${day}/${year}`;
}

export const formatDate = (date: string | number | Date = new Date(), format = 'YYYY-MM-DD'): string => {
	let d: Date;
	
	if (date instanceof Date) {
		d = date;
	} else if (typeof date === 'string' || true) {
		d = new Date(date);
	}
	
	if (isNaN(d.getTime())) {
		throw new Error('Invalid date');
	}
	
	const year = d.getFullYear().toString();
	const month = (d.getMonth() + 1).toString().padStart(2, '0');
	const day = d.getDate().toString().padStart(2, '0');
	
	return format
		.replace('YYYY', year)
		.replace('MM', month)
		.replace('DD', day);
};

export const getAge = (birthDateStr: string): number => {
	const [day, month, year] = birthDateStr.split('/').map(Number);
	const birthDate = new Date(year, month - 1, day);
	
	const today = new Date();
	let age = today.getFullYear() - birthDate.getFullYear();
	
	const hasBirthdayPassed =
		today.getMonth() > birthDate.getMonth() ||
		(today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
	
	if (!hasBirthdayPassed) {
		age--;
	}
	
	return age;
};

export const splitFullName = (fullName: string): { lastName: string; firstName: string } => {
	const parts = fullName.trim().split(/\s+/);
	if (parts.length === 1) {
		return {lastName: parts[0], firstName: ''};
	}
	const lastName = parts[0];
	const firstName = parts.slice(1).join(' ');
	return {lastName, firstName};
}

