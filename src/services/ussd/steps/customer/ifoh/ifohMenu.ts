import ussdMenuCustomer from "../../../../../constants/ussdMenuCustomer";

const ifoh = ussdMenuCustomer.ifoh

const ifohMenu = {
	main: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: ifoh.text,
				nextStep: "ifoh_menu_customer",
				updatedData: data,
			};
		}
		
		if (input === ifoh.children.subscription.input) {
			return {
				response: ifoh.children.subscription.text,
				nextStep: "ifoh_subscription_main_customer",
				updatedData: data,
			};
		}
		
		if (input === ifoh.children.pay().input) {
			return {
				response: ifoh.children.pay().text,
				nextStep: "ifoh_pay_main_customer",
				updatedData: data,
			};
		}
		
		if (input === ifoh.children.checkCoverage.input) {
			return {
				response: ussdMenuCustomer.bleble.children.partialWithdraw.children.phoneNumber.text(),
				nextStep: "ifoh_checkCoverage_main_customer",
				updatedData: data,
			};
		}
		
		if (input === ifoh.children.cancelContract.input) {
			return {
				response: ussdMenuCustomer.ifoh.children.cancelContract.children.agree.text,
				nextStep: "ifoh_cancelContract_agree_customer",
				updatedData: data,
			};
		}
		
		if (input === ifoh.children.informations.input) {
			return {
				response: ussdMenuCustomer.ifoh.children.informations.text,
				nextStep: "ifoh_informations_main_customer",
				updatedData: data,
			};
		}
		
		return {
			response: ifoh.messages.invalide(),
			nextStep: "ifoh_menu_customer",
			updatedData: data,
		};
	}
}

export default ifohMenu