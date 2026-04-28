import {PaymentResponseCode} from "../types/paymentTypes";
import {Plan, Plans, TypeFrequencyPlan} from "../types/plan";
import {ContractStatus, Product} from "../types/productTypes";
import {merchantPlansBleble, merchantPlansIfoh} from "./plans";
import utilitiesDate from "../utils/date";

export const thank = "NSIA Vie ASSURANCES vous remercie"
const back = "0. Retour\n" +
	"00. Accueil"

const ussdMenuMerchant = {
	main: "NSIA Vie ASSURANCES\n1. BlèBlè\n2. IFOH\n3. Consultation de ma commission",
	bleble: {
		text: "Blèblè\n" +
			"1. Souscription\n" +
			"2. Paiement de prime\n" +
			back,
		input: "1",
		amount: 2500,
		children: {
			subscription: {
				text: "Frais d'adhésion : 2.500Fcfa pour une Épargne capitalisée sur 5 ans avec un taux d'intérêt de 3,5%.\n" +
					"1. Commencer la souscription\n" +
					back,
				input: "1",
				children: {
					phoneNumber: {
						text: "Veuillez entrer le numéro de téléphone du client\n" +
							back,
						input: "2",
						message: {
							invalide: () => ussdMenuMerchant.bleble.children.pay.message.invalide
						},
					},
					fullName: {
						text: "Entrez le nom et prénom(s) du client.\n" +
							back,
						input: "1",
						message: {
							invalide: "Nom et prénom(s) invalide. Entrez un nom et prénom(s) (ex: Jean Kouadio).\n" +
								back
						}
					},
					brithDate: {
						text: "Entrer la date de naissance du client au format: JJ/MM/AAAA.\n" +
							back,
						message: {
							invalide: "Format invalide. Entrer une date de naissance valide. Ex: 11/12/1989\n" +
								back,
							notRequired: "Désolé, le client ne remplit pas les critères pour souscrire à cette offre.\n" + thank
						}
					},
					beneficiary: {
						name: {
							text: "Entrer le nom et prénom(s) du bénéficiaire du client en cas de décès.\n" +
								back,
							message: {
								invalide: "Nom et prénom(s) invalide. Entrer le nom et prénom(s) du bénéficiaire\n" +
									back
							}
						},
						phoneNumber: {
							text: "Entrer le numéro de téléphone du bénéficiaire du client\n" +
								back,
							message: {
								invalide: "Numéro invalide. Entrez un numéro à 10 chiffres (ex: 0500000000).\n" +
									back,
								exist: (code: PaymentResponseCode) => {
									let message = ussdMenuMerchant.globalError
									
									if (code === '01') {
										message = "Le client a déjà souscrit à cette assurance.\n" + thank
									}
									
									if (code === '00') {
										message = "Le client a déjà souscrit à cette assurance. Toutefois, il peut résilier votre contrat.\n" + thank
									}
									
									if (code === '529') {
										message = "Le solde de votre compte MTN mobile Money est insuffisant.\n" + thank
									}
									
									if (code === '531') {
										message = "Désolé, vous n'avez pas de compte MoMo actif à ce numéro. Veuillez le faire avant de procéder à toute opération.\n" + thank
									}
									
									return message
								},
								success: "La demande de souscription à BlèBlè est en cours de traitement.\n" +
									"Vous allez recevoir un sms.\n" +
									"Composez *133# puis 1 et suivez les indications pour payer.\n" +
									thank
							}
						}
					}
				},
			},
			pay: {
				text: "Veuillez entrer le numéro de téléphone du client utilisé lors de sa souscription\n" +
					back,
				message: {
					invalide: "Numéro invalide. Entrez un numéro à 10 chiffres (ex: 0500000000).\n" +
						back
				},
				input: "2",
				data: {
					plans: merchantPlansBleble
				},
				children: {
					plan: {
						text: (plans: Partial<Plans>): string => {
							let result = "Choisir sa formule\n";
							
							for (const key of Object.keys(plans) as Array<keyof Plans>) {
								const plan = plans[key];
								const amountText = plan?.amount != null ? `: ${plan.amount.toLocaleString()} Fcfa` : "";
								result += `${key}. ${plan?.label}${amountText}\n`;
							}
							
							result += back;
							return result;
						},
						message: (plan: Plan) => {
							if (!plan) {
								return "Formule invalide. Choisir sa formule\n" +
									back;
							}
							
							if (plan.amount === undefined) {
								return "Entrer le montant que le client souhaite verser\n" +
									back;
							}
							
							if (plan.autoDebit) {
								return ussdMenuMerchant.bleble.children.pay.children.plan.children.choose_auto_debit_date.text()
							}
							//previously replaced
							//return `Votre demande de paiement "${plan.label.toLowerCase()}" d'un montant de ${(plan.amount + plan.fee.value).toLocaleString()}F frais inclus est en cours de traitement. Vous allez recevoir un sms.\nComposez *133# puis 1 et suivez les indications pour payer.`;
							return `Votre demande de paiement de ${plan.amount.toLocaleString()}F, frais: ${plan.fee.value.toLocaleString()} F, Total: ${(plan.amount + plan.fee.value).toLocaleString()} F est en cours de traitement, Vous recevrez un message pour effectuer le paiement des frais`;
						},
						messages: {
							unsubscribe: (product: Product) => `Le client ne dispose pas de contrat ${product}. Veuillez procéder à une souscription.\n${thank}`,
							alreadySubscribe: "Le client a déjà souscrit à cette Assurance. Toutefois il peut résilier son contrat."
						},
						children: {
							choose_auto_debit_date: {
								text: () => {
									const chooses = ussdMenuMerchant.bleble.children.pay.children.plan.children.choose_auto_debit_date.chooses
									const intro = "Sélectionner l’option de prélèvement automatique du client :"
									
									const options = chooses.map(choose => `${choose.input}. ${choose.dayOnMonth ? `Pour le ${choose.dayOnMonth}` : "Pas de prélèvement automatique"}`).join("\n")
									
									return `${intro}\n${options}\n${back}`
								},
								message: {
									invalide: () => ussdMenuMerchant.chooseInvalide + ussdMenuMerchant.bleble.children.pay.children.plan.children.choose_auto_debit_date.text()
								},
								chooses: [
									{
										input: "1",
										dayOnMonth: 5
									},
									{
										input: "2",
										dayOnMonth: 16
									},
									{
										input: "3",
										dayOnMonth: 30
									},
									{
										input: "4",
										dayOnMonth: undefined
									},
								]
							},
							confirm: {
								input: "1",
								text: (plan: Plan) => {
									const total = Number(plan.amount) + plan.fee.value;
									
									let autoDebitInfo = "Par prélèvement automatique du 01er au 05 du mois";
									
									if (plan.autoDebit.enabled) {
										const {frequency, interval} = plan.autoDebit;
										
										const nextDate = utilitiesDate.getNextPaymentDate({
											interval,
											frequency: frequency as TypeFrequencyPlan,
										});
										
										autoDebitInfo = `Prochain prélèvement le ${nextDate}.\nLe client doit d'assurer d'avoir au moins ${total.toLocaleString()} Fcfa sur votre compte MTN MoMo.`;
									}
									
									return `Formule: ${plan.label}\nMontant: ${total.toLocaleString()} Fcfa\n${autoDebitInfo}\n1. Confirmer\n${back}`;
								},
								message: {
									//previously replaced
									//success: (plan: Plan) => `Votre demande de paiement "${plan.label.toLowerCase()}" d'un montant de ${((plan?.amount || 0) + plan.fee.value).toLocaleString()} Fcfa est en cours de traitement. Vous allez recevoir un sms. Composez *133# puis 1 et suivez les indications pour payer.`,
									success: (plan: Plan) => `Votre demande de paiement de ${(plan.amount || 0).toLocaleString()}F, frais: ${plan.fee.value.toLocaleString()} F, Total: ${((plan.amount || 0) + plan.fee.value).toLocaleString()} F est en cours de traitement, Vous recevrez un message pour effectuer le paiement des frais`,
									invalide: (plan: Plan) => `${ussdMenuMerchant.chooseInvalide}${ussdMenuMerchant.bleble.children.pay.children.plan.children.confirm.text(plan)}`,
									notArrive: (date: string) => `Le prochain paiement ne peut intervenir avant le ${date}\n${thank}`
								}
							}
						}
					},
					custom_amount: {
						text: "Entrer le montant que le client souhaitez verser\n" +
							back,
						message: {
							invalide: () => `Montant invalide. Entrez un montant valide (min ${(ussdMenuMerchant.bleble.children.pay.children.custom_amount.minAmount).toLocaleString()} FCFA)\n${back}`,
						},
						minAmount: 100
					}
				},
			},
			checkContract: {
				text: () => ussdMenuMerchant.bleble.children.pay.text,
				input: "3",
				message: (result: { status: ContractStatus; balance?: number, product?: Product, date?: string }) => {
					let response = "";
					
					switch (result.status) {
						case "none":
							return `Vous n'avez pas de contrat ${result?.product ? result.product : 'Blèblè'} en cours, merci de souscrire.\n${thank}`;
						case "inactive":
							return result.date ? `Votre souscription à ${result.product} est inactive depuis le ${result.date}. Merci de régler votre prime pour continuer à bénéficier de la couverture.\n${thank}` :
								"Votre souscription à BlèBlè est inactive, merci de régler votre prime.\n" +
								thank;
						case "terminated":
							return "Vous avez déjà souscrit à cette Assurance. Toutefois vous avez résilié votre contrat.\nInfos: 22419800, " + thank;
						case "no_balance":
							return "Vous avez un contrat BlèBlè en cours dont le solde est nul, veuillez procéder à votre première cotisation.\n" +
								thank;
						case "active":
							return result.date ? `Votre souscription à ${result.product} est active jusqu'au ${result.date}. Vous bénéficiez d'une couverture de 250.000 Fcfa en cas de décès de la personne assurée.\n${thank}` :
								`Vous avez un contrat BlèBlè en cours dont le solde est ${result.balance}F.\n${thank}`;
						case "cancel":
							return `Votre contrat a ${result.product} bien été résilié.\n${thank}`;
					}
					
					return response
				},
				children: {
					brithDate: {
						text: "Entrer la date de naissance utilisée lors de la souscription au format : JJ/MM/AAAA\n" +
							back,
						message: () => ussdMenuMerchant.bleble.children.subscription.children.brithDate.message
					}
				}
			},
			partialWithdraw: {
				input: "4",
				text: "Vous devez effectuer 12 mois de cotisations et avoir épargné au moins 60.000F\n" +
					"1. Continuer\n" +
					back,
				message: {
					exist: "Vous avez déjà souscrit à cette Assurance. Toutefois vous avez résilié votre contrat.\n" +
						"Infos: 22419800, " + thank,
					invalide: () => ussdMenuMerchant.bleble.children.checkContract.message({
						status: 'none'
					})
				},
				children: {
					continue: {
						input: "1",
						text: (balance?: number, amountCanWithdraw?: number) => {
							if (balance && amountCanWithdraw) {
								return `Vous avez un contrat BlèBlè dont le solde est de ${balance} Fcfa. Vous pouvez retirer jusqu'à ${amountCanWithdraw.toLocaleString()} Fcfa.\n1. Continuer\n${back}`
							}
							
							if (balance && !amountCanWithdraw) {
								return `Vous avez un contrat BlèBlè dont le solde est ${balance.toLocaleString()} Fcfa.\n1. Confirmer le rachat total\n${back}`
							}
							
							return ussdMenuMerchant.bleble.children.partialWithdraw.text
						},
						message: {
							invalide: () => {
								const message = ussdMenuMerchant.bleble.children.partialWithdraw.text
								return `${ussdMenuMerchant.chooseInvalide}${message}`
							}
						}
					},
					phoneNumber: {
						text: () => ussdMenuMerchant.bleble.children.pay.text,
						message: {
							invalide: () => ussdMenuMerchant.bleble.children.pay.message.invalide,
						},
					},
					brithDate: () => ussdMenuMerchant.bleble.children.checkContract.children.brithDate,
					amount: {
						text: "Entrer le montant que vous souhaitez retirer\n" +
							back,
						message: {
							invalide: "Montant invalide. Veuillez entrer un montant valide.\n" +
								back,
							maxAmount: (amount: number) => `Montant invalide. Vous devez retirer un montant inférieur ou égal à ${amount.toLocaleString()} Fcfa.\n${thank}`,
							exist: (date: string) => `Vous ne pouvez pas effectuer de rachat partiel avant 1 an de cotisation effective. Date de souscription: ${date}. Un rachat partiel par an.\n${thank}`,
							success: (amount: number) => `Vous avez retiré ${amount.toLocaleString()} Fcfa. Le dépôt sera fait dans 15 jours.\nInfos: 22419800, ${thank}`
						}
					}
				}
			},
			totalWithdraw: {
				input: "5",
				text: () => ussdMenuMerchant.bleble.children.partialWithdraw.text,
				message: () => ussdMenuMerchant.bleble.children.partialWithdraw.message,
				children: () => {
					const {amount, ...children} = ussdMenuMerchant.bleble.children.partialWithdraw.children
					
					return {
						...children,
						confirm: () => {
							return {
								...ussdMenuMerchant.bleble.children.partialWithdraw.children.continue,
								message: {
									...ussdMenuMerchant.bleble.children.partialWithdraw.children.continue.message,
									success: (amount: number) => ussdMenuMerchant.bleble.children.partialWithdraw.children.amount.message.success(amount),
									exist: "Vous ne pouvez pas effectuer de rachat partiel avant 1 an de cotisation effective.\n" + thank
								}
							}
						}
					}
				}
			},
			pointList: {
				input: "6",
			}
		}
	},
	ifoh: {
		input: "2",
		text: "IFOH\n" +
			"1. Souscription\n" +
			"2. Paiement de prime\n" +
			back,
		messages: {
			invalide: () => `${ussdMenuMerchant.chooseInvalide}\n${ussdMenuMerchant.ifoh.text}`
		},
		children: {
			subscription: {
				input: "1",
				text: "Adhésion 1.000F et payez 1.000F/mois pour bénéficier de 250.000F en cas de décès de l'assuré associé.\n" +
					"1. Commencer la souscription\n" +
					back,
				message: {
					invalide: () => ussdMenuMerchant.bleble,
				},
				children: {
					phoneNumber: () => ussdMenuMerchant.bleble.children.subscription.children.phoneNumber,
					fullName: () => ussdMenuMerchant.bleble.children.subscription.children.fullName,
					brithDate: () => ussdMenuMerchant.bleble.children.subscription.children.brithDate,
					beneficiary: {
						text: () => {
							const header = "Désignez l'assuré secondaire du client :"
							
							const text = ussdMenuMerchant.ifoh.children.subscription.children.beneficiary.chooses.map(choose => `${choose.input}. ${choose.text}`).join("\n")
							
							return `${header}\n${text}\n${back}`
						},
						messages: {
							invalide: () => `${ussdMenuMerchant.chooseInvalide}${ussdMenuMerchant.ifoh.children.subscription.children.beneficiary.text()}`
						},
						chooses: [
							{
								text: "Conjoint(e) (18-64 ans)",
								label: "assuré(e) associé(e)",
								key: "Conjoint",
								input: "1",
								condition: (age: number) => {
									return age >= 18 && age <= 64
								}
							},
							{
								text: "Père/Mère biologique (18-79 ans)",
								label: "assuré(e) associé(e)",
								key: "Pere_Mere",
								input: "2",
								condition: (age: number) => {
									return age >= 18 && age <= 64
								}
							},
							{
								text: "Enfant biologique (12-21 ans)",
								label: "assuré(e) associé(e)",
								key: "Enfant",
								input: "3",
								condition: (age: number) => {
									return age >= 18 && age <= 64
								}
							},
						],
						children: {
							fullName: () => {
								return {
									...ussdMenuMerchant.ifoh.children.subscription.children.fullName(),
									text: (choose: {
										label: string;
									}) => `Entrer le nom et prénom(s) de l'${choose.label}\n${back} du client`
								}
							},
							phoneNumber: () => {
								const data = ussdMenuMerchant.bleble.children.subscription.children.beneficiary.phoneNumber
								return {
									...data,
									message: {
										...data.message,
										success: "Votre demande de souscription à Ifoh est en cours de traitement. Vous allez recevoir un SMS. Composez *133# puis 1 et suivez les indications pour payer."
									}
								}
							},
						}
					}
				}
			},
			pay: () => {
				const bleblePay = ussdMenuMerchant.bleble.children.pay
				
				return {
					...bleblePay,
					data: {
						...bleblePay.data,
						plans: merchantPlansIfoh
					},
				}
			},
			checkCoverage: {
				input: "3",
				text: ""
			},
			cancelContract: {
				input: "4",
				children: {
					agree: {
						input: "1",
						text: "Vous perdrez la couverture ainsi que tous les paiements.\n" +
							"1. Continuer\n" +
							back,
						messages: {
							invalide: () => `${ussdMenuMerchant.chooseInvalide}${ussdMenuMerchant.ifoh.children.cancelContract.children.agree.text}`
						}
					},
					phoneNumber: {
						text: () => ussdMenuMerchant.bleble.children.pay.text,
						message: {
							invalide: () => ussdMenuMerchant.bleble.children.pay.message.invalide,
						},
					},
					brithDate: () => ussdMenuMerchant.bleble.children.checkContract.children.brithDate,
				},
				messages: {
					validation: (result: { status: ContractStatus; balance?: number, product?: Product, date?: string }) => {
						return ussdMenuMerchant.bleble.children.checkContract.message(result)
					}
				}
			},
			informations: {
				text: "Informations sur le produit\n" +
					"1. Liste des dossiers à présenter au siège de NSIA ASSURANCES Vie en cas de décès\n" +
					"2. Liste des points agréés\n" +
					back,
				input: "5",
				messages: {
					invalide: () => `${ussdMenuMerchant.chooseInvalide}${ussdMenuMerchant.ifoh.children.informations.text}`,
				},
				children: {
					required: {
						input: "1",
						text: "Liste des dossiers:\n" +
							"- Actes de naissance originaux (souscripteur et défunt(e)\n" +
							"- Photocopies des CNIs (souscripteur et défunt(e))\n" +
							"- Original de l’acte de décès\n" +
							"Infos: 20319898. " + thank
					},
					approvedPoint: {
						input: "2"
					}
				}
			}
		}
	},
	checkCommission: {
		input: "3",
		messages: {
			notMerchant: () => ussdMenuMerchant.unAuthorize,
			commission: (commission: number) => "Le total de votre commission à date est de " + commission.toLocaleString() + " Fcfa.\n" + thank
		}
	},
	chooseInvalide: "Choix invalide. ",
	globalError: "Une erreur est survenue. Veuillez reprendre la sessions.\n" + thank,
	thankContact: "Nous vous remercions de prendre contact avec nous au 22419800 ou au 20319898.\n" + thank,
	unAuthorize: {
		text: "Désolé, vous n'êtes pas reconnu comme étant distributeur ou commercial.\n" + thank,
	}
}

export default ussdMenuMerchant