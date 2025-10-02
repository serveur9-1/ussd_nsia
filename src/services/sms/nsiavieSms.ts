import {NsiaVieFormData} from "../../types/sms";
import axios from "axios";
import {ResponseService} from "../../types/appTypes";
import {logger} from "../../utils/logger";

const url = `${process.env.SMS_NASIAVIE_BASE_URL!}${process.env.SMS_NASIAVIE_ENDPOINT!}`;
const apiKey = process.env.SMS_NASIAVIE_APIKEY!
const provenance = process.env.SMS_NASIAVIE_PROVENANCE!
const modeTransmission = Number(process.env.SMS_NASIAVIE_MODETRANSMISSION!)
const senderSource = process.env.SMS_NASIAVIE_SENDERSOURCE!

export default async function nsiavieSmsService(payload: NsiaVieFormData): Promise<ResponseService<boolean>> {
	try {
		const headers = {
			'Content-Type': 'application/json',
			'ApiKeyAuthorization': apiKey,
		};
		
		const data = {
			...payload,
			provenance,
			modeTransmission,
			senderSource
		}
		
		logger.info('Sending SMS notification to:', data);
		const response = await axios.post(url, data, {headers});
		
		logger.debug('SMS notification sent successfully.', {response: response.data});
		
		return {
			status: true
		};
	} catch (error) {
		if (axios.isAxiosError(error)) {
			logger.error('Error sending SMS:', error.response?.data || error.message);
		} else {
			logger.error('An unexpected error occurred sms:', error);
		}
		
		return {
			status: false
		}
	}
}