import {Request, Response} from "express";
import FactureRepository from "../../repositories/factureRepository";

export default async function getBillController(req: Request, res: Response) {
	res.setHeader("Content-Type", "application/json; charset=utf-8");
	res.setHeader("Access-Control-Allow-Origin", "https://billmap.mtn.ci:8443/");
	res.setHeader("Access-Control-Allow-Methods", "GET, POST");
	
	try {
		const data = {...req.query, ...req.body};
		
		let referenceOne = String(data.Reference || "");
		const reference = referenceOne.replace("Â§", "_");
		
		const bills = await FactureRepository.getFactures(reference)
		
		res.json(bills);
	} catch (err) {
		console.error("Erreur getBill :", err);
		res.status(500).json({error: "Erreur interne du serveur"});
	}
}
