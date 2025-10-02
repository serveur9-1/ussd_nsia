import ussdMenuCustomer from "../../../../../constants/ussdMenuCustomer";
import {phoneNumberWithDraw} from "../bleble/bleblePartialWithdraw";
import {validationDate} from "../../../../../utils/validation";
import NafClientRepository from "../../../../../repositories/nafClientRepository";
import NafSouscriptionRepository from "../../../../../repositories/nafSouscriptionRepository";
import NafResiliationRepository from "../../../../../repositories/nafResiliationRepository";
import {formatPhoneNumber} from "../../../../../utils/format";

const cancelContact = ussdMenuCustomer.ifoh.children.cancelContract

const ifohCancelContractMenu = {
	agree: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: cancelContact.children.agree.text,
				nextStep: "ifoh_cancelContract_agree_customer",
				updatedData: data,
			};
		}
		
		if (input !== cancelContact.children.agree.input) {
			return {
				response: cancelContact.children.agree.messages.invalide(),
				nextStep: "ifoh_cancelContract_agree_customer",
				updatedData: data,
			};
		}
		
		return {
			response: cancelContact.children.phoneNumber.text(),
			nextStep: "ifoh_cancelContract_phoneNumber_customer",
			updatedData: data,
		};
	},
	phoneNumber: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => phoneNumberWithDraw({
		input,
		data,
		current: 'ifoh_cancelContract_phoneNumber_customer',
		sessionId,
		nextStep: 'ifoh_cancelContract_brithDate_customer'
	}),
	brithDate: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: cancelContact.children.brithDate().text,
				nextStep: "ifoh_cancelContract_agree_customer",
				updatedData: data,
			};
		}
		
		const brithDateValidated = validationDate(input)
		
		if (!brithDateValidated.isValid) {
			return {
				response: cancelContact.children.brithDate().message().invalide,
				nextStep: "ifoh_cancelContract_agree_customer",
				updatedData: data,
			};
		}
		
		const resultNafClientInformations = await NafClientRepository.informations(data.phoneNumber, brithDateValidated.data)
		
		if (!resultNafClientInformations.status || !resultNafClientInformations.data) {
			return {
				response: cancelContact.messages.validation({
					status: 'none',
					product: 'IFOH'
				}),
				nextStep: null,
				updatedData: data,
			};
		}
		
		const subscription = resultNafClientInformations.data
		
		const resultUpdateSubscription = await NafSouscriptionRepository.update('00', {
			idSouscription: subscription?.ID_SOUSCRIPTION
		})
		
		const resultInsertNafResiliation = await NafResiliationRepository.insert({
			msisdn: formatPhoneNumber(req.msisdn),
			id_souscription: subscription?.ID_SOUSCRIPTION.toString()
		})
		
		if (resultUpdateSubscription.status && resultInsertNafResiliation.status) {
			return {
				response: cancelContact.messages.validation({
					status: 'cancel',
					product: 'IFOH'
				}),
				nextStep: null,
				updatedData: data,
			};
		}
		
		return {
			response: ussdMenuCustomer.globalError,
			nextStep: null,
			updatedData: data,
		};
	}
}

export default ifohCancelContractMenu