import {Plans} from "../types/plan";

export const customerPlansBleble: Plans = {
	"1": {
		label: "Par semaine",
		amount: 1500,
		fee: {
			type: 'fix',
			value: 150
		},
		autoDebit: {
			enabled: false,
			frequency: 'weekly',
			interval: 1
		},
		action: 'PAY-1-WEEK'
	},
	"2": {
		label: "Par mois (opt.1)",
		amount: 5000,
		fee: {
			type: 'fix',
			value: 250 //changed from 10% fees to 5% fees
		},
		autoDebit: {
			enabled: true,
			frequency: 'monthly',
			interval: 1
		},
		action: 'PAY-1-MONTH'
	},
	"3": {
		label: "Par mois (opt.2)",
		amount: 10000,
		fee: {
			type: 'fix',
			value: 500 //changed from 10% fees to 5% fees
		},
		autoDebit: {
			enabled: true,
			frequency: 'monthly',
			interval: 1
		},
		action: 'PAY-1-MONTH'
	},
	"4": {
		label: "Paiement libre",
		amount: undefined,
		fee: {
			type: 'percent',
			value: 5 //changed from 10% fees to 5% fees 
		},
		autoDebit: {
			enabled: false,
			frequency: 'monthly',
			interval: 1
		},
		action: 'PAY-1-MONTH-FREE'
	},
}

export const customerPlansIfoh: Omit<Plans, '4'> = {
	"1": {
		label: 'Par mois',
		fee: {
			type: 'fix',
			value: 0
		},
		amount: 1000,
		action: 'PAY-1-MONTH',
		autoDebit: {
			enabled: true,
			frequency: 'monthly',
			interval: 1
		}
	},
	"2": {
		label: 'Par trimestre',
		fee: {
			type: 'fix',
			value: 0
		},
		amount: 3000,
		action: 'PAY-3-MONTH',
		autoDebit: {
			enabled: false,
			frequency: 'monthly',
			interval: 3
		}
	},
	"3": {
		label: 'Par an',
		fee: {
			type: 'fix',
			value: 0
		},
		amount: 12000,
		action: 'PAY-1-YEAR',
		autoDebit: {
			enabled: false,
			frequency: 'yearly',
			interval: 1
		}
	}
}

export const merchantPlansBleble: Plans = {
	"1": {
		label: "Par semaine",
		amount: 1500,
		fee: {
			type: 'fix',
			value: 150
		},
		autoDebit: {
			enabled: false,
			frequency: 'weekly',
			interval: 1
		},
		action: 'PAY-1-WEEK-DIS'
	},
	"2": {
		label: "Par mois (opt.1)",
		amount: 5000,
		fee: {
			type: 'fix',
			value: 250 //changed from 10% fees to 5% fees
		},
		autoDebit: {
			enabled: true,
			frequency: 'monthly',
			interval: 1
		},
		action: 'PAY-1-MONTH-DIS'
	},
	"3": {
		label: "Par mois (opt.2)",
		amount: 10000,
		fee: {
			type: 'fix',
			value: 500 //changed from 10% fees to 5% fees
		},
		autoDebit: {
			enabled: true,
			frequency: 'monthly',
			interval: 1
		},
		action: 'PAY-1-MONTH-DIS'
	},
	"4": {
		label: "Paiement libre",
		amount: undefined,
		fee: {
			type: 'percent',
			value: 5 //changed from 10% fees to 5% fees
		},
		autoDebit: {
			enabled: false,
			frequency: 'monthly',
			interval: 1
		},
		action: 'PAY-1-MONTH-FREE-DIS'
	},
}

export const merchantPlansIfoh: Omit<Plans, '4'> = {
	"1": {
		label: 'Par mois',
		fee: {
			type: 'fix',
			value: 0
		},
		amount: 1000,
		action: 'PAY-1-MONTH-DIS',
		autoDebit: {
			enabled: true,
			frequency: 'monthly',
			interval: 1
		}
	},
	"2": {
		label: 'Par trimestre',
		fee: {
			type: 'fix',
			value: 0
		},
		amount: 3000,
		action: 'PAY-3-MONTH-DIS',
		autoDebit: {
			enabled: false,
			frequency: 'monthly',
			interval: 3
		}
	},
	"3": {
		label: 'Par an',
		fee: {
			type: 'fix',
			value: 0
		},
		amount: 12000,
		action: 'PAY-1-YEAR-DIS',
		autoDebit: {
			enabled: false,
			frequency: 'yearly',
			interval: 1
		}
	}
}

export const maxNumberRetry = 5