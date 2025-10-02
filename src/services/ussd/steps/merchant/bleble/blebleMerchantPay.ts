import {validationPhoneNumber} from "../../../../../utils/validation";
import NepClientRepository from "../../../../../repositories/nepClientRepository";
import {formatPhoneNumber} from "../../../../../utils/format";
import {merchantPayBleblePlan} from "../../../../payments/momoPay";
import ussdMenuMerchant, {thank} from "../../../../../constants/ussdMenuMerchant";
import {checkingMerchant} from "../ussdRoutesMerchant";
import utilitiesMaths from "../../../../../utils/maths";
import {merchantPlansBleble} from "../../../../../constants/plans";

const plans = ussdMenuMerchant.bleble.children.pay.data.plans
const confirm = ussdMenuMerchant.bleble.children.pay.children.plan.children.confirm
const customAmount = ussdMenuMerchant.bleble.children.pay.children.custom_amount

const blebleMerchantPay = {
	enterPhoneNumber: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: ussdMenuMerchant.bleble.children.pay.text,
				nextStep: "bleble_pay_phone_merchant",
				updatedData: data,
			};
		}
		
		const validatePhoneNumber = validationPhoneNumber(input)
		
		if (!validatePhoneNumber.isValid) {
			return {
				response: ussdMenuMerchant.bleble.children.pay.message.invalide,
				nextStep: "bleble_pay_phone_merchant",
				updatedData: data,
			};
		}
		
		return {
			response: ussdMenuMerchant.bleble.children.pay.children.plan.text(plans),
			nextStep: "bleble_pay_plan_merchant",
			updatedData: {...data, phoneNumber: validatePhoneNumber.data},
		};
	},
	choosePlan: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: ussdMenuMerchant.bleble.children.pay.children.plan.text(plans),
				nextStep: "bleble_pay_plan_merchant",
				updatedData: data,
			};
		}
		
		const plan = plans[input as keyof typeof plans]
		
		if (!plan) {
			return {
				response: `${ussdMenuMerchant.chooseInvalide}${ussdMenuMerchant.bleble.children.pay.children.plan.text(plans)}`,
				nextStep: "bleble_pay_plan_merchant",
				updatedData: data,
			};
		}
		
		const {status, responseNotMerchant, merchant} = await checkingMerchant(req.msisdn, data)
		
		if (!status || !merchant) {
			return responseNotMerchant;
		}
		
		const phoneNumber = data.phoneNumber
		const resultActiveSouscription = await NepClientRepository.activeNepClientSubscriptionsByMsisdn(phoneNumber, true);
		
		if (!resultActiveSouscription.status) {
			return {
				response: ussdMenuMerchant.bleble.children.pay.children.plan.messages.unsubscribe('BlèBlè'),
				nextStep: null,
				updatedData: data
			}
		}
		
		const subscription = resultActiveSouscription.data
		
		if (subscription && plan) {
			const payload = {...data, plan, subscription, merchant}
			
			if (subscription.ETAT_SOUSCRIPTION === '00') {
				return {
					response: `${ussdMenuMerchant.bleble.children.pay.children.plan.messages.alreadySubscribe}\nInfos: 22419800, ${thank}`,
					nextStep: null,
					updatedData: data,
				};
			}
			
			if (subscription.ETAT_SOUSCRIPTION === '01') {
				if (plan?.amount && !plan?.autoDebit) {
					return {
						response: confirm.text(data.plan),
						nextStep: "bleble_pay_confirm_paymentDetails_merchant",
						updatedData: data,
					};
				}
				
				return {
					response: plan?.amount ? ussdMenuMerchant.bleble.children.pay.children.plan.children.confirm.text(plan) : customAmount.text,
					nextStep: plan?.amount ? 'bleble_pay_confirm_paymentDetails_merchant' : 'bleble_pay_customAmount_merchant',
					updatedData: payload,
				};
			}
		}
		
		return {
			response: ussdMenuMerchant.bleble.children.pay.children.plan.messages.unsubscribe('BlèBlè'),
			nextStep: null,
			updatedData: data,
		};
	},
	confirmPaymentDetails: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: confirm.text(data.plan),
				nextStep: "bleble_pay_confirm_paymentDetails_merchant",
				updatedData: data,
			};
		}
		
		if (input === confirm.input) {
			const plan = {
				...data.plan,
				autoDebit: false
			}
			
			const payload = {
				plan: plan,
				payload: data,
				subscription: data.subscription,
				phoneNumber: formatPhoneNumber(data.phoneNumber),
				merchant: data.merchant
			}
			
			return await merchantPayBleblePlan(payload)
		}
		
		return {
			response: confirm.message.invalide(data.plan),
			nextStep: "bleble_pay_confirm_paymentDetails_merchant",
			updatedData: data,
		};
	},
	customAmountPay: async (sessionid: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
		let amount = 0
		
		if (input === "__REPEAT__") {
			data.plan = merchantPlansBleble['4']
			
			return {
				response: customAmount.text,
				nextStep: "bleble_pay_customAmount_merchant",
				updatedData: data,
			};
		}
		
		amount = parseInt(input.trim(), 10);
		
		if (isNaN(amount) || amount < customAmount.minAmount) {
			return {
				response: customAmount.message.invalide(),
				nextStep: "bleble_pay_customAmount_merchant",
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
			response: ussdMenuMerchant.bleble.children.pay.children.plan.children.confirm.text(plan),
			nextStep: 'bleble_pay_confirm_paymentDetails_merchant',
			updatedData: payload,
		};
	}
}

export default blebleMerchantPay