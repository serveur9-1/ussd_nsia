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

/**
 * Message d'information sur les bonus de paiement BlèBlè
 * affiché lorsque le client choisit une formule 1 / 2 / 3.
 */
const getBleblePaymentBonusMessage = (plan: Plan): string | null => {
	if (!plan.amount) {
		return null;
	}
	
	switch (plan.amount) {
		case 1500:
			return "Bonus paiement: Avec l'option 1, vous bénéficiez des avantages de fidélité BlèBlè.";
		case 5000:
			return "Bonus paiement: Avec l'option 2 (5 000 Fcfa), vous bénéficiez d'un bonus supérieur sur vos versements.";
		case 10000:
			return "Bonus paiement: Avec l'option 3 (10 000 Fcfa), vous bénéficiez du bonus maximum sur vos versements.";
		default:
			return null;
	}
}

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
			
			const bonusMessage = getBleblePaymentBonusMessage(plan);
			const confirmText = confirm.text(plan);
			const responseText = bonusMessage ? `${bonusMessage}\n${confirmText}` : confirmText;
			
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
						response: responseText,
						nextStep: 'bleble_pay_confirm_payment_details_customer',
						updatedData: payload,
					};
				}
				
				return {
					response: plan?.amount ? responseText : ussdMenuCustomer.bleble.children.pay.children.custom_amount.text,
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
		
		// Logic to add: Calculate fees (5%) and total
		const fee = Math.round((amount * 5) / 100);
		const total = amount + fee;

		/* previoisly replaced
		const plan = {
			...data.plan,
			amount,
			fee: {
				...data.plan.fee,
				value: utilitiesMaths.calculateFee(amount, data.plan.fee.value)
			}
		}*/
		
		const plan = {
			...data.plan,
			amount,
			fee: {
				...data.plan.fee,
				value: fee // Injecting the 5% fee here
			}
		}
	

		const payload = {
			...data,
			plan
		}
		
		const responseMessage = `Votre demande de paiement libre de ${amount.toLocaleString()} FCFA, frais 5% (du montant payé) Total: ${total.toLocaleString()} FCFA est en cours de traitement, Vous recevrez un message pour effectuer le paiement des frais`;

		/* previously replaced
		return {
			response: confirm.text(plan),
			nextStep: 'bleble_pay_confirm_payment_details_customer',
			updatedData: payload,
		};*/

		return {
			response: responseMessage,
			nextStep: 'bleble_pay_confirm_payment_details_customer', // SET TO NULL IF THIS IS THE END OF THE USSD FLOW
			updatedData: payload,
		};
	

	}
}

export default blebleCustomerPay