import ussdMenuMerchant from "../../../../../constants/ussdMenuMerchant";

export async function blebleMenu(sessionid: string, input: string, data: Record<string, any>, req: Record<string, any>) {
	if (input === "__REPEAT__") {
		return {
			response: ussdMenuMerchant.bleble.text,
			nextStep: "bleble_menu_merchant",
			updatedData: data,
		};
	}
	
	if (input === ussdMenuMerchant.bleble.children.subscription.input) {
		return {
			response: ussdMenuMerchant.bleble.children.subscription.text,
			nextStep: "bleble_subscription_start_merchant",
			updatedData: data,
		};
	}
	
	if (input === ussdMenuMerchant.bleble.children.pay.input) {
		return {
			response: ussdMenuMerchant.bleble.children.pay.text,
			nextStep: "bleble_pay_phone_merchant",
			updatedData: data,
		};
	}
	
	return {
		response: `${ussdMenuMerchant.chooseInvalide}\n${ussdMenuMerchant.bleble.text}`,
		nextStep: "bleble_menu_merchant",
		updatedData: data,
	};
}