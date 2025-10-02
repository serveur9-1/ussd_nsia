import {mainMenu} from "./mainMenu";
import {blebleMenu} from "./bleble/blebleMenu";
import bleblePartialWithdraw from "./bleble/bleblePartialWithdraw";
import blebleTotalWithdraw from "./bleble/blebleTotalWithdraw";
import {approvedPoints} from "./approvedPoints";
import checkContract from "./bleble/checkContract";
import ifohMenu from "./ifoh/ifohMenu";
import ifohSubscriptionMenu from "./ifoh/ifohSubscription";
import ifohPayMenu from "./ifoh/ifohPayMenu";
import ifohCheckCoverage from "./ifoh/ifohCheckCoverage";
import ifohCancelContractMenu from "./ifoh/ifohCancelContractMenu";
import ifohInformationsMenu from "./ifoh/ifohInformationsMenu";
import otherProductsMenu from "./otherProductsMenu";
import blebleCustomerPay from "./bleble/blebleCustomerPay";
import blebleCustomerSubscription from "./bleble/blebleCustomerSubscription";

const stepsCustomerHandlers: Record<string, (sessionid: string, input: string, data: Record<string, any>, req: Record<string, any>) => Promise<{
	response: string;
	nextStep: string | null;
	updatedData: Record<string, any>;
}>> = {
	main_menu_customer: mainMenu,
	
	bleble_menu_customer: blebleMenu,
	
	bleble_subscription_start_customer: blebleCustomerSubscription.blebleSubscriptionStart,
	bleble_subscription_full_name_customer: blebleCustomerSubscription.blebleFullName,
	bleble_subscription_birth_date_customer: blebleCustomerSubscription.blebleBirthDate,
	bleble_subscription_beneficiary_name_customer: blebleCustomerSubscription.blebleBeneficiaryName,
	bleble_subscription_bleble_beneficiary_phone_customer: blebleCustomerSubscription.blebleBeneficiaryPhone,
	bleble_subscription_bleble_choosePlan_customer: blebleCustomerSubscription.blebleChoosePlan,
	bleble_subscription_bleble_confirmPlan_customer: blebleCustomerSubscription.confirmPlan,
	
	bleble_pay_phone_customer: blebleCustomerPay.enterPhoneNumber,
	bleble_pay_plan_customer: blebleCustomerPay.choosePlan,
	bleble_pay_confirm_payment_details_customer: blebleCustomerPay.confirmPaymentDetails,
	bleble_pay_custom_amount_customer: blebleCustomerPay.customAmountPay,
	
	bleble_check_contract_phoneNumber_customer: checkContract.phoneNumber,
	bleble_check_contract_brithDate_customer: checkContract.brithDate,
	
	bleble_partial_withdraw_start_customer: bleblePartialWithdraw.start,
	bleble_partial_withdraw_phoneNumber_customer: bleblePartialWithdraw.phoneNumber,
	bleble_partial_withdraw_brithDate_customer: bleblePartialWithdraw.brithDate,
	bleble_partial_withdraw_continue_customer: bleblePartialWithdraw.continue,
	bleble_partial_withdraw_amount_customer: bleblePartialWithdraw.amount,
	
	bleble_total_withdraw_start_customer: blebleTotalWithdraw.start,
	bleble_total_withdraw_phoneNumber_customer: blebleTotalWithdraw.phoneNumber,
	bleble_total_withdraw_brithDate_customer: blebleTotalWithdraw.brithDate,
	bleble_total_withdraw_confirm_customer: blebleTotalWithdraw.confirm,
	
	approved_points_customer: approvedPoints,
	
	ifoh_menu_customer: ifohMenu.main,
	
	ifoh_subscription_main_customer: ifohSubscriptionMenu.main,
	ifoh_subscription_choose_fullName_customer: ifohSubscriptionMenu.fullName,
	ifoh_subscription_choose_brithDate_customer: ifohSubscriptionMenu.brithDate,
	ifoh_subscription_choose_beneficiary_customer: ifohSubscriptionMenu.chooseBeneficiary.main,
	ifoh_subscription_choose_beneficiary_fullName_customer: ifohSubscriptionMenu.chooseBeneficiary.fullName,
	ifoh_subscription_choose_beneficiary_phoneNumber_customer: ifohSubscriptionMenu.chooseBeneficiary.phoneNumber,
	
	ifoh_pay_main_customer: ifohPayMenu.main,
	ifoh_pay_choosePlan_customer: ifohPayMenu.choosePlan,
	ifoh_pay_confirm_customer: ifohPayMenu.confirm,
	
	ifoh_checkCoverage_main_customer: ifohCheckCoverage.main,
	ifoh_checkCoverage_brithDate_customer: ifohCheckCoverage.brithDate,
	
	ifoh_cancelContract_agree_customer: ifohCancelContractMenu.agree,
	ifoh_cancelContract_phoneNumber_customer: ifohCancelContractMenu.phoneNumber,
	ifoh_cancelContract_brithDate_customer: ifohCancelContractMenu.brithDate,
	
	ifoh_informations_main_customer: ifohInformationsMenu.main,
	
	otherProducts_main_customer: otherProductsMenu.main,
	otherProducts_pay_customer: otherProductsMenu.pay
}

export default stepsCustomerHandlers