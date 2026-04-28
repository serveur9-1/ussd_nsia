import ussdMenuCustomer from "../../../../../constants/ussdMenuCustomer";
import {validationAmount, validationDate, validationPhoneNumber} from "../../../../../utils/validation";
import NepClientRepository from "../../../../../repositories/nepClientRepository";
import NepRetraitsRepository from "../../../../../repositories/nepRetraitsRepository";
import {formatDate, formatPhoneNumber, generateReference} from "../../../../../utils/format";
import NepSouscriptionsRepository from "../../../../../repositories/nepSouscriptionRepository";
import {StepFunction} from "../../../../../types/appTypes";
import {queueEvoRachat} from "../../../../../services/integrations/evoPaymentRachat";

const partialWithdraw = ussdMenuCustomer.bleble.children.partialWithdraw

const bleblePartialWithdraw = {
	start: async (sessionId: string, input: string, data: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: partialWithdraw.text,
				nextStep: "bleble_partial_withdraw_start_customer",
				updatedData: data,
			};
		}
		
		if (input !== partialWithdraw.children.continue.input) {
			return {
				response: partialWithdraw.children.continue.message.invalide(),
				nextStep: "bleble_partial_withdraw_start_customer",
				updatedData: data,
			};
		}
		
		return {
			response: partialWithdraw.children.phoneNumber.text(),
			nextStep: "bleble_partial_withdraw_phoneNumber_customer",
			updatedData: data,
		};
	},
	phoneNumber: async (sessionId: string, input: string, data: Record<string, any>) => phoneNumberWithDraw({
		input,
		data,
		current: "bleble_partial_withdraw_phoneNumber_customer",
		nextStep: "bleble_partial_withdraw_brithDate_customer",
	}),
	brithDate: async (sessionId: string, input: string, data: Record<string, any>) => brithDateWithDraw({
		data,
		input,
		current: 'bleble_partial_withdraw_brithDate_customer',
		nextStep: 'bleble_partial_withdraw_continue_customer'
	}),
	continue: async (sessionId: string, input: string, data: Record<string, any>) => continueWithdrawWithdraw({
		current: 'bleble_partial_withdraw_continue_customer',
		nextStep: 'bleble_partial_withdraw_amount_customer',
		data,
		input
	}),
	amount: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: partialWithdraw.children.amount.text,
				nextStep: "bleble_partial_withdraw_amount_customer",
				updatedData: data,
			};
		}
		
		const amountValidated = validationAmount(input);
		const montantSaisi = amountValidated.data;

		if (!amountValidated.isValid || montantSaisi === undefined || Number(input) < 500) {
			return {
				response: partialWithdraw.children.amount.message.invalide,
				nextStep: 'bleble_partial_withdraw_amount_customer',
				updatedData: data,
			};
		}

		const montantRetrait = montantSaisi;
		
		const reference = generateReference("NEP", "RETR", req.msisdn);
		const now = new Date();
		const subscription = data.subscription;
		
		const amountCanWithdraw = data.amountCanWithdraw
		
		const canWithdraw = data.activityDuration >= 365 && data.balance >= 60000 && data.withdrawOnCurrentYear?.length === 0
		
		if (!canWithdraw) {
			return {
				response: partialWithdraw.children.amount.message.exist(formatDate(subscription.DATE_SOUSCRIPTION, 'DD-MM-YYYY')),
				nextStep: null,
				updatedData: data,
			};
		}
		
		if (montantRetrait > amountCanWithdraw) {
			return {
				response: partialWithdraw.children.amount.message.maxAmount(amountCanWithdraw),
				nextStep: 'bleble_partial_withdraw_amount_customer',
				updatedData: data,
			};
		}
		
		const result = await NepRetraitsRepository.insert({
			ID_SOUSCRIPTION: subscription.ID_SOUSCRIPTION,
			MSISDN: formatPhoneNumber(req.msisdn),
			DATE_RETRAIT: now,
			MONTANT_RETRAIT: montantRetrait,
			REFERENCE_RETRAIT: reference,
			TYPE_RETRAIT: 'RACHAT_PARTIEL'
		});
		
		if (result.status) {
			setImmediate(() => {
				void queueEvoRachat({
					msisdn: formatPhoneNumber(req.msisdn),
					montant: montantRetrait,
					typeRachat: "PARTIEL",
					localReference: reference,
					product: "BLEBLE",
					evoContractId: subscription.EVO_CONTRACT_ID ?? null,
					numeroPolice: subscription.NUMERO_POLICE ?? null
				});
			});
			return {
				response: partialWithdraw.children.amount.message.success(montantRetrait),
				nextStep: null,
				updatedData: data,
			};
		}
		
		return {
			response: partialWithdraw.message.invalide(),
			nextStep: null,
			updatedData: data,
		};
	}
}

