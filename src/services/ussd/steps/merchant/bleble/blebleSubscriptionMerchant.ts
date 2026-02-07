import ussdMenuMerchant, {thank} from "../../../../../constants/ussdMenuMerchant";
import {validationDate, validationName, validationPhoneNumber} from "../../../../../utils/validation";
import {
	formatDate,
	formatPhoneNumber,
	generateReference,
	getAge,
	getCurrentDate,
	splitFullName
} from "../../../../../utils/format";
import NepClientRepository from "../../../../../repositories/nepClientRepository";
import momoPay from "../../../../payments/momoPay";
import NepBeneficiairesRepository from "../../../../../repositories/nepBeneficiaireRepository";
import NepSouscriptionsRepository from "../../../../../repositories/nepSouscriptionRepository";
import MerchantRepository from "../../../../../repositories/merchantRepository";
import {checkingMerchant} from "../ussdRoutesMerchant";
import ussdMenuCustomer from "../../../../../constants/ussdMenuCustomer";
import {Plan, TypeFrequencyPlan} from "../../../../../types/plan";
import {TypeProductCommission} from "../../../../../types/models/commission";
import utilitiesDate from "../../../../../utils/date";
import {AutoDebitStatus} from "../../../../../types/models/autoDebitSchedule";
import AutoDebitScheduleRepository from "../../../../../repositories/autoDebitScheduleRepository";

// For subscription: only 3 options - Par mois (opt. 1) 2500, (opt. 2) 5000, (opt. 3) 10000. No Paiement libre.
const allPlansMerchant = ussdMenuMerchant.bleble.children.pay.data.plans;
const plans = {
	"1": allPlansMerchant["2"], // Par mois (opt. 1): 2,500 Fcfa
	"2": allPlansMerchant["3"], // Par mois (opt. 2): 5,000 Fcfa
	"3": allPlansMerchant["4"], // Par mois (opt. 3): 10,000 Fcfa
};
const confirm = ussdMenuMerchant.bleble.children.pay.children.plan.children.confirm

