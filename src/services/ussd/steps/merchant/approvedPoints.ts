import ussdMenuCustomer from "../../../../constants/ussdMenuCustomer";

export async function approvedPoints(
	sessionId: string,
	input: string,
	data: Record<string, any>
) {
	return {
		response: ussdMenuCustomer.thankContact,
		nextStep: null,
		updatedData: data,
	};
}