import app from "./app";
import dotenv from "dotenv";

dotenv.config();

const port = process.env.PORT || 8080;

app.listen(Number(port), '0.0.0.0', () => {
	console.log(`✅ USSD server en écoute sur http://localhost:${port}`);
});