const blebleSubscriptionMerchant = {
	blebleSubscriptionStart: async (sessionId: string, input: string, data: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: ussdMenuMerchant.bleble.children.subscription.text,
				nextStep: "bleble_subscription_start_merchant",
				updatedData: data,
			};
		}
		
		if (input === ussdMenuMerchant.bleble.children.subscription.input) {
			return {
				response: ussdMenuMerchant.bleble.children.subscription.children.phoneNumber.text,
				nextStep: "bleble_subscription_phoneNumber_merchant",
				updatedData: data,
			};
		}
		
		return {
			response: `${ussdMenuMerchant.chooseInvalide}${ussdMenuMerchant.bleble.children.subscription.text}`,
			nextStep: "bleble_subscription_start_merchant",
			updatedData: data,
		};
	},
	blebleSubscriptionPhoneNumber: async (sessionId: string, input: string, data: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: ussdMenuMerchant.bleble.children.subscription.children.phoneNumber.text,
				nextStep: "bleble_subscription_phoneNumber_merchant",
				updatedData: data,
			};
		}
		
		const phoneNumberValidated = validationPhoneNumber(input)
		
		if (!phoneNumberValidated.isValid) {
			return {
				response: ussdMenuMerchant.bleble.children.subscription.children.phoneNumber.message.invalide(),
				nextStep: "bleble_subscription_phoneNumber_merchant",
				updatedData: data,
			};
		}
		
		const updatedData = {
			...data,
			phoneNumber: phoneNumberValidated.data
		}
		
		return {
			response: ussdMenuMerchant.bleble.children.subscription.children.fullName.text,
			nextStep: "bleble_subscription_fullName_merchant",
			updatedData,
		};
	},
	blebleFullName: async (sessionId: string, input: string, data: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: ussdMenuMerchant.bleble.children.subscription.children.fullName.text,
				nextStep: "bleble_subscription_fullName_merchant",
				updatedData: data,
			};
		}
		
		const validation = validationName(input)
		
		if (!validation.isValid) {
			return {
				response: ussdMenuMerchant.bleble.children.subscription.children.fullName.message.invalide,
				nextStep: "bleble_subscription_fullName_merchant",
				updatedData: data,
			};
		}
		
		return {
			response: ussdMenuMerchant.bleble.children.subscription.children.brithDate.text,
			nextStep: "bleble_subscription_birthDate_merchant",
			updatedData: {...data, fullName: validation.data},
		};
	},
	blebleBirthDate: async (sessionId: string, input: string, data: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: ussdMenuMerchant.bleble.children.subscription.children.brithDate.text,
				nextStep: "bleble_subscription_birthDate_merchant",
				updatedData: data,
			};
		}
		
		const validation = validationDate(input)
		
		if (!validation.isValid) {
			return {
				response: ussdMenuMerchant.bleble.children.subscription.children.brithDate.message.invalide,
				nextStep: "bleble_subscription_birthDate_merchant",
				updatedData: data,
			};
		}
		
		const age = getAge(validation.data)
		const isAdulte = age >= 18
		
		if (!isAdulte) {
			return {
				response: ussdMenuMerchant.bleble.children.subscription.children.brithDate.message.notRequired,
				nextStep: null,
				updatedData: data,
			};
		}
		
		return {
			response: ussdMenuMerchant.bleble.children.subscription.children.beneficiary.name.text,
			nextStep: "bleble_subscription_beneficiaryName_merchant",
			updatedData: {...data, birthDate: validation.data},
		};
	},
	blebleBeneficiaryName: async (sessionId: string, input: string, data: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: ussdMenuMerchant.bleble.children.subscription.children.beneficiary.name.text,
				nextStep: "bleble_subscription_beneficiaryName_merchant",
				updatedData: data,
			};
		}
		
		const validation = validationName(input)
		
		if (!validation.isValid) {
			return {
				response: ussdMenuMerchant.bleble.children.subscription.children.beneficiary.name.message.invalide,
				nextStep: "bleble_subscription_beneficiaryName_merchant",
				updatedData: data,
			};
		}
		
		const payload = {...data, beneficiaryName: validation.data}
		
		return {
			response: ussdMenuMerchant.bleble.children.subscription.children.beneficiary.phoneNumber.text,
			nextStep: "bleble_subscription_bleble_beneficiaryPhoneNumber_merchant",
			updatedData: payload,
		};
	},
	blebleBeneficiaryPhone: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: ussdMenuMerchant.bleble.children.subscription.children.beneficiary.phoneNumber.text,
				nextStep: "bleble_subscription_bleble_beneficiaryPhoneNumber_merchant",
				updatedData: data,
			};
		}
		
		const validationBeneficiaryPhoneNumber = validationPhoneNumber(input)
		
		if (!validationBeneficiaryPhoneNumber.isValid) {
			return {
				response: ussdMenuMerchant.bleble.children.subscription.children.beneficiary.phoneNumber.message.invalide,
				nextStep: "bleble_subscription_bleble_beneficiaryPhoneNumber_merchant",
				updatedData: data,
			};
		}
		
		const updatedData = {
			...data,
			beneficiaryPhone: validationBeneficiaryPhoneNumber.data,
		}
		
		return {
			response: ussdMenuMerchant.bleble.children.pay.children.plan.text(plans),
			nextStep: "bleble_subscription_bleble_choosePlan_merchant",
			updatedData,
		};
	},
	blebleChoosePlan: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: ussdMenuCustomer.bleble.children.pay.children.plan.text(plans),
				nextStep: "bleble_subscription_bleble_choosePlan_merchant",
				updatedData: data,
			};
		}
		
		const plan = plans[input as keyof typeof plans]
		
		if (!plan) {
			return {
				response: `${ussdMenuCustomer.chooseInvalide}${ussdMenuCustomer.bleble.children.pay.children.plan.text(plans)}`,
				nextStep: "bleble_subscription_bleble_choosePlan_merchant",
				updatedData: data,
			};
		}
		
		const updatedData = {...data, plan}
		
		return {
			response: confirm.text(plan),
			nextStep: 'bleble_subscription_bleble_confirmPlan_merchant',
			updatedData,
		};
	},
	confirmPlan: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
		let plan: Plan = data.plan
		
		if (input === "__REPEAT__") {
			return {
				response: confirm.text(plan),
				nextStep: 'bleble_subscription_bleble_confirmPlan_merchant',
				updatedData: data,
			};
		}
		
		if (input === confirm.input) {
			const {status, phoneNumber: merchantPhoneNumber, responseNotMerchant} = await checkingMerchant(req.msisdn, data)
			
			if (!status) {
				return responseNotMerchant;
			}
			
			const activeSouscription = await NepClientRepository.activeNepClientSubscriptionsByMsisdn(data.phoneNumber, true);
			
			if (activeSouscription.status) {
				const subscription = activeSouscription?.data
				
				if (subscription) {
					return {
						response: ussdMenuMerchant.bleble.children.subscription.children.beneficiary.phoneNumber.message.exist(subscription.ETAT_SOUSCRIPTION),
						nextStep: null,
						updatedData: data,
					};
				}
			}
			
			const amount = ussdMenuMerchant.bleble.amount
			const reference = generateReference("NEP", "SOUS_DIS", merchantPhoneNumber);
			
			const responsePayment = await momoPay({
				reference,
				msisdn: data.phoneNumber,
				amount,
				message: "Votre souscription à BlèBlè est prise en compte."
			})
			
			if (!responsePayment.success) {
				return {
					response: `${responsePayment.message}\n${thank}`,
					nextStep: null,
					updatedData: data,
				};
			}
			
			const {lastName, firstName} = splitFullName(data.fullName)
			
			const resultNepClient = await NepClientRepository.insert({
				MSISDN: data.phoneNumber,
				GENDER: "GENDER",
				BIRTH_DATE: data.birthDate,
				LAST_NAME: lastName,
				FIRST_NAME: firstName,
				TITLE: formatDate(getCurrentDate(), 'DD/MM/YYYY'),
			})
			
			const resultBeneficiaire = await NepBeneficiairesRepository.insert({
				NOM_BENEFICIAIRE: data.beneficiaryName,
				TELEPHONE_BENEFICIAIRE: data.beneficiaryPhone,
				TYPE_BENEFICIAIRE: ""
			})
			
			if (resultNepClient.status && resultBeneficiaire.status) {
				if (resultNepClient.data && resultBeneficiaire.data) {
					const now = new Date();
					const prochainPaiement = new Date(now);
					prochainPaiement.setDate(prochainPaiement.getDate() + 365);
					
					const resultNepSubscription = await NepSouscriptionsRepository.insert({
						ID_CLIENT: resultNepClient.data.ID_CLIENT,
						ID_BENEFICIAIRE: resultBeneficiaire.data.ID_BENEFICIAIRE,
						MONTANT_SOUSCRIPTION: amount,
						ETAT_SOUSCRIPTION: responsePayment.code,
						REFERENCE_SOUSCRIPTION: reference,
						PROCHAIN_PAIEMENT: prochainPaiement,
						DATE_SOUSCRIPTION: now,
						MSISDN: merchantPhoneNumber
					})
					
					if (resultNepSubscription.status) {
						const product: TypeProductCommission = 'BLEBLE'
						const nextDate = utilitiesDate.parseToDate(utilitiesDate.getNextPaymentDate({
							frequency: plan.autoDebit.frequency as TypeFrequencyPlan,
							interval: plan.autoDebit.interval ?? 1,
							withTime: true
						}))
						const status: AutoDebitStatus = "PENDING";
						
						await AutoDebitScheduleRepository.insert({
							plan: JSON.stringify(plan),
							product,
							next_debit_date: nextDate,
							retry_count: 0,
							subscription_id: Number(resultNepSubscription.data?.ID_SOUSCRIPTION),
							status,
							notified: false
						});
						
						return {
							response: ussdMenuMerchant.bleble.children.subscription.children.beneficiary.phoneNumber.message.success,
							nextStep: null,
							updatedData: data,
						};
					}
				}
			}
			
			return {
				response: ussdMenuMerchant.globalError,
				nextStep: null,
				updatedData: data,
			};
		}
		
		return {
			response: confirm.message.invalide(data.plan),
			nextStep: "bleble_subscription_bleble_confirmPlan_merchant",
			updatedData: data,
		};
	},
}

export default blebleSubscriptionMerchant