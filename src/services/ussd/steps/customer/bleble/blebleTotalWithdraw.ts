import ussdMenuCustomer from "../../../../../constants/ussdMenuCustomer";
import {brithDateWithDraw, continueWithdrawWithdraw, phoneNumberWithDraw} from "./bleblePartialWithdraw";
import {formatDate, formatPhoneNumber, generateReference} from "../../../../../utils/format";
import NepSouscriptionsRepository from "../../../../../repositories/nepSouscriptionRepository";
import {NepSouscription} from "../../../../../types/models/nepSouscription";
import NepRetraitsRepository from "../../../../../repositories/nepRetraitsRepository";
import {queueEvoRachat} from "../../../../../services/integrations/evoPaymentRachat";

const totalWithdraw = ussdMenuCustomer.bleble.children.totalWithdraw

const blebleTotalWithdraw = {
	start: async (sessionId: string, input: string, data: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: totalWithdraw.text(),
				nextStep: "bleble_total_withdraw_start_customer",
				updatedData: data,
			};
		}
		
		if (input !== totalWithdraw.children().continue.input) {
			return {
				response: totalWithdraw.children().continue.message.invalide(),
				nextStep: "bleble_total_withdraw_start_customer",
				updatedData: data,
			};
		}
		
		return {
			response: totalWithdraw.children().phoneNumber.text(),
			nextStep: "bleble_total_withdraw_phoneNumber_customer",
			updatedData: data,
		};
	},
	phoneNumber: async (sessionId: string, input: string, data: Record<string, any>) => phoneNumberWithDraw({
		input,
		data,
		current: "bleble_total_withdraw_phoneNumber_customer",
		nextStep: "bleble_total_withdraw_brithDate_customer",
	}),
	brithDate: async (sessionId: string, input: string, data: Record<string, any>) => {
		return brithDateWithDraw({
			data,
			input,
			current: 'bleble_total_withdraw_brithDate_customer',
			nextStep: 'bleble_total_withdraw_confirm_customer'
		})
	},
	confirm: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
		const response = totalWithdraw.children().confirm().text(data.balance)
		
		if (input === "__REPEAT__") {
			return {
				response,
				nextStep: 'bleble_total_withdraw_confirm_customer',
				updatedData: data,
			};
		}
		
		if (input !== totalWithdraw.children().confirm().input) {
			return {
				response: totalWithdraw.children().confirm().message.invalide(),
				nextStep: 'bleble_total_withdraw_confirm_customer',
				updatedData: data,
			};
		}
		
		const canWithdraw = data.activityDuration >= 365 && data.balance >= 60000
		
		if (!canWithdraw) {
			return {
				response: totalWithdraw.children().confirm().message.exist,
				nextStep: null,
				updatedData: data,
			};
		}
		
		const reference = generateReference("NEP", "RETR", req.msisdn);
		const subscription: NepSouscription = data.subscription
		const now = new Date();
		
		const resultUpdateSubscription = await NepSouscriptionsRepository.update({
			idSouscription: subscription.ID_SOUSCRIPTION
		}, "00")
		const result = await NepRetraitsRepository.insert({
			ID_SOUSCRIPTION: subscription.ID_SOUSCRIPTION,
			MSISDN: formatPhoneNumber(req.msisdn),
			DATE_RETRAIT: now,
			MONTANT_RETRAIT: data.balance,
			REFERENCE_RETRAIT: reference,
			TYPE_RETRAIT: 'RACHAT_TOTAL'
		});
		
		if (result.status && resultUpdateSubscription.status) {
			setImmediate(() => {
				void queueEvoRachat({
					msisdn: formatPhoneNumber(req.msisdn),
					montant: data.balance,
					typeRachat: "TOTAL",
					localReference: reference,
					product: "BLEBLE",
					evoContractId: subscription.EVO_CONTRACT_ID ?? null,
					numeroPolice: subscription.NUMERO_POLICE ?? null
				});
			});
			return {
				response: totalWithdraw.children().confirm().message.success(data.balance),
				nextStep: null,
				updatedData: data,
			};
		}
		
		return {
			response: totalWithdraw.message().invalide(),
			nextStep: null,
			updatedData: data,
		};
	}
}

export default blebleTotalWithdraw
