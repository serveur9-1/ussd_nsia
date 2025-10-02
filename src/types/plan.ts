import {Action} from "./productTypes";

export interface Plan {
	action: Action;
	amount?: number;
	autoDebit: AutoDebitConfig;
	fee: {
		type: FeeType,
		value: number
	},
	label: string
}

export interface AutoDebitConfig {
  enabled: boolean;
  frequency?: TypeFrequencyPlan;
	interval?: number
}

export type TypeFrequencyPlan = 'weekly' | 'monthly' | 'yearly'

export type FeeType = "fix" | "percent"

export type Plans = {
	"1": Plan;
	"2": Plan;
	"3": Plan;
	"4": Plan;
};