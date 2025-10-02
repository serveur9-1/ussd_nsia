import ussdMenuCustomer from "../../../../../constants/ussdMenuCustomer";
import {approvedPoints} from "../approvedPoints";

const informations = ussdMenuCustomer.ifoh.children.informations

const ifohInformationsMenu = {
	main: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: informations.text,
				nextStep: "ifoh_informations_main_customer",
				updatedData: data,
			};
		}
		
		if (input === informations.children.required.input) {
			return {
				response: informations.children.required.text,
				nextStep: null,
				updatedData: data,
			};
		}
		
		if (input === informations.children.approvedPoint.input) {
			return approvedPoints(sessionId, input, data);
		}
		
		return {
			response: informations.messages.invalide(),
			nextStep: "ifoh_informations_main_customer",
			updatedData: data,
		};
	}
}

export default ifohInformationsMenu