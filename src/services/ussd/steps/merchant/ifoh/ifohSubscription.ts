import {validationDate, validationName, validationPhoneNumber} from "../../../../../utils/validation";
import {
	formatDate,
	formatPhoneNumber,
	generateReference,
	getAge,
	getCurrentDate,
	splitFullName
} from "../../../../../utils/format";
import NafClientRepository from "../../../../../repositories/nafClientRepository";
import momoPay from "../../../../payments/momoPay";
import NafBeneficiaireRepository from "../../../../../repositories/nafBeneficiaireRepository";
import NafSouscriptionRepository from "../../../../../repositories/nafSouscriptionRepository";
import ussdMenuMerchant from "../../../../../constants/ussdMenuMerchant";
import {checkingMerchant} from "../ussdRoutesMerchant";
import MerchantTransactionRepository from "../../../../../repositories/MerchantTransactionRepository";
import {logger} from "../../../../../utils/logger";

const ifohSubscription = ussdMenuMerchant.ifoh.children.subscription

const ifohSubscriptionMenu = {
	main: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: ifohSubscription.text,
				nextStep: "ifoh_subscription_main_merchant",
				updatedData: data,
			};
		}
		
		if (input !== ifohSubscription.input) {
			return {
				response: `${ussdMenuMerchant.chooseInvalide}${ifohSubscription.text}`,
				nextStep: "ifoh_subscription_main_merchant",
				updatedData: data,
			};
		}
		
		return {
			response: ifohSubscription.children.phoneNumber().text,
			nextStep: "ifoh_subscription_phoneNumber_merchant",
			updatedData: data,
		};
	},
	phoneNumber: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: ifohSubscription.children.phoneNumber().text,
				nextStep: "ifoh_subscription_phoneNumber_merchant",
				updatedData: data,
			};
		}
		
		const phoneNumberValidated = validationPhoneNumber(input)
		
		if (!phoneNumberValidated.isValid) {
			return {
				response: ifohSubscription.children.phoneNumber().message.invalide(),
				nextStep: "ifoh_subscription_phoneNumber_merchant",
				updatedData: data,
			};
		}
		
		const updatedData = {
			...data,
			phoneNumber: phoneNumberValidated.data
		}
		
		return {
			response: ifohSubscription.children.fullName().text,
			nextStep: "ifoh_subscription_choose_fullName_merchant",
			updatedData: updatedData,
		};
	},
	fullName: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: ifohSubscription.children.fullName().text,
				nextStep: "ifoh_subscription_choose_fullName_merchant",
				updatedData: data,
			};
		}
		
		const fullNameValidated = validationName(input)
		
		if (!fullNameValidated.isValid) {
			return {
				response: ifohSubscription.children.fullName().message.invalide,
				nextStep: "ifoh_subscription_choose_fullName_merchant",
				updatedData: data,
			};
		}
		
		const payload = {
			...data,
			fullName: fullNameValidated.data
		}
		
		return {
			response: ifohSubscription.children.brithDate().text,
			nextStep: "ifoh_subscription_choose_brithDate_merchant",
			updatedData: payload,
		};
	},
	brithDate: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: ifohSubscription.children.brithDate().text,
				nextStep: "ifoh_subscription_choose_brithDate_merchant",
				updatedData: data,
			};
		}
		
		const brithDateValidated = validationDate(input)
		
		if (!brithDateValidated.isValid) {
			return {
				response: ifohSubscription.children.brithDate().message.invalide,
				nextStep: "ifoh_subscription_choose_brithDate_merchant",
				updatedData: data,
			};
		}
		
		const payload = {
			...data,
			brithDate: brithDateValidated.data
		}
		
		return {
			response: ifohSubscription.children.beneficiary.text(),
			nextStep: "ifoh_subscription_choose_beneficiary_merchant",
			updatedData: payload,
		};
	},
	chooseBeneficiary: {
		main: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
			if (input === "__REPEAT__") {
				return {
					response: ifohSubscription.children.beneficiary.text(),
					nextStep: "ifoh_subscription_choose_beneficiary_merchant",
					updatedData: data,
				};
			}
			
			const choose = ifohSubscription.children.beneficiary.chooses.find(choose => choose.input === input)
			
			if (!choose) {
				return {
					response: ifohSubscription.children.beneficiary.messages.invalide(),
					nextStep: "ifoh_subscription_choose_beneficiary_merchant",
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
				nextStep: "ifoh_subscription_choose_beneficiary_fullName_merchant",
				updatedData,
			};
		},
		fullName: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
			if (input === "__REPEAT__") {
				return {
					response: ifohSubscription.children.beneficiary.children.fullName().text(data.beneficiary.choose),
					nextStep: "ifoh_subscription_choose_beneficiary_fullName_merchant",
					updatedData: data,
				};
			}
			
			const nameValidated = validationName(input)
			
			if (!nameValidated.isValid) {
				return {
					response: ifohSubscription.children.fullName().message.invalide,
					nextStep: "ifoh_subscription_choose_beneficiary_fullName_merchant",
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
				nextStep: "ifoh_subscription_choose_beneficiary_phoneNumber_merchant",
				updatedData,
			};
		},
		phoneNumber: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
			if (input === "__REPEAT__") {
				return {
					response: ifohSubscription.children.beneficiary.children.phoneNumber().text,
					nextStep: "ifoh_subscription_choose_beneficiary_phoneNumber_merchant",
					updatedData: data,
				};
			}
			
			const phoneNumberValidated = validationPhoneNumber(input)
			
			if (!phoneNumberValidated.isValid) {
				return {
					response: ifohSubscription.children.beneficiary.children.phoneNumber().message.invalide,
					nextStep: "ifoh_subscription_choose_beneficiary_phoneNumber_merchant",
					updatedData: data,
				};
			}
			
			const {status, responseNotMerchant, merchant} = await checkingMerchant(req.msisdn, data)
			
			if (!status || !merchant) {
				return responseNotMerchant;
			}
			
			const beneficiary = data.beneficiary
			const choose = beneficiary.choose
			const age = getAge(data.brithDate);
			
			if (!choose?.condition(age)) {
				return {
					response: ifohSubscription.children.brithDate().message.notRequired,
					nextStep: null,
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
					updatedData: data,
				};
			}
			
			const message = "Votre souscription à Ifoh vient d’être prise en compte."
			const amount = 1000
			const reference = generateReference("NAF", "SOUS_DIS", msisdn)
			const DATE_OF_SUBSCRIPTION = new Date();
			
			const responsePayment = await momoPay({
				msisdn: data.phoneNumber,
				message,
				reference,
				amount
			});
			
			if (responsePayment.success) {
				const {lastName, firstName} = splitFullName(data.fullName)
				
				const resultInsertNafClient = await NafClientRepository.insert({
					MSISDN: data.phoneNumber,
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
					
					const resultMerchantTransaction = await MerchantTransactionRepository.insert({
						id_merchant: merchant.id,
						id_client: resultInsertNafClient.data?.ID_CLIENT,
						reference_transaction: reference,
						montant_transaction: amount.toString(),
						date_transaction: formatDate(getCurrentDate(), 'YYYY-MM-DD'),
						etat_transaction: responsePayment.code
					})
					
					if (resultSubscription.status && resultMerchantTransaction.status) {
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