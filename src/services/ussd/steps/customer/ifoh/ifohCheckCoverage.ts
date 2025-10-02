import {brithDateWithDraw, phoneNumberWithDraw} from "../bleble/bleblePartialWithdraw";
import ussdMenuCustomer from "../../../../../constants/ussdMenuCustomer";
import {validationDate} from "../../../../../utils/validation";
import NafClientRepository from "../../../../../repositories/nafClientRepository";
import utilitiesDate from "../../../../../utils/date";
import {formatDate} from "../../../../../utils/format";

const ifohCheckCoverageMenu = {
	main: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => phoneNumberWithDraw({
		input,
		data,
		current: 'ifoh_checkCoverage_main_customer',
		nextStep: 'ifoh_checkCoverage_brithDate_customer',
		sessionId
	}),
	brithDate: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: ussdMenuCustomer.bleble.children.checkContract.children.brithDate.text,
				nextStep: 'ifoh_checkCoverage_brithDate_customer',
				updatedData: data,
			};
		}
		
		const validationDateBrith = validationDate(input)
		
		if (!validationDateBrith.isValid) {
			return {
				response: ussdMenuCustomer.bleble.children.partialWithdraw.children.brithDate().message().invalide,
				nextStep: 'ifoh_checkCoverage_brithDate_customer',
				updatedData: data,
			};
		}
		
		const resultNafClientInfos = await NafClientRepository.informations(data.phoneNumber, validationDateBrith.data)
		
		if (!resultNafClientInfos.status || !resultNafClientInfos.data) {
			return {
				response: ussdMenuCustomer.bleble.children.checkContract.message({
					status: 'none',
					product: 'IFOH'
				}),
				nextStep: null,
				updatedData: data,
			};
		}
		
		const subscription = resultNafClientInfos.data
		
		if (subscription?.ETAT_SOUSCRIPTION === '00') {
			return {
				response: ussdMenuCustomer.bleble.children.checkContract.message({
					status: 'terminated',
					product: 'IFOH'
				}),
				nextStep: null,
				updatedData: data,
			};
		}
		
		if (subscription.ETAT_SOUSCRIPTION === '01') {
			const nextPayment = subscription.PROCHAIN_PAIEMENT
			const now = new Date();
			const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
			
			if (utilitiesDate.daysBetween(today, nextPayment) > 0) {
				return {
					response: ussdMenuCustomer.bleble.children.checkContract.message({
						status: 'active',
						product: 'IFOH',
						date: formatDate(subscription.PROCHAIN_PAIEMENT, 'DD-MM-YYYY')
					}),
					nextStep: null,
					updatedData: data,
				};
			} else {
				return {
					response: ussdMenuCustomer.bleble.children.checkContract.message({
						status: 'inactive',
						product: 'IFOH',
						date: formatDate(subscription.PROCHAIN_PAIEMENT, 'DD-MM-YYYY')
					}),
					nextStep: null,
					updatedData: data,
				};
			}
		}
		
		return {
			response: ussdMenuCustomer.globalError,
			nextStep: null,
			updatedData: data,
		};
	},
}

export default ifohCheckCoverageMenu