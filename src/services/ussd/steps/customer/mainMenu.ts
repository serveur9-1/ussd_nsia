import ussd from "../../../../constants/ussdMenuCustomer";
import ussdMenuCustomer from "../../../../constants/ussdMenuCustomer";

export async function mainMenu(sessionid: string, input: string, data: Record<string, any>) {
	if (input === "__REPEAT__") {
		return {
			response: ussd.main,
			nextStep: "main_menu_customer",
			updatedData: data,
		};
	}
	
	if (input === ussdMenuCustomer.bleble.input) {
		return {
			response: ussdMenuCustomer.bleble.text,
			nextStep: "bleble_menu_customer",
			updatedData: data,
		};
	}
	
	if (input === ussdMenuCustomer.ifoh.input) {
		return {
			response: ussdMenuCustomer.ifoh.text,
			nextStep: "ifoh_menu_customer",
			updatedData: data,
		};
	}
	
	if (input === ussdMenuCustomer.otherProducts.input) {
		return {
			response: ussdMenuCustomer.otherProducts.children.police.text,
			nextStep: "otherProducts_main_customer",
			updatedData: data,
		};
	}
	
	return {
		response: `${ussdMenuCustomer.chooseInvalide}\n${ussdMenuCustomer.main}`,
		nextStep: "main_menu_customer",
		updatedData: data,
	};
}
