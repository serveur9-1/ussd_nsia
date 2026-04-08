import ussdMenuCustomer, {thank} from "../../../../../constants/ussdMenuCustomer";
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
import momoPay, {customerPayBleblePlan} from "../../../../payments/momoPay";
import NepBeneficiairesRepository from "../../../../../repositories/nepBeneficiaireRepository";
import NepSouscriptionsRepository from "../../../../../repositories/nepSouscriptionRepository";
import AutoDebitScheduleRepository from "../../../../../repositories/autoDebitScheduleRepository";
import ExternalSubscriptionSyncRepository from "../../../../../repositories/externalSubscriptionSyncRepository";
import {buildEvoSyncPayload, syncEvoSubscription} from "../../../../integrations/evoSubscription";
import {TypeProductCommission} from "../../../../../types/models/commission";
import utilitiesDate from "../../../../../utils/date";
import {logger} from "../../../../../utils/logger";
import {Plan, TypeFrequencyPlan} from "../../../../../types/plan";
import {AutoDebitStatus} from "../../../../../types/models/autoDebitSchedule";
import {NepSouscription} from "../../../../../types/models/nepSouscription";

// For subscription: only 3 options - Par mois (opt. 1) 2500, (opt. 2) 5000, (opt. 3) 10000. No Paiement libre.
const allPlans = ussdMenuCustomer.bleble.children.pay.data.plans;
const plans = {
	"1": allPlans["2"], // Par mois (opt. 1): 2,500 Fcfa
	"2": allPlans["3"], // Par mois (opt. 2): 5,000 Fcfa
	"3": allPlans["4"], // Par mois (opt. 3): 10,000 Fcfa
};
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
		case 2500:
			return "Bonus paiement: Avec l'option 1 (2 500 Fcfa), vous bénéficiez d'un bonus sur vos versements.";
		case 5000:
			return "Bonus paiement: Avec l'option 2 (5 000 Fcfa), vous bénéficiez d'un bonus supérieur sur vos versements.";
		case 10000:
			return "Bonus paiement: Avec l'option 3 (10 000 Fcfa), vous bénéficiez du bonus maximum sur vos versements.";
		default:
			return null;
	}
}

