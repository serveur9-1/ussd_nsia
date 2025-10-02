import ussdMenuCustomer from "../../../../../constants/ussdMenuCustomer";
import {validationDate, validationPhoneNumber} from "../../../../../utils/validation";
import NepClientRepository from "../../../../../repositories/nepClientRepository";

const checkContract = {
	phoneNumber: async (sessionId: string, input: string, data: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: ussdMenuCustomer.bleble.children.checkContract.text(),
				nextStep: "bleble_check_contract_phoneNumber_customer",
				updatedData: data,
			};
		}
		
		const validatePhoneNumber = validationPhoneNumber(input)
		
		if (!validatePhoneNumber.isValid) {
			return {
				response: ussdMenuCustomer.bleble.children.pay.message.invalide,
				nextStep: "bleble_check_contract_phoneNumber_customer",
				updatedData: data,
			};
		}
		
		const payload = {
			...data,
			phoneNumber: validatePhoneNumber.data,
		}
		
		return {
			response: ussdMenuCustomer.bleble.children.checkContract.children.brithDate.text,
			nextStep: 'bleble_check_contract_brithDate_customer',
			updatedData: payload,
		};
	},
	brithDate: async (sessionId: string, input: string, data: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: ussdMenuCustomer.bleble.children.checkContract.children.brithDate.text,
				nextStep: "bleble_check_contract_brithDate_customer",
				updatedData: data,
			};
		}
		
		const validationDateBrith = validationDate(input)
		
		if (!validationDateBrith.isValid) {
			return {
				response: ussdMenuCustomer.bleble.children.checkContract.children.brithDate.message().invalide,
				nextStep: "bleble_check_contract_brithDate_customer",
				updatedData: data,
			};
		}
		
		const activeNepClientSubscription = await NepClientRepository.activeNepClientSubscriptionsByMsisdn(data.phoneNumber, true, validationDateBrith.data)
		
		if (!activeNepClientSubscription.status || !activeNepClientSubscription) {
			return {
				response: ussdMenuCustomer.bleble.children.checkContract.message({
					status: 'none'
				}),
				nextStep: null,
				updatedData: data,
			};
		}
		
		const subscription = activeNepClientSubscription.data
		
		if (subscription?.ETAT_SOUSCRIPTION === '00') {
			return {
				response: ussdMenuCustomer.bleble.children.checkContract.message({
					status: 'terminated'
				}),
				nextStep: null,
				updatedData: data,
			};
		}
		
		if (subscription?.ETAT_SOUSCRIPTION === '01') {
			const subscriptionId = subscription.ID_SOUSCRIPTION;
			const dateSubscription = new Date(subscription.DATE_SOUSCRIPTION);
			
			const {data: resultBalance} = await NepClientRepository.balance(subscriptionId);
			const balance = resultBalance?.balance || 0
			
			const now = new Date();
			const diffDays = Math.floor((now.getTime() - dateSubscription.getTime()) / (1000 * 60 * 60 * 24));
			const diffMonth = Math.round(diffDays / 30);
			
			const totalPaye = parseInt(String(resultBalance?.totalPay), 10);
			
			if (totalPaye >= diffMonth * 1500) {
				if (totalPaye === 0) {
					return {
						response: ussdMenuCustomer.bleble.children.checkContract.message({
							status: 'no_balance',
						}),
						nextStep: null,
						updatedData: data,
					};
				}
				
				return {
					response: ussdMenuCustomer.bleble.children.checkContract.message({
						status: 'active',
						balance: balance
					}),
					nextStep: null,
					updatedData: data,
				};
			} else {
				return {
					response: ussdMenuCustomer.bleble.children.checkContract.message({
						status: 'inactive',
					}),
					nextStep: null,
					updatedData: data,
				};
			}
		}
		
		return {
			response: ussdMenuCustomer.bleble.children.checkContract.message({
				status: 'none',
			}),
			nextStep: null,
			updatedData: data,
		};
	}
}

export default checkContract
