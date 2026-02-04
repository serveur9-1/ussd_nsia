import {PaymentResponseCode} from "../types/paymentTypes";
import {Plan, Plans, TypeFrequencyPlan} from "../types/plan";
import {ContractStatus, Product} from "../types/productTypes";
import {customerPlansBleble, customerPlansIfoh} from "./plans";
import {NsiaAutresProduits} from "../types/models/nsiaAutresProduits";
import utilitiesDate from "../utils/date";

export const thank = "NSIA Vie ASSURANCES vous remercie."
const back = "0. Retour\n" +
	"00. Accueil"

const ussdMenuCustomer = {
	main: "NSIA Vie ASSURANCES\n1. BlèBlè\n2. IFOH\n3. AUTRE PRODUITS NSIA ASSURANCES VIE",
	bleble: {
		text: "Blèblè\n" +
			"1. Souscrire\n" +
			"2. Payer ma prime\n" +
			"3. Consulter mon contrat\n" +
			"4. Rachat partiel \n" +
			"5. Rachat total / Échu\n" +
			"6. Liste des points agrées produits\n" +
			back,
		input: "1",
		amount: 2500,
		children: {
			subscription: {
				text: "Frais d'adhésion : 2.500Fcfa pour une Épargne capitalisée sur 5 ans avec un taux d'intérêt de 3,5%.\n" +
					"1. Souscrire\n" +
					back,
				input: "1",
				children: {
					fullName: {
						text: "Entrez votre nom et prénom(s).\n" +
							back,
						input: "1",
						message: {
							invalide: "Nom et prénom(s) invalide. Entrez un nom et prénom(s) (ex: Jean Kouadio).\n" +
								back
						}
					},
					brithDate: {
						text: "Entrer votre date de naissance au format: JJ/MM/AAAA.\n" +
							back,
						message: {
							invalide: "Format invalide. Entrer votre date de naissance. Ex: 11/12/1989\n" +
								back,
							notRequired: "Désolé, Vous ne remplissez pas les critères pour souscrire à cette offre.\n" + thank
						}
					},
					beneficiary: {
						name: {
							text: "Entrer le nom et le prénom de votre bénéficiaire en cas de décès.\n" +
								back,
							message: {
								invalide: "Nom invalide. Entrer le nom et le prénom(s) de votre bénéficiaire\n" +
									back
							}
						},
						phoneNumber: {
							text: "Entrer le numéro de téléphone de votre bénéficiaire\n" +
								back,
							message: {
								invalide: "Numéro invalide. Entrez un numéro à 10 chiffres (ex: 0500000000).\n" +
									back,
								exist: (code: PaymentResponseCode) => {
									let message = ussdMenuCustomer.globalError
									
									if (code === '01') {
										message = "Vous avez déjà souscrit à cette Assurance.\n" +
											thank
									}
									
									if (code === '00') {
										message = "Vous avez déjà souscrit à cette assurance. Toutefois, vous avez résilié votre contrat.\n" +
											thank
									}
									
									if (code === '529') {
										message = "Cher Assuré(e), votre solde MTN mobile Money est insuffisant.\n" +
											thank
									}
									
									if (code === '531') {
										message = "Désolé, Vous n avez pas de compte MoMo actif à ce numéro. Veuillez le faire avant de procéder à toute opération.\n" +
											thank
									}
									
									return message
								},
								success: "Votre demande de souscription à BlèBlè est en cours de traitement.\n" +
									"Vous allez recevoir un sms.\n" +
									"Composez *133# puis 1 et suivez les indications pour payer."
							}
						}
					}
				},
			},
			pay: {
				text: "Veuillez entrer le numéro de téléphone utilisé lors de la souscription\n" +
					back,
				message: {
					invalide: "Numéro invalide. Entrez un numéro à 10 chiffres (ex: 0500000000).\n" +
						back
				},
				input: "2",
				data: {
					plans: customerPlansBleble
				},
				children: {
					plan: {
						text: (plans: Partial<Plans>): string => {
							let result = "Choisir sa formule\n";
							
							for (const key of Object.keys(plans) as Array<keyof Plans>) {
								const plan = plans[key];
								const amountText = plan?.amount != null ? `: ${plan?.amount.toLocaleString()} Fcfa` : "";
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
								return "Entrer le montant que vous souhaitez verser\n" +
									back;
							}
							
							if (plan.autoDebit.enabled) {
								return ussdMenuCustomer.bleble.children.pay.children.plan.children.confirm.text(plan)
							}						
							// previously replaced
							//return `Votre demande de paiement "${plan.label.toLowerCase()}" d'un montant de ${(plan.amount + plan.fee.value).toLocaleString()}F frais inclus est en cours de traitement. Vous allez recevoir un sms.\nComposez *133# puis 1 et suivez les indications pour payer.`;
							return `Votre demande de paiement de ${plan.amount.toLocaleString()}F, frais: ${plan.fee.value.toLocaleString()} F, Total: ${(plan.amount + plan.fee.value).toLocaleString()} F est en cours de traitement, Vous recevrez un message pour effectuer le paiement des frais`;
						},
						messages: {
							unsubscribe: (product: Product) => `Veuillez d'abord souscrire à une assurance ${product}.\n${thank}`,
							alreadySubscribe: "Vous avez déjà souscrit à cette Assurance. Toutefois vous avez résilié votre contrat."
						},
						children: {
							choose_auto_debit_date: {
								text: "Restez serein en optant pour le prélèvement automatique. Sélectionnez le jour du mois qui vous convient\n" +
									"1. Pour le 5\n" +
									"2. Pour le 16\n" +
									"3. Pour le 30\n" +
									"4. Pas de prélèvement automatique\n" +
									back,
								message: {
									invalide: () => ussdMenuCustomer.chooseInvalide + ussdMenuCustomer.bleble.children.pay.children.plan.children.choose_auto_debit_date.text
								}
							},
							confirm: {
								input: "1",
								text: (plan: Plan) => {
									const total = Number(plan.amount) + plan.fee.value;
									
									let autoDebitInfo = "Sans prélèvement automatique";
									
									if (plan.autoDebit.enabled) {
										const {frequency, interval} = plan.autoDebit;
										
										const nextDate = utilitiesDate.getNextPaymentDate({
											interval,
											frequency: frequency as TypeFrequencyPlan,
										});
										
										autoDebitInfo = `Prochain prélèvement le ${nextDate}.\nMaintanance in progress... Please be patient  ${total.toLocaleString()} Fcfa sur votre compte MTN MoMo.`;
									}
									
									return `Formule: ${plan.label}\nMontant: ${total.toLocaleString()} Fcfa\n${autoDebitInfo}\n1. Confirmer\n${back}`;
								},
								message: {
									//previously replaced
									//success: (plan: Plan) => `Votre demande de paiement "${plan.label.toLowerCase()}" d'un montant de ${((plan?.amount || 0) + plan.fee.value).toLocaleString()} Fcfa est en cours de traitement. Vous allez recevoir un sms. Composez *133# puis 1 et suivez les indications pour payer.`,
									success: (plan: Plan) => `Votre demande de paiement de ${(plan.amount || 0).toLocaleString()}F, frais: ${plan.fee.value.toLocaleString()} F, Total: ${((plan.amount || 0) + plan.fee.value).toLocaleString()} F est en cours de traitement, Vous recevrez un message pour effectuer le paiement des frais`,
									invalide: (plan: Plan) => `${ussdMenuCustomer.chooseInvalide}${ussdMenuCustomer.bleble.children.pay.children.plan.children.confirm.text(plan)}`,
									notArrive: (date: string) => `Votre prochain paiement ne peut intervenir avant le ${date}\n${thank}`
								}
							}
						}
					},
					custom_amount: {
						text: "Entrer le montant que vous souhaitez verser\n" +
							back,
						message: {
							invalide: `Montant invalide. Entrez un montant valide (min ${(100).toLocaleString()} FCFA)\n${back}`,
						}
					}
				},
			},
			checkContract: {
				text: () => ussdMenuCustomer.bleble.children.pay.text,
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
								`Vous avez un contrat BlèBlè en cours dont le solde est ${(result.balance)?.toLocaleString()}F.\n${thank}`;
						case "cancel":
							return `Votre contrat a ${result.product} bien été résilié.\n${thank}`;
					}
					
					return response
				},
				children: {
					brithDate: {
						text: "Entrer la date de naissance utilisée lors de la souscription au format : JJ/MM/AAAA\n" +
							back,
						message: () => ussdMenuCustomer.bleble.children.subscription.children.brithDate.message
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
					invalide: () => ussdMenuCustomer.bleble.children.checkContract.message({
						status: 'none'
					})
				},
				children: {
					continue: {
						input: "1",
						text: (balance?: number, amountCanWithdraw?: number) => {
							if (balance && amountCanWithdraw) {
								return `Vous avez un contrat BlèBlè dont le solde est de ${balance?.toLocaleString()} Fcfa. Vous pouvez retirer jusqu'à ${amountCanWithdraw.toLocaleString()} Fcfa.\n1. Continuer\n${back}`
							}
							
							if (balance && !amountCanWithdraw) {
								return `Vous avez un contrat BlèBlè dont le solde est ${balance?.toLocaleString()} Fcfa.\n1. Confirmer le rachat total\n${back}`
							}
							
							return ussdMenuCustomer.bleble.children.partialWithdraw.text
						},
						message: {
							invalide: () => {
								const message = ussdMenuCustomer.bleble.children.partialWithdraw.text
								return `${ussdMenuCustomer.chooseInvalide}${message}`
							}
						}
					},
					phoneNumber: {
						text: () => ussdMenuCustomer.bleble.children.pay.text,
						message: {
							invalide: () => ussdMenuCustomer.bleble.children.pay.message.invalide,
						},
					},
					brithDate: () => ussdMenuCustomer.bleble.children.checkContract.children.brithDate,
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
				text: () => ussdMenuCustomer.bleble.children.partialWithdraw.text,
				message: () => ussdMenuCustomer.bleble.children.partialWithdraw.message,
				children: () => {
					const {amount, ...children} = ussdMenuCustomer.bleble.children.partialWithdraw.children
					
					return {
						...children,
						confirm: () => {
							return {
								...ussdMenuCustomer.bleble.children.partialWithdraw.children.continue,
								message: {
									...ussdMenuCustomer.bleble.children.partialWithdraw.children.continue.message,
									success: (amount: number) => ussdMenuCustomer.bleble.children.partialWithdraw.children.amount.message.success(amount),
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
			"1. Souscrire\n" +
			"2. Payer ma prime\n" +
			"3. Consulter ma couverture\n" +
			"4. Résilier mon contrat\n" +
			"5. Informations\n" +
			back,
		messages: {
			invalide: () => `${ussdMenuCustomer.chooseInvalide}\n${ussdMenuCustomer.ifoh.text}`
		},
		children: {
			subscription: {
				input: "1",
				text: "Adhésion 1.000F et payez 1.000F/mois pour bénéficier de 250.000F en cas de décès de votre assuré associé.\n" +
					"1. Souscrire\n" +
					back,
				message: {
					invalide: () => ussdMenuCustomer.bleble,
				},
				children: {
					fullName: () => ussdMenuCustomer.bleble.children.subscription.children.fullName,
					brithDate: () => ussdMenuCustomer.bleble.children.subscription.children.brithDate,
					beneficiary: {
						text: "Désignez votre assuré secondaire :\n" +
							"1. Conjoint(e) (18-64 ans)\n" +
							"2. Père/Mère biologique (18-79 ans)\n" +
							"3. Enfant biologique (12-21 ans)\n" +
							back,
						messages: {
							invalide: () => `${ussdMenuCustomer.chooseInvalide}${ussdMenuCustomer.ifoh.children.subscription.children.beneficiary.text}`
						},
						chooses: [
							{
								label: "assuré(e) associé(e)",
								key: "Conjoint",
								input: "1",
								condition: (age: number) => {
									return age >= 18 && age <= 64
								}
							},
							{
								label: "assuré(e) associé(e)",
								key: "Pere_Mere",
								input: "2",
								condition: (age: number) => {
									return age >= 18 && age <= 64
								}
							},
							{
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
									...ussdMenuCustomer.ifoh.children.subscription.children.fullName(),
									text: (choose: { label: string; }) => `Entrer le nom et prénom(s) de votre ${choose.label}\n${back}`
								}
							},
							phoneNumber: () => {
								const data = ussdMenuCustomer.bleble.children.subscription.children.beneficiary.phoneNumber
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
				const bleblePay = ussdMenuCustomer.bleble.children.pay
				
				return {
					...bleblePay,
					data: {
						...bleblePay.data,
						plans: customerPlansIfoh
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
							invalide: () => `${ussdMenuCustomer.chooseInvalide}${ussdMenuCustomer.ifoh.children.cancelContract.children.agree.text}`
						}
					},
					phoneNumber: {
						text: () => ussdMenuCustomer.bleble.children.pay.text,
						message: {
							invalide: () => ussdMenuCustomer.bleble.children.pay.message.invalide,
						},
					},
					brithDate: () => ussdMenuCustomer.bleble.children.checkContract.children.brithDate,
				},
				messages: {
					validation: (result: { status: ContractStatus; balance?: number, product?: Product, date?: string }) => {
						return ussdMenuCustomer.bleble.children.checkContract.message(result)
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
					invalide: () => `${ussdMenuCustomer.chooseInvalide}${ussdMenuCustomer.ifoh.children.informations.text}`,
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
	otherProducts: {
		input: "3",
		children: {
			police: {
				text: "Veuillez entrer votre numéro de police\n" + back,
				messages: () => {
					const messages = ussdMenuCustomer.bleble.children.pay.message
					
					return {
						...messages,
						notInvoice: "Vous n'avez pas de facture en attente de paiement!\n" + thank
					}
				}
			},
			pay: {
				input: "1",
				text: (products: NsiaAutresProduits[]) => {
					let p = "";
					let periods = "";
					let totalAmount = 0;
					
					for (let i = 0; i < products.length; i++) {
						const obj = products[i];
						totalAmount += parseInt(obj.Montant, 10);
						
						if (i === 0) {
							p += obj.Nom_produit;
							periods += obj.Periode_facture;
						} else {
							p += ", " + obj.Nom_produit;
							periods += ", " + obj.Periode_facture;
						}
					}
					
					return {
						text: `Le total de vos factures impayées ${p} est de ${totalAmount} Fcfa.\n1. Payer\n${back}`,
						products: p,
						periods,
						totalAmount
					}
				},
				messages: {
					invalide: (products: NsiaAutresProduits[]) => `${ussdMenuCustomer.chooseInvalide}${ussdMenuCustomer.otherProducts.children.pay.text(products)}`,
				}
			}
		}
	},
	chooseInvalide: "Choix invalide. ",
	globalError: "Une erreur est survenue. Veuillez reprendre la sessions.\n" + thank,
	thankContact: "Nous vous remercions de prendre contact avec nous au 22419800/20319898.\n" + thank
}

export default ussdMenuCustomer