const blebleCustomerSubscription = {
	blebleSubscriptionStart: async (sessionId: string, input: string, data: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: ussdMenuCustomer.bleble.children.subscription.text,
				nextStep: "bleble_subscription_start_customer",
				updatedData: data,
			};
		}
		
		if (input === ussdMenuCustomer.bleble.children.subscription.children.fullName.input) {
			return {
				response: ussdMenuCustomer.bleble.children.subscription.children.fullName.text,
				nextStep: "bleble_subscription_full_name_customer",
				updatedData: data,
			};
		}
		
		return {
			response: `${ussdMenuCustomer.chooseInvalide}${ussdMenuCustomer.bleble.children.subscription.text}`,
			nextStep: "bleble_subscription_start_customer",
			updatedData: data,
		};
	},
	blebleFullName: async (sessionId: string, input: string, data: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: ussdMenuCustomer.bleble.children.subscription.children.fullName.text,
				nextStep: "bleble_subscription_full_name_customer",
				updatedData: data,
			};
		}
		
		const validation = validationName(input)
		
		if (!validation.isValid) {
			return {
				response: ussdMenuCustomer.bleble.children.subscription.children.fullName.message.invalide,
				nextStep: "bleble_subscription_full_name_customer",
				updatedData: data,
			};
		}
		
		return {
			response: ussdMenuCustomer.bleble.children.subscription.children.brithDate.text,
			nextStep: "bleble_subscription_birth_date_customer",
			updatedData: {...data, fullName: validation.data},
		};
	},
	blebleBirthDate: async (sessionId: string, input: string, data: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: ussdMenuCustomer.bleble.children.subscription.children.brithDate.text,
				nextStep: "bleble_subscription_birth_date_customer",
				updatedData: data,
			};
		}
		
		const validation = validationDate(input)
		
		if (!validation.isValid) {
			return {
				response: ussdMenuCustomer.bleble.children.subscription.children.brithDate.message.invalide,
				nextStep: "bleble_subscription_birth_date_customer",
				updatedData: data,
			};
		}
		
		const age = getAge(validation.data)
		const isAdulte = age >= 18
		
		if (!isAdulte) {
			return {
				response: ussdMenuCustomer.bleble.children.subscription.children.brithDate.message.notRequired,
				nextStep: null,
				updatedData: data,
			};
		}
		
		return {
			response: ussdMenuCustomer.bleble.children.subscription.children.beneficiary.name.text,
			nextStep: "bleble_subscription_beneficiary_name_customer",
			updatedData: {...data, birthDate: validation.data},
		};
	},
	blebleBeneficiaryName: async (sessionId: string, input: string, data: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: ussdMenuCustomer.bleble.children.subscription.children.beneficiary.name.text,
				nextStep: "bleble_subscription_beneficiary_name_customer",
				updatedData: data,
			};
		}
		
		const validation = validationName(input)
		
		if (!validation.isValid) {
			return {
				response: ussdMenuCustomer.bleble.children.subscription.children.beneficiary.name.message.invalide,
				nextStep: "bleble_subscription_beneficiary_name_customer",
				updatedData: data,
			};
		}
		
		const payload = {...data, beneficiaryName: validation.data}
		
		return {
			response: ussdMenuCustomer.bleble.children.subscription.children.beneficiary.phoneNumber.text,
			nextStep: "bleble_subscription_bleble_beneficiary_phone_customer",
			updatedData: payload,
		};
	},
	blebleBeneficiaryPhone: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: ussdMenuCustomer.bleble.children.subscription.children.beneficiary.phoneNumber.text,
				nextStep: "bleble_subscription_bleble_beneficiary_phone_customer",
				updatedData: data,
			};
		}
		
		const validationBeneficiaryPhoneNumber = validationPhoneNumber(input)
		
		if (!validationBeneficiaryPhoneNumber.isValid) {
			return {
				response: ussdMenuCustomer.bleble.children.subscription.children.beneficiary.phoneNumber.message.invalide,
				nextStep: "bleble_subscription_bleble_beneficiary_phone_customer",
				updatedData: data,
			};
		}
		
		const updatedData = {
			...data,
			beneficiaryPhone: validationBeneficiaryPhoneNumber.data,
		}
		
		return {
			response: ussdMenuCustomer.bleble.children.pay.children.plan.text(plans),
			nextStep: "bleble_subscription_bleble_choosePlan_customer",
			updatedData,
		};
	},
	blebleChoosePlan: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: ussdMenuCustomer.bleble.children.pay.children.plan.text(plans),
				nextStep: "bleble_subscription_bleble_choosePlan_customer",
				updatedData: data,
			};
		}
		
		const plan = plans[input as keyof typeof plans]
		
		if (!plan) {
			return {
				response: `${ussdMenuCustomer.chooseInvalide}${ussdMenuCustomer.bleble.children.pay.children.plan.text(plans)}`,
				nextStep: "bleble_subscription_bleble_choosePlan_customer",
				updatedData: data,
			};
		}
		
		const updatedData = {...data, plan}
		
		// Remove bonus message from confirmation screen - show only confirmation text
		const confirmText = confirm.text(plan);
		
		return {
			response: confirmText,
			nextStep: 'bleble_subscription_bleble_confirmPlan_customer',
			updatedData,
		};
	},
	confirmPlan: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
		let plan: Plan = data.plan
		
		if (input === "__REPEAT__") {
			return {
				response: confirm.text(plan),
				nextStep: 'bleble_subscription_bleble_confirmPlan_customer',
				updatedData: data,
			};
		}
		
		if (input === confirm.input) {
			const {data: msisdn} = validationPhoneNumber(req.msisdn)
			
			const activeSouscription = await NepClientRepository.activeNepClientSubscriptionsByMsisdn(msisdn, true);
			
			if (activeSouscription.status) {
				const subscription = activeSouscription?.data
				
				if (subscription) {
					return {
						response: ussdMenuCustomer.bleble.children.subscription.children.beneficiary.phoneNumber.message.exist(subscription.ETAT_SOUSCRIPTION),
						nextStep: null,
						updatedData: data,
					};
				}
			}
			
			const amount = ussdMenuCustomer.bleble.amount
			const reference = generateReference("NEP", "SOUS", msisdn);
			
			const responsePayment = await momoPay({
				reference,
				msisdn,
				amount
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
				MSISDN: msisdn,
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
						MSISDN: msisdn
					})
					
					const product: TypeProductCommission = 'BLEBLE'
					const nextDate = utilitiesDate.parseToDate(utilitiesDate.getNextPaymentDate({
						frequency: plan.autoDebit.frequency as TypeFrequencyPlan,
						interval: plan.autoDebit.interval ?? 1,
						withTime: true
					}))
					const status: AutoDebitStatus = "PENDING";
					
					if (resultNepSubscription.status) {
						await AutoDebitScheduleRepository.insert({
							plan: JSON.stringify(plan),
							product,
							next_debit_date: nextDate,
							retry_count: 0,
							subscription_id: Number(resultNepSubscription.data?.ID_SOUSCRIPTION),
							status,
							notified: false
						});

						const evoPayload = buildEvoSyncPayload({
							product: "BLEBLE",
							fullName: data.fullName,
							birthDate: data.birthDate,
							msisdn,
							beneficiaryName: data.beneficiaryName,
							primePeriodique: Number(plan.amount ?? 0),
							duree: 1,
							periodicite: "MENSUEL",
						});
						try {
							await syncEvoSubscription(evoPayload);
						} catch (error) {
							logger.error("[EVO_SYNC_IMMEDIATE_ERROR][BLEBLE]", {error, reference});
							await ExternalSubscriptionSyncRepository.insert({
								product: "BLEBLE",
								localReference: reference,
								localSubscriptionId: Number(resultNepSubscription.data?.ID_SOUSCRIPTION),
								msisdn,
								payload: evoPayload
							});
						}
						
						return {
							response: ussdMenuCustomer.bleble.children.subscription.children.beneficiary.phoneNumber.message.success,
							nextStep: null,
							updatedData: data,
						};
					}
				}
			}
			
			return {
				response: ussdMenuCustomer.globalError,
				nextStep: null,
				updatedData: data,
			};
		}
		
		return {
			response: confirm.message.invalide(data.plan),
			nextStep: "bleble_subscription_bleble_confirmPlan_customer",
			updatedData: data,
		};
	},
}

export default blebleCustomerSubscription