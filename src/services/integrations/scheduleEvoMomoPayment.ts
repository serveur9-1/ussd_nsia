import {queueEvoMomoPayment} from "./evoPaymentRachat";

/**
 * Envoie le paiement MoMo vers EVO sans bloquer la réponse IPN.
 */
export function scheduleEvoMomoPaymentAfterIpn(params: {
	msisdn: string;
	amount: string;
	reference: string;
	categorie: "NEP" | "NAF";
}): void {
	const product = params.categorie === "NEP" ? "BLEBLE" : "IFOH";
	setImmediate(() => {
		void queueEvoMomoPayment({
			msisdn: params.msisdn,
			amount: params.amount,
			referencePaiement: params.reference,
			product
		});
	});
}
