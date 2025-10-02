import ussdMenuCustomer, {thank} from "../../../../../constants/ussdMenuCustomer";
import {validationPhoneNumber} from "../../../../../utils/validation";
import {customerPlansIfoh} from "../../../../../constants/plans";
import {Plan, Plans} from "../../../../../types/plan";
import {formatDate, formatPhoneNumber, generateReference, getCurrentDate} from "../../../../../utils/format";
import NafClientRepository from "../../../../../repositories/nafClientRepository";
import {NafClient} from "../../../../../types/models/napClient";
import utilitiesDate from "../../../../../utils/date";
import momoPay, {customerPayIfohPlan} from "../../../../payments/momoPay";
import NafPaiementRepository from "../../../../../repositories/nafPaiementRepository";

const ifohPay = ussdMenuCustomer.ifoh.children.pay()
const plans = ifohPay.data.plans

const ifohPayMenu = {
	main: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: ifohPay.text,
				nextStep: "ifoh_pay_main_customer",
				updatedData: data,
			};
		}
		
		const phoneNumberValidated = validationPhoneNumber(input)
		
		if (!phoneNumberValidated.isValid) {
			return {
				response: ifohPay.message.invalide,
				nextStep: "ifoh_pay_main_customer",
				updatedData: data,
			};
		}
		
		const updatedData = {
			...data,
			phoneNumber: phoneNumberValidated.data
		}
		
		return {
			response: ifohPay.children.plan.text(customerPlansIfoh as Plans),
			nextStep: "ifoh_pay_choosePlan_customer",
			updatedData,
		};
	},
	choosePlan: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: ifohPay.children.plan.text(customerPlansIfoh as Plans),
				nextStep: "ifoh_pay_choosePlan_customer",
				updatedData: data,
			};
		}
		
		const plan = plans[input as keyof typeof plans]
		
		if (!plan) {
			return {
				response: `${ussdMenuCustomer.chooseInvalide}${ifohPay.children.plan.text(customerPlansIfoh as Plans)}`,
				nextStep: "ifoh_pay_choosePlan_customer",
				updatedData: data,
			};
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
			const updatedData = {...data, plan, subscription}
			
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
					nextStep: 'ifoh_pay_confirm_customer',
					updatedData,
				};
			}
		}
		
		return {
			response: `${ussdMenuCustomer.chooseInvalide}${ifohPay.children.plan.text(customerPlansIfoh as Plans)}`,
			nextStep: "ifoh_pay_choosePlan_customer",
			updatedData: data,
		};
	},
	confirm: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
		const plan: Plan = data.plan;
		
		if (input === "__REPEAT__") {
			return {
				response: ifohPay.children.plan.children.confirm.text(plan),
				nextStep: "ifoh_pay_confirm_customer",
				updatedData: data,
			};
		}
		
		if (input !== ifohPay.children.plan.children.confirm.input) {
			return {
				response: ifohPay.children.plan.children.confirm.message.invalide(plan),
				nextStep: "ifoh_pay_confirm_customer",
				updatedData: data,
			};
		}
		
		const subscription: NafClient = data.subscription
		const nextPayment = subscription.PROCHAIN_PAIEMENT
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const msisdn = formatPhoneNumber(req.msisdn)
		const reference = generateReference('NAF', plan.action, msisdn)
		
		if (utilitiesDate.daysBetween(today, nextPayment) > 0) {
			return {
				response: ifohPay.children.plan.children.confirm.message.notArrive(formatDate(nextPayment, 'DD-MM-YYYY')),
				nextStep: null,
				updatedData: data,
			};
		}
		
		return customerPayIfohPlan({
			plan,
			phoneNumber: msisdn,
			payload: data,
			subscription
		})
	}
}

export default ifohPayMenu