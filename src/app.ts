import express from "express";
import morgan from "morgan";
import ussdCustomerRoutes from "./routes/ussdCustomer.routes";
import {reqLogger} from "./utils/logger";
import ussdMerchantRoutes from "./routes/ussdMerchant.routes";
import {schedule} from "node-cron";
import processAutoDebits from "./cron/processAutoDebits";
import {notifyAutoDebits} from "./cron/notifyAutoDebits";

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

app.use(morgan(':method :url :status - :response-time ms', {stream}));
app.use(morgan(':method :url :status - :response-time ms'));

app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.set("trust proxy", true);

app.use("/mtnnsiamqash", ussdCustomerRoutes);
app.use("/mqashmtnnsiadis", ussdMerchantRoutes)

export default app;
