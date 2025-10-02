import ussdMenuCustomer from "../../../../constants/ussdMenuCustomer";
import NsiaAutresProduitsRepository from "../../../../repositories/nsiaAutresProduitsRepository";
import momoPay from "../../../payments/momoPay";
import {formatPhoneNumber, generateReference} from "../../../../utils/format";
import {Action, ProductTypes} from "../../../../types/productTypes";

const otherProducts = ussdMenuCustomer.otherProducts

const otherProductsMenu = {
	main: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
		if (input === "__REPEAT__") {
			return {
				response: otherProducts.children.police.text,
				nextStep: 'otherProducts_main_customer',
				updatedData: data,
			};
		}
		
		const resultUnpaid = await NsiaAutresProduitsRepository.impayesAutresProduits(input)
		
		if (!resultUnpaid.status || resultUnpaid.data?.length === 0) {
			return {
				response: otherProducts.children.police.messages().notInvoice,
				nextStep: null,
				updatedData: data,
			};
		}
		
		const updatedData = {
			...data,
			police: input,
			unpaid: resultUnpaid.data || []
		}
		
		return {
			response: otherProducts.children.pay.text(resultUnpaid.data || []).text,
			nextStep: 'otherProducts_pay_customer',
			updatedData,
		};
	},
	pay: async (sessionId: string, input: string, data: Record<string, any>, req: Record<string, any>) => {
		const unpaid = data.unpaid
		const text = otherProducts.children.pay.text(unpaid)
		
		if (input === "__REPEAT__") {
			return {
				response: text.text,
				nextStep: 'otherProducts_pay_customer',
				updatedData: data,
			};
		}
		
		if (input !== otherProducts.children.pay.input) {
			return {
				response: otherProducts.children.pay.messages.invalide(unpaid),
				nextStep: 'otherProducts_pay_customer',
				updatedData: data,
			};
		}
		
		const resultProduct = await NsiaAutresProduitsRepository.impayesAutresProduitsNsia(data.police)
		
		if (!resultProduct.status || !resultProduct.data) {
			return {
				response: otherProducts.children.police.messages().notInvoice,
				nextStep: null,
				updatedData: data,
			};
		}
		
		const product = resultProduct.data
		
		const productReference = `AUTRES_${text.products.replace(', ', '-')}}` as ProductTypes
		const action = text.periods.replace(', ', '-') as Action
		
		const reference = generateReference(productReference, action, product?.NUMERO_POLICE)
		
		const responsePayment = await momoPay({
			reference,
			msisdn: formatPhoneNumber(req.msisdn),
			amount: text.totalAmount
		})
		
		return {
			response: responsePayment.message,
			nextStep: null,
			updatedData: data,
		};
	}
}

export default otherProductsMenu