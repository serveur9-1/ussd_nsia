import {EvoChangeBeneficiaryPayload, queueEvoChangeBeneficiary} from "./evoChangeBeneficiary";

/** Après UPDATE local du bénéficiaire : envoi NSIA sans bloquer la réponse USSD. */
export function scheduleEvoBeneficiaryChangeAfterLocalUpdate(payload: EvoChangeBeneficiaryPayload): void {
	setImmediate(() => {
		void queueEvoChangeBeneficiary(payload);
	});
}
