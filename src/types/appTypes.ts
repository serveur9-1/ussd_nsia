export interface ResponseService<Data = undefined> {
	status: boolean,
	data?: Data
}

export interface Step<Data = Record<string, any>> {
	sessionId?: string,
	input: string,
	data: Data,
}

export type StepFunction = Step & {
	current: string;
	nextStep: string;
	text?: string
}

export type TimeUnit = "DAY" | "MONTH" | "YEAR"