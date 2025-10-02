import {Request, Response} from "express";
import FactureRepository from "../../repositories/factureRepository";

export default async function getBillController(req: Request, res: Response) {
	try {
		res.setHeader("Content-Type", "application/json; charset=utf-8");
		
		const referenceOne = (req.query.Reference || req.body.Reference) as string;
		const msisdn = (req.query.MSISDN || req.body.MSISDN) as string;
		
		if (!referenceOne) {
			return res.status(400).json({error: "Reference is required"});
		}
		
		const reference = referenceOne.replace("Â§", "_");
		console.log("reference ====>", reference, "msisdn ====>", msisdn);
		
		const bills = [
			{Reference: reference, Amount: "1"},
			{Reference: reference, Amount: "1000000"},
		];
		
		return res.json({Bills: bills});
	} catch (error) {
		console.error("Error in /getBill:", error);
		return res.status(500).json({error: "Internal Server Error"});
	}
}
