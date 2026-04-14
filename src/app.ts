import express from "express";
import morgan from "morgan";
import ussdCustomerRoutes from "./routes/ussdCustomer.routes";
import {reqLogger} from "./utils/logger";
import ussdMerchantRoutes from "./routes/ussdMerchant.routes";
import {schedule} from "node-cron";
import processAutoDebits from "./cron/processAutoDebits";
import {notifyAutoDebits} from "./cron/notifyAutoDebits";
import processExternalSubscriptionSync from "./cron/processExternalSubscriptionSync";
import processExternalEvoOperations from "./cron/processExternalEvoOperations";

const app = express();

const stream = {
	write: (message: string) => {
		reqLogger.info(message.trim());
	},
};

schedule('* * * * *', async () => {
	await notifyAutoDebits()
	await processAutoDebits()
});

// Sync file d'attente prestataire en fin de journée (23:59)
schedule('59 23 * * *', async () => {
	await processExternalSubscriptionSync();
	await processExternalEvoOperations();
});

app.use(morgan(':method :url :status - :response-time ms', {stream}));
app.use(morgan(':method :url :status - :response-time ms'));

app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.set("trust proxy", true);

app.use("/mtnnsiamqash", ussdCustomerRoutes);
app.use("/mqashmtnnsiadis", ussdMerchantRoutes)

export default app;
