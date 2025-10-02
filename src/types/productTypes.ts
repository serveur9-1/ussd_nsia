export type ProductTypes = 'NEP' | 'BillMap' | 'EWP' | "NAF" | 'AUTRES_'
export type Action = 'SOUS' | 'Transaction' | "PAY-1-WEEK" | "PAY-1-MONTH" | "PAY-1-MONTH-FREE" | "RETR" | 'PAY-3-MONTH' | 'PAY-1-YEAR' | 'SOUS_DIS' | 'PAY-1-WEEK-DIS' | "PAY-1-MONTH-DIS" | "PAY-1-MONTH-FREE-DIS" | 'PAY-3-MONTH-DIS' | 'PAY-1-YEAR-DIS'
export type ContractStatus = | "none" | "inactive" | "terminated" | "no_balance" | "active" | "cancel" | undefined;
export type Product = "BlèBlè" | "IFOH"
export type TypeCategory = 'NEP' | 'NAF'