import ussdMenuCustomer from "../../../../../constants/ussdMenuCustomer";
import {approvedPoints} from "../approvedPoints";

export async function blebleMenu(sessionid: string, input: string, data: Record<string, any>, req: Record<string, any>) {
	if (input === "__REPEAT__") {
		return {
			response: ussdMenuCustomer.bleble.text,
			nextStep: "bleble_menu_customer",
			updatedData: data,
		};
	}
	
	if (input === ussdMenuCustomer.bleble.children.subscription.input) {
		return {
			response: ussdMenuCustomer.bleble.children.subscription.text,
			nextStep: "bleble_subscription_start_customer",
			updatedData: data,
		};
	}
	
	if (input === ussdMenuCustomer.bleble.children.pay.input) {
		return {
			response: ussdMenuCustomer.bleble.children.pay.text,
			nextStep: "bleble_pay_phone_customer",
			updatedData: data,
		};
	}
	
	if (input === ussdMenuCustomer.bleble.children.checkContract.input) {
		return {
			response: ussdMenuCustomer.bleble.children.checkContract.text(),
			nextStep: 'bleble_check_contract_phoneNumber_customer',
			updatedData: data,
		};
	}
	
	if (input === ussdMenuCustomer.bleble.children.partialWithdraw.input) {
		return {
			response: ussdMenuCustomer.bleble.children.partialWithdraw.text,
			nextStep: "bleble_partial_withdraw_start_customer",
			updatedData: data,
		};
	}
	
	if (input === ussdMenuCustomer.bleble.children.totalWithdraw.input) {
		return {
			response: ussdMenuCustomer.bleble.children.totalWithdraw.text(),
			nextStep: "bleble_total_withdraw_start_customer",
			updatedData: data,
		};
	}
	
	if (input === ussdMenuCustomer.bleble.children.pointList.input) {
		return approvedPoints(sessionid, input, data)
	}
	
	return {
		response: `${ussdMenuCustomer.chooseInvalide}\n${ussdMenuCustomer.bleble.text}`,
		nextStep: "bleble_menu_customer",
		updatedData: data,
	};
}