import ussd from "../../../../constants/ussdMenuCustomer";
import ussdMenuMerchant from "../../../../constants/ussdMenuMerchant";
import {checkingMerchant} from "./ussdRoutesMerchant";

export async function mainMenu(sessionid: string, input: string, data: Record<string, any>, req: Record<string, any>) {
	if (input === "__REPEAT__") {
		return {
			response: ussdMenuMerchant.main,
			nextStep: "main_menu_merchant",
			updatedData: data,
		};
	}
	
	if (input === ussdMenuMerchant.bleble.input) {
		return {
			response: ussdMenuMerchant.bleble.text,
			nextStep: "bleble_menu_merchant",
			updatedData: data,
		};
	}
	
	if (input === ussdMenuMerchant.ifoh.input) {
		return {
			response: ussdMenuMerchant.ifoh.text,
			nextStep: "ifoh_menu_merchant",
			updatedData: data,
		};
	}
	
	if (input === ussdMenuMerchant.checkCommission.input) {
		const {status, responseNotMerchant, merchant} = await checkingMerchant(req.msisdn, data)
		
		if (!status || !merchant) {
			return responseNotMerchant;
		}
		
		return {
			response: ussdMenuMerchant.checkCommission.messages.commission(Number(merchant.commission)),
			nextStep: null,
			updatedData: data,
		};
	}
	
	return {
		response: `${ussdMenuMerchant.chooseInvalide}\n${ussdMenuMerchant.main}`,
		nextStep: "main_menu_merchant",
		updatedData: data,
	};
}
