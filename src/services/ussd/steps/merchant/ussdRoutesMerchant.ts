import {blebleMenu} from "./bleble/blebleMenu";
import ifohMenu from "./ifoh/ifohMenu";
import ifohSubscriptionMenu from "./ifoh/ifohSubscription";
import ifohPayMenu from "./ifoh/ifohPayMenu";
import {mainMenu} from "./mainMenu";
import blebleSubscriptionMerchant from "./bleble/blebleSubscriptionMerchant";
import blebleMerchantPay from "./bleble/blebleMerchantPay";
import {formatPhoneNumber} from "../../../../utils/format";
import MerchantRepository from "../../../../repositories/merchantRepository";
import ussdMenuMerchant from "../../../../constants/ussdMenuMerchant";
import blebleCustomerSubscription from "../customer/bleble/blebleCustomerSubscription";

const stepsMerchantHandlers: Record<string, (sessionid: string, input: string, data: Record<string, any>, req: Record<string, any>) => Promise<{
	response: string;
	nextStep: string | null;
	updatedData: Record<string, any>;
}>> = {
	main_menu_merchant: mainMenu,
	
	bleble_menu_merchant: blebleMenu,
	
	bleble_subscription_start_merchant: blebleSubscriptionMerchant.blebleSubscriptionStart,
	bleble_subscription_phoneNumber_merchant: blebleSubscriptionMerchant.blebleSubscriptionPhoneNumber,
	bleble_subscription_fullName_merchant: blebleSubscriptionMerchant.blebleFullName,
	bleble_subscription_birthDate_merchant: blebleSubscriptionMerchant.blebleBirthDate,
	bleble_subscription_beneficiaryName_merchant: blebleSubscriptionMerchant.blebleBeneficiaryName,
	bleble_subscription_bleble_beneficiaryPhoneNumber_merchant: blebleSubscriptionMerchant.blebleBeneficiaryPhone,
	bleble_subscription_bleble_choosePlan_merchant: blebleSubscriptionMerchant.blebleChoosePlan,
	bleble_subscription_bleble_confirmPlan_merchant: blebleSubscriptionMerchant.confirmPlan,
	
	bleble_pay_phone_merchant: blebleMerchantPay.enterPhoneNumber,
	bleble_pay_plan_merchant: blebleMerchantPay.choosePlan,
	bleble_pay_confirm_paymentDetails_merchant: blebleMerchantPay.confirmPaymentDetails,
	bleble_pay_customAmount_merchant: blebleMerchantPay.customAmountPay,
	
	ifoh_menu_merchant: ifohMenu.main,
	
	ifoh_subscription_main_merchant: ifohSubscriptionMenu.main,
	ifoh_subscription_phoneNumber_merchant: ifohSubscriptionMenu.phoneNumber,
	ifoh_subscription_choose_fullName_merchant: ifohSubscriptionMenu.fullName,
	ifoh_subscription_choose_brithDate_merchant: ifohSubscriptionMenu.brithDate,
	ifoh_subscription_choose_beneficiary_merchant: ifohSubscriptionMenu.chooseBeneficiary.main,
	ifoh_subscription_choose_beneficiary_fullName_merchant: ifohSubscriptionMenu.chooseBeneficiary.fullName,
	ifoh_subscription_choose_beneficiary_phoneNumber_merchant: ifohSubscriptionMenu.chooseBeneficiary.phoneNumber,
	
	ifoh_pay_main_merchant: ifohPayMenu.main,
	ifoh_pay_choosePlan_merchant: ifohPayMenu.choosePlan,
	ifoh_pay_confirm_merchant: ifohPayMenu.confirm,
}

export const checkingMerchant = async (msisdn: string, updatedData: Record<string, any>) => {
	const merchantPhoneNumber = formatPhoneNumber(msisdn)
	
	if (merchantPhoneNumber.length < 10) {
		return {
			phoneNumber: merchantPhoneNumber,
			responseNotMerchant: {
				response: ussdMenuMerchant.unAuthorize.text,
				nextStep: null,
				updatedData: updatedData,
			},
			status: false,
			merchant: undefined
		}
	}
	
	const resultMerchant = await MerchantRepository.getOneByPhoneNumber(merchantPhoneNumber)
	
	return {
		phoneNumber: merchantPhoneNumber,
		responseNotMerchant: {
			response: ussdMenuMerchant.unAuthorize.text,
			nextStep: null,
			updatedData: updatedData,
		},
		status: resultMerchant.status,
		merchant: resultMerchant.data
	}
}

export default stepsMerchantHandlers