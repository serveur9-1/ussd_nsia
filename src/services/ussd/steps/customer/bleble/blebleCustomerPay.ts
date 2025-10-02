import ussdMenuCustomer, {thank} from "../../../../../constants/ussdMenuCustomer";
import {validationPhoneNumber} from "../../../../../utils/validation";
import NepClientRepository from "../../../../../repositories/nepClientRepository";
import {customerPayBleblePlan} from "../../../../payments/momoPay";
import {formatPhoneNumber} from "../../../../../utils/format";
import utilitiesMaths from "../../../../../utils/maths";
import {Plan, TypeFrequencyPlan} from "../../../../../types/plan";
import {NepSouscription} from "../../../../../types/models/nepSouscription";
import {merchantPlansBleble} from "../../../../../constants/plans";

const plans = ussdMenuCustomer.bleble.children.pay.data.plans
const confirm = ussdMenuCustomer.bleble.children.pay.children.plan.children.confirm

const blebleCustomerPay = {
	enterPhoneNumber: async (sessionId: string, input: string, data: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: ussdMenuCustomer.bleble.children.pay.text,
				nextStep: "bleble_pay_phone_customer",
				updatedData: data,
			};
		}
		
		const validatePhoneNumber = validationPhoneNumber(input)
		
		if (!validatePhoneNumber.isValid) {
			return {
				response: ussdMenuCustomer.bleble.children.pay.message.invalide,
				nextStep: "bleble_pay_phone_customer",
				updatedData: data,
			};
		}
		
		return {
			response: ussdMenuCustomer.bleble.children.pay.children.plan.text(plans),
			nextStep: "bleble_pay_plan_customer",
			updatedData: {...data, phoneNumber: validatePhoneNumber.data},
		};
	},
	choosePlan: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: ussdMenuCustomer.bleble.children.pay.children.plan.text(plans),
				nextStep: "bleble_pay_plan_customer",
				updatedData: data,
			};
		}
		
		const plan = plans[input as keyof typeof plans]
		
		if (!plan) {
			return {
				response: `${ussdMenuCustomer.chooseInvalide}${ussdMenuCustomer.bleble.children.pay.children.plan.text(plans)}`,
				nextStep: "bleble_pay_plan_customer",
				updatedData: data,
			};
		}
		
		const phoneNumber = data.phoneNumber
		const resultActiveSouscription = await NepClientRepository.activeNepClientSubscriptionsByMsisdn(phoneNumber, true);
		
		if (!resultActiveSouscription.status) {
			return {
				response: ussdMenuCustomer.bleble.children.pay.children.plan.messages.unsubscribe('BlèBlè'),
				nextStep: null,
				updatedData: data
			}
		}
		
		const subscription = resultActiveSouscription.data
		
		if (subscription && plan) {
			const payload = {...data, plan, subscription}
			
			if (subscription.ETAT_SOUSCRIPTION === '00') {
				return {
					response: `${ussdMenuCustomer.bleble.children.pay.children.plan.messages.alreadySubscribe}\nInfos: 22419800, ${thank}`,
					nextStep: null,
					updatedData: data,
				};
			}
			
			if (subscription.ETAT_SOUSCRIPTION === '01') {
				if (plan?.amount && !plan?.autoDebit.enabled) {
					return {
						response: confirm.text(plan),
						nextStep: 'bleble_pay_confirm_payment_details_customer',
						updatedData: payload,
					};
				}
				
				return {
					response: plan?.amount ? confirm.text(plan) : ussdMenuCustomer.bleble.children.pay.children.custom_amount.text,
					nextStep: plan?.amount ? 'bleble_pay_confirm_payment_details_customer' : 'bleble_pay_custom_amount_customer',
					updatedData: payload,
				};
			}
		}
		
		return {
			response: ussdMenuCustomer.bleble.children.pay.children.plan.messages.unsubscribe('BlèBlè'),
			nextStep: null,
			updatedData: data,
		};
	},
	confirmPaymentDetails: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: confirm.text(data.plan),
				nextStep: "bleble_pay_confirm_payment_details_customer",
				updatedData: data,
			};
		}
		
		if (input === confirm.input) {
			const plan: Plan = {
				...data.plan,
				autoDebit: {
					enabled: false
				}
			}
			
			const subscription: NepSouscription = data.subscription
			
			const payload = {
				plan: plan,
				payload: data,
				subscription: subscription,
				phoneNumber: formatPhoneNumber(req.msisdn)
			}
			
			return await customerPayBleblePlan(payload)
		}
		
		return {
			response: confirm.message.invalide(data.plan),
			nextStep: "bleble_pay_confirm_payment_details_customer",
			updatedData: data,
		};
	},
	customAmountPay: async (sessionid: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
		if (input === "__REPEAT__") {
			data.plan = merchantPlansBleble['4']
			
			return {
				response: ussdMenuCustomer.bleble.children.pay.children.custom_amount.text,
				nextStep: "bleble_pay_custom_amount_customer",
				updatedData: data,
			};
		}
		
		let amount = parseInt(input.trim(), 10);
		
		if (isNaN(amount) || amount < 100) {
			return {
				response: ussdMenuCustomer.bleble.children.pay.children.custom_amount.message.invalide,
				nextStep: "bleble_pay_custom_amount_customer",
				updatedData: data,
			};
		}
		
		const plan = {
			...data.plan,
			amount,
			fee: {
				...data.plan.fee,
				value: utilitiesMaths.calculateFee(amount, data.plan.fee.value)
			}
		}
		
		const payload = {
			...data,
			plan
		}
		
		return {
			response: confirm.text(plan),
			nextStep: 'bleble_pay_confirm_payment_details_customer',
			updatedData: payload,
		};
	}
}

export default blebleCustomerPay