export const phoneNumberWithDraw = ({input, data, current, nextStep}: StepFunction) => {
	if (input === "__REPEAT__") {
		return {
			response: partialWithdraw.text,
			nextStep: current,
			updatedData: data,
		};
	}
	
	const phoneNumberValidated = validationPhoneNumber(input);
	
	if (!phoneNumberValidated.isValid) {
		return {
			response: partialWithdraw.children.phoneNumber.message.invalide(),
			nextStep: current,
			updatedData: data,
		};
	}
	
	const payload = {
		...data,
		phoneNumber: phoneNumberValidated.data,
	}
	
	return {
		response: partialWithdraw.children.brithDate().text,
		nextStep,
		updatedData: payload,
	};
}

export const brithDateWithDraw = async ({input, data, current, nextStep, text}: StepFunction) => {
	if (input === "__REPEAT__") {
		return {
			response: ussdMenuCustomer.bleble.children.checkContract.children.brithDate.text,
			nextStep: current,
			updatedData: data,
		};
	}
	
	const validationDateBrith = validationDate(input)
	
	if (!validationDateBrith.isValid) {
		return {
			response: ussdMenuCustomer.bleble.children.partialWithdraw.children.brithDate().message().invalide,
			nextStep: current,
			updatedData: data,
		};
	}
	
	if (text) {
		return {
			response: text,
			nextStep: nextStep,
			updatedData: {
				...data,
				brithDate: validationDateBrith.data
			},
		};
	}
	
	const activeNepClientSubscription = await NepClientRepository.activeNepClientSubscriptionsByMsisdn(data.phoneNumber, true, validationDateBrith.data)
	
	if (!activeNepClientSubscription.status || !activeNepClientSubscription?.data) {
		return {
			response: ussdMenuCustomer.bleble.children.partialWithdraw.message.invalide(),
			nextStep: null,
			updatedData: data,
		};
	}
	
	const subscription = activeNepClientSubscription.data
	
	if (subscription.ETAT_SOUSCRIPTION === '00') {
		return {
			response: ussdMenuCustomer.bleble.children.partialWithdraw.message.exist,
			nextStep: null,
			updatedData: data,
		};
	}
	
	if (subscription.ETAT_SOUSCRIPTION === '01') {
		const resultBalance = await NepClientRepository.balance(Number(subscription?.ID_SOUSCRIPTION))
		const now = new Date();
		const year = now.getFullYear().toString();
		
		const resultActivityDuration = await NepSouscriptionsRepository.activityDuration(subscription.ID_SOUSCRIPTION);
		const resultWithdrawOnCurrentYear = await NepRetraitsRepository.nepRetraitByIdSubscription(subscription.ID_SOUSCRIPTION, new Date(`${year}-01-01`), new Date(`${year}-12-31`));
		
		if ((!resultActivityDuration.status || !resultActivityDuration.data) || (!resultWithdrawOnCurrentYear.status || !resultWithdrawOnCurrentYear.data) || (!resultBalance?.status || !resultBalance?.data)) {
			return {
				response: partialWithdraw.message.invalide(),
				nextStep: null,
				updatedData: data,
			};
		}
		
		const activityDuration = resultActivityDuration?.data
		const balance = resultBalance.data.balance
		const withdrawOnCurrentYear = resultWithdrawOnCurrentYear?.data
		
		const amountCanWithdraw = balance * 85 / 100;
		
		const payload = {
			...data,
			subscription,
			activityDuration,
			balance,
			withdrawOnCurrentYear,
			amountCanWithdraw
		}
		
		return {
			response: partialWithdraw.children.continue.text(balance, nextStep === 'bleble_partial_withdraw_continue_customer' ? amountCanWithdraw : undefined),
			nextStep,
			updatedData: payload,
		};
	}
	
	return {
		response: ussdMenuCustomer.bleble.children.partialWithdraw.message.invalide(),
		nextStep: null,
		updatedData: data,
	};
}

export const continueWithdrawWithdraw = ({nextStep, current, input, data}: StepFunction) => {
	const response = partialWithdraw.children.continue.text(data.balance, data.amountCanWithdraw)
	
	if (input === "__REPEAT__") {
		return {
			response,
			nextStep: current,
			updatedData: data,
		};
	}
	
	if (input !== partialWithdraw.children.continue.input) {
		return {
			response: partialWithdraw.children.continue.message.invalide(),
			nextStep: current,
			updatedData: data,
		};
	}
	
	return {
		response: partialWithdraw.children.amount.text,
		nextStep: nextStep,
		updatedData: data,
	};
}

export default bleblePartialWithdraw