import ussdMenuMerchant, {thank} from "../../../../../constants/ussdMenuMerchant";
import {validationPhoneNumber} from "../../../../../utils/validation";
import {Plan, Plans} from "../../../../../types/plan";
import {formatDate, formatPhoneNumber, generateReference, getCurrentDate} from "../../../../../utils/format";
import NafClientRepository from "../../../../../repositories/nafClientRepository";
import {NafClient} from "../../../../../types/models/napClient";
import utilitiesDate from "../../../../../utils/date";
import momoPay, {merchantPayIfohPlan} from "../../../../payments/momoPay";
import NafPaiementRepository from "../../../../../repositories/nafPaiementRepository";
import {merchantPlansIfoh} from "../../../../../constants/plans";
import {checkingMerchant} from "../ussdRoutesMerchant";
import {Merchant} from "../../../../../types/models/merchant";
import MerchantTransactionRepository from "../../../../../repositories/MerchantTransactionRepository";

const ifohPay = ussdMenuMerchant.ifoh.children.pay()
const plans = ifohPay.data.plans

const ifohPayMenu = {
	main: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: ifohPay.text,
				nextStep: "ifoh_pay_main_merchant",
				updatedData: data,
			};
		}
		
		const phoneNumberValidated = validationPhoneNumber(input)
		
		if (!phoneNumberValidated.isValid) {
			return {
				response: ifohPay.message.invalide,
				nextStep: "ifoh_pay_main_merchant",
				updatedData: data,
			};
		}
		
		const updatedData = {
			...data,
			phoneNumber: phoneNumberValidated.data
		}
		
		return {
			response: ifohPay.children.plan.text(merchantPlansIfoh as Plans),
			nextStep: "ifoh_pay_choosePlan_merchant",
			updatedData,
		};
	},
	choosePlan: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: ifohPay.children.plan.text(merchantPlansIfoh as Plans),
				nextStep: "ifoh_pay_choosePlan_merchant",
				updatedData: data,
			};
		}
		
		const plan = plans[input as keyof typeof plans]
		
		if (!plan) {
			return {
				response: `${ussdMenuMerchant.chooseInvalide}${ifohPay.children.plan.text(merchantPlansIfoh as Plans)}`,
				nextStep: "ifoh_pay_choosePlan_merchant",
				updatedData: data,
			};
		}
		
		const {status, responseNotMerchant, merchant} = await checkingMerchant(req.msisdn, data)
		
		if (!status || !merchant) {
			return responseNotMerchant;
		}
		
		const phoneNumber = data.phoneNumber
		const nafClientInformations = await NafClientRepository.informations(phoneNumber);
		
		if (!nafClientInformations.status || !nafClientInformations.data) {
			return {
				response: ifohPay.children.plan.messages.unsubscribe('IFOH'),
				nextStep: null,
				updatedData: data
			}
		}
		
		const subscription = nafClientInformations.data
		
		if (subscription && plan) {
			const updatedData = {...data, plan, subscription, merchant}
			
			if (subscription.ETAT_SOUSCRIPTION === '00') {
				return {
					response: `${ifohPay.children.plan.messages.alreadySubscribe}\nInfos: 22419800, ${thank}`,
					nextStep: null,
					updatedData: data,
				};
			}
			
			if (subscription.ETAT_SOUSCRIPTION === '01') {
				return {
					response: ifohPay.children.plan.children.confirm.text(plan),
					nextStep: 'ifoh_pay_confirm_merchant',
					updatedData,
				};
			}
		}
		
		return {
			response: ussdMenuMerchant.globalError,
			nextStep: null,
			updatedData: data,
		};
	},
	confirm: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
		const plan: Plan = data.plan;
		
		if (input === "__REPEAT__") {
			return {
				response: ifohPay.children.plan.children.confirm.text(plan),
				nextStep: "ifoh_pay_confirm_merchant",
				updatedData: data,
			};
		}
		
		if (input !== ifohPay.children.plan.children.confirm.input) {
			return {
				response: ifohPay.children.plan.children.confirm.message.invalide(plan),
				nextStep: 'ifoh_pay_confirm_merchant',
				updatedData: data,
			};
		}
		
		const phoneNumber = data.phoneNumber
		const merchant: Merchant = data.merchant
		const subscription: NafClient = data.subscription
		const nextPayment = subscription.PROCHAIN_PAIEMENT
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const msisdn = formatPhoneNumber(req.msisdn)
		const reference = generateReference('NAF', plan.action, formatPhoneNumber(merchant.phoneNo))
		
		if (utilitiesDate.daysBetween(today, nextPayment) > 0) {
			return {
				response: ifohPay.children.plan.children.confirm.message.notArrive(formatDate(nextPayment, 'DD-MM-YYYY')),
				nextStep: null,
				updatedData: data,
			};
		}
		
		return merchantPayIfohPlan({
			payload: data,
			subscription,
			merchant,
			phoneNumber,
			plan
		})
	}
}

export default ifohPayMenu