const utilitiesMaths = {
	calculateFee: (amount: number, percent: number) => {
		return (amount * percent) / 100;
	}
}

export default utilitiesMaths;