import ussdMenuCustomer from "../../../../../constants/ussdMenuCustomer";
import {validationDate, validationName, validationPhoneNumber} from "../../../../../utils/validation";
import {formatDate, formatPhoneNumber, generateReference, getAge, splitFullName} from "../../../../../utils/format";
import NafClientRepository from "../../../../../repositories/nafClientRepository";
import momoPay from "../../../../payments/momoPay";
import NafBeneficiaireRepository from "../../../../../repositories/nafBeneficiaireRepository";
import NafSouscriptionRepository from "../../../../../repositories/nafSouscriptionRepository";
import ExternalSubscriptionSyncRepository from "../../../../../repositories/externalSubscriptionSyncRepository";
import {buildEvoSyncPayload, syncEvoSubscription} from "../../../../integrations/evoSubscription";
import {logger} from "../../../../../utils/logger";

const ifohSubscription = ussdMenuCustomer.ifoh.children.subscription

const ifohSubscriptionMenu = {
	main: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: ifohSubscription.text,
				nextStep: "ifoh_subscription_main_customer",
				updatedData: data,
			};
		}
		
		if (input === ifohSubscription.input) {
			return {
				response: ifohSubscription.children.fullName().text,
				nextStep: "ifoh_subscription_choose_fullName_customer",
				updatedData: data,
			};
		}
		
		return {
			response: `${ussdMenuCustomer.chooseInvalide}${ifohSubscription.text}`,
			nextStep: "ifoh_subscription_main_customer",
			updatedData: data,
		};
	},
	fullName: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: ifohSubscription.children.fullName().text,
				nextStep: "ifoh_subscription_choose_fullName_customer",
				updatedData: data,
			};
		}
		
		const nameValidated = validationName(input)
		
		if (!nameValidated.isValid) {
			return {
				response: ifohSubscription.children.fullName().message.invalide,
				nextStep: "ifoh_subscription_choose_fullName_customer",
				updatedData: data,
			};
		}
		
		const payload = {
			...data,
			fullName: nameValidated.data
		}
		
		return {
			response: ifohSubscription.children.brithDate().text,
			nextStep: "ifoh_subscription_choose_brithDate_customer",
			updatedData: payload,
		};
	},
	brithDate: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: ifohSubscription.children.brithDate().text,
				nextStep: "ifoh_subscription_choose_brithDate_customer",
				updatedData: data,
			};
		}
		
		const brithDateValidated = validationDate(input)
		
		if (!brithDateValidated.isValid) {
			return {
				response: ifohSubscription.children.brithDate().message.invalide,
				nextStep: "ifoh_subscription_choose_brithDate_customer",
				updatedData: data,
			};
		}
		
		const payload = {
			...data,
			brithDate: brithDateValidated.data
		}
		
		return {
			response: ifohSubscription.children.beneficiary.text,
			nextStep: "ifoh_subscription_choose_beneficiary_customer",
			updatedData: payload,
		};
	},
	chooseBeneficiary: {
		main: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
			if (input === "__REPEAT__") {
				return {
					response: ifohSubscription.children.beneficiary.text,
					nextStep: "ifoh_subscription_choose_beneficiary_customer",
					updatedData: data,
				};
			}
			
			const choose = ifohSubscription.children.beneficiary.chooses.find(choose => choose.input === input)
			
			if (!choose) {
				return {
					response: ifohSubscription.children.beneficiary.messages.invalide(),
					nextStep: "ifoh_subscription_choose_beneficiary_customer",
					updatedData: data,
				};
			}
			
			const updatedData = {
				...data,
				beneficiary: {
					...data.beneficiary,
					choose
				}
			}
			
			return {
				response: ifohSubscription.children.beneficiary.children.fullName().text(choose),
				nextStep: "ifoh_subscription_choose_beneficiary_fullName_customer",
				updatedData,
			};
		},
		fullName: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
			if (input === "__REPEAT__") {
				return {
					response: ifohSubscription.children.beneficiary.children.fullName().text(data.beneficiary.choose),
					nextStep: "ifoh_subscription_choose_beneficiary_fullName_customer",
					updatedData: data,
				};
			}
			
			const nameValidated = validationName(input)
			
			if (!nameValidated.isValid) {
				return {
					response: ifohSubscription.children.fullName().message.invalide,
					nextStep: "ifoh_subscription_choose_beneficiary_fullName_customer",
					updatedData: data,
				};
			}
			
			const updatedData = {
				...data,
				beneficiary: {
					...data.beneficiary,
					fullName: nameValidated.data
				}
			}
			
			return {
				response: ifohSubscription.children.beneficiary.children.phoneNumber().text,
				nextStep: "ifoh_subscription_choose_beneficiary_phoneNumber_customer",
				updatedData,
			};
		},
		phoneNumber: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
			if (input === "__REPEAT__") {
				return {
					response: ifohSubscription.children.beneficiary.children.phoneNumber().text,
					nextStep: "ifoh_subscription_choose_beneficiary_phoneNumber_customer",
					updatedData: data,
				};
			}
			
			const phoneNumberValidated = validationPhoneNumber(input)
			
			if (!phoneNumberValidated.isValid) {
				return {
					response: ifohSubscription.children.beneficiary.children.phoneNumber().message.invalide,
					nextStep: "ifoh_subscription_choose_beneficiary_phoneNumber_customer",
					updatedData: data,
				};
			}
			
			const updatedData = {
				...data,
				beneficiary: {
					...data.beneficiary,
					phoneNumber: phoneNumberValidated.data
				}
			}
			
			const msisdn = formatPhoneNumber(req.msisdn)
			const nafInformations = await NafClientRepository.informations(msisdn)
			
			if (nafInformations.status && nafInformations.data) {
				return {
					response: ifohSubscription.children.beneficiary.children.phoneNumber().message.exist(nafInformations.data?.ETAT_SOUSCRIPTION),
					nextStep: null,
					updatedData,
				};
			}
			
			const beneficiary = data.beneficiary
			const choose = beneficiary.choose
			const age = getAge(data.brithDate);
			
			if (!choose?.condition(age)) {
				return {
					response: ifohSubscription.children.brithDate().message.notRequired,
					nextStep: null,
					updatedData,
				};
			}
			
			const message = "Votre souscription à Ifoh vient d’être prise en compte."
			const amount = 1000
			const reference = generateReference("NAF", "SOUS", msisdn)
			const DATE_OF_SUBSCRIPTION = new Date();
			
			const responsePayment = await momoPay({
				msisdn,
				message,
				reference,
				amount
			});
			
			if (responsePayment.success) {
				const {lastName, firstName} = splitFullName(data.fullName)
				
				const resultInsertNafClient = await NafClientRepository.insert({
					MSISDN: msisdn,
					GENDER: "GENDER",
					BIRTH_DATE: data.brithDate,
					TITLE: formatDate(DATE_OF_SUBSCRIPTION, 'DD/MM/YYYY'),
					FIRST_NAME: firstName,
					LAST_NAME: lastName
				})
				
				const resultBeneficiary = await NafBeneficiaireRepository.insert({
					NOM_BENEFICIAIRE: beneficiary.fullName,
					TELEPHONE_BENEFICIAIRE: phoneNumberValidated.data,
					TYPE_BENEFICIAIRE: choose.key
				});
				
				if ((resultInsertNafClient.status && resultInsertNafClient.data) && resultBeneficiary.status && resultBeneficiary.data) {
					const resultSubscription = await NafSouscriptionRepository.insert({
						ID_CLIENT: resultInsertNafClient.data?.ID_CLIENT,
						ID_BENEFICIAIRE: resultBeneficiary.data?.ID_BENEFICIAIRE,
						MONTANT_SOUSCRIPTION: BigInt(amount),
						ETAT_SOUSCRIPTION: responsePayment.code,
						REFERENCE_SOUSCRIPTION: reference,
						PROCHAIN_PAIEMENT: new Date(),
						MSISDN: msisdn
					})
					
					if (resultSubscription.status) {
						const evoPayload = buildEvoSyncPayload({
							product: "IFOH",
							fullName: data.fullName,
							birthDate: data.brithDate,
							msisdn,
							beneficiaryName: beneficiary.fullName,
							primePeriodique: amount,
							duree: 1,
							periodicite: "MENSUEL",
						});
						try {
							const evoResult = await syncEvoSubscription(evoPayload);
							await NafSouscriptionRepository.updateEvoContractData(
								Number(resultSubscription.data?.ID_SOUSCRIPTION),
								{
									evoContractId: evoResult.evoContractId,
									numeroPolice: evoResult.numeroPolice
								}
							);
						} catch (error) {
							logger.error("[EVO_SYNC_IMMEDIATE_ERROR][IFOH]", {error, reference});
							await ExternalSubscriptionSyncRepository.insert({
								product: "IFOH",
								localReference: reference,
								localSubscriptionId: Number(resultSubscription.data?.ID_SOUSCRIPTION),
								msisdn,
								payload: {
									...evoPayload,
									localSubscriptionId: Number(resultSubscription.data?.ID_SOUSCRIPTION),
									product: "IFOH"
								}
							});
						}

						return {
							response: ifohSubscription.children.beneficiary.children.phoneNumber().message.success,
							nextStep: null,
							updatedData,
						};
					}
				}
			}
			
			return {
				response: ifohSubscription.children.beneficiary.children.phoneNumber().message.exist(responsePayment.code),
				nextStep: null,
				updatedData,
			};
		},
	},
}

export default ifohSubscriptionMenu