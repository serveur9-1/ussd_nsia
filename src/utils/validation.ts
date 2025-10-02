import {formatPhoneNumber} from "./format";

export const validationName = (name: string) => {
	const trimmed = name.trim().replace(/\s+/g, " ");
	
	const nameParts = trimmed.split(" ");
	const isValid = nameParts.length >= 2 && nameParts.every(part => /^[A-Za-zÀ-ÿ'’-]{2,}$/.test(part));
	
	return {
		data: trimmed,
		isValid
	}
}

export const validationDate = (date: string) => {
	const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
	
	if (!dateRegex.test(date)) {
		return {data: date, isValid: false};
	}
	
	const [day, month, year] = date.split('/').map(Number);
	const parsedDate = new Date(year, month - 1, day);
	
	const isValid =
		parsedDate.getFullYear() === year &&
		parsedDate.getMonth() === month - 1 &&
		parsedDate.getDate() === day;
	
	return {data: date, isValid};
};


export const validationPhoneNumber = (phoneNumber: string) => {
	phoneNumber = formatPhoneNumber(phoneNumber.trim())
	
	return {
		data: phoneNumber,
		isValid: /^\d{10}$/.test(phoneNumber)
	}
}

export const validationAmount = (amount: string | number) => {
	const strAmount = amount?.toString().trim();
	
	const isValid = /^[0-9]+$/.test(strAmount);
	
	return {
		data: isValid ? Number(strAmount) : undefined,
		isValid,
	};
};

