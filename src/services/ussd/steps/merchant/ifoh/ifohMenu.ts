import ussdMenuMerchant from "../../../../../constants/ussdMenuMerchant";

const ifoh = ussdMenuMerchant.ifoh

const ifohMenu = {
	main: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: ifoh.text,
				nextStep: "ifoh_menu_merchant",
				updatedData: data,
			};
		}
		
		if (input === ifoh.children.subscription.input) {
			return {
				response: ifoh.children.subscription.text,
				nextStep: "ifoh_subscription_main_merchant",
				updatedData: data,
			};
		}
		
		if (input === ifoh.children.pay().input) {
			return {
				response: ifoh.children.pay().text,
				nextStep: "ifoh_pay_main_merchant",
				updatedData: data,
			};
		}
		
		return {
			response: ifoh.messages.invalide(),
			nextStep: "ifoh_menu_merchant",
			updatedData: data,
		};
	}
}

export default ifohMenu