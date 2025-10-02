import { Request, Response } from "express";
import stepsMerchantHandlers from "../../services/ussd/steps/merchant/ussdRoutesMerchant";
import ussdMenuMerchant from "../../constants/ussdMenuMerchant";
import {logger} from "../../utils/logger";

type SessionData = {
  step: string;
  msisdn: string;
  data?: Record<string, any>;
  history: string[];
  lastActive: number;
};

const SESSION_TIMEOUT = 60 * 1000;
const sessionStore = new Map<string, SessionData>();

function maskInput(step: string, input: string): string {
  if (!input) return "";

  if (input.length === 1 && /^[0-9]$/.test(input)) {
    return input;
  }

  if (step.includes("phone") || step.includes("amount") || step.includes("merchant") || step.includes("code")) {
    return "*".repeat(input.length - 2) + input.slice(-2);
  }

  return "*****";
}

export default async function ussdMerchantController(req: Request, res: Response) {
  const sessionid = req.query.sessionid as string;
  const input = (req.query.input as string) || "";
  const msisdn = req.query.msisdn as string;

  if (!sessionid || !msisdn || req.query.extension !== "148") {
    sessionStore.delete(sessionid);
    logger.info(`[MERCHANT][ERROR] Invalid request | MSISDN: ${msisdn} | SessionID: ${sessionid}`);
    return res.status(200).send(ussdMenuMerchant.globalError);
  }

  let session = sessionStore.get(sessionid);

  if (!session || session.msisdn !== msisdn || Date.now() - session.lastActive > SESSION_TIMEOUT) {
    const newSession: SessionData = {
      step: "main_menu_merchant",
      msisdn,
      data: {},
      history: [],
      lastActive: Date.now(),
    };
    sessionStore.set(sessionid, newSession);
    logger.info(`[MERCHANT][NEW SESSION] MSISDN: ${msisdn} | Response: main menu`);
    return res.set("Content-Type", "text/plain").send(ussdMenuMerchant.main);
  }

  if (input === "00") {
    const resetSession: SessionData = {
      step: "main_menu_merchant",
      msisdn,
      data: {},
      history: [],
      lastActive: Date.now(),
    };
    sessionStore.set(sessionid, resetSession);
    logger.info(`[MERCHANT][RESET MENU] MSISDN: ${msisdn} | Response: main menu`);
    return res.set("Content-Type", "text/plain").send(ussdMenuMerchant.main);
  }

  if (input === "0") {
    if (session.history.length > 0) {
      const previousStep = session.history.pop()!;
      session.step = previousStep;
      session.lastActive = Date.now();
      sessionStore.set(sessionid, session);

      const handler = stepsMerchantHandlers[previousStep];
      const { response } = await handler(sessionid, "__REPEAT__", session.data || {}, req.query);

      logger.info(`[MERCHANT][BACK] MSISDN: ${msisdn} | Step: ${previousStep} | Response: ${response}`);
      return res.set("Content-Type", "text/plain").send(response);
    } else {
      const resetSession: SessionData = {
        step: "main_menu_merchant",
        msisdn,
        data: {},
        history: [],
        lastActive: Date.now(),
      };
      sessionStore.set(sessionid, resetSession);
      logger.info(`[MERCHANT][BACK TO MAIN] MSISDN: ${msisdn} | Response: main menu`);
      return res.set("Content-Type", "text/plain").send(ussdMenuMerchant.main);
    }
  }

  const handler = stepsMerchantHandlers[session.step];
  if (!handler) {
    sessionStore.delete(sessionid);
    logger.info(`[MERCHANT][ERROR] Unknown step | MSISDN: ${msisdn} | Step: ${session.step}`);
    return res.set("Content-Type", "text/plain").send(ussdMenuMerchant.globalError);
  }

  const { response, nextStep, updatedData } = await handler(sessionid, input, session.data || {}, req.query);

  if (nextStep === null) {
    sessionStore.delete(sessionid);
  } else {
    const updatedHistory = session.history;
    if (nextStep !== session.step) {
      updatedHistory.push(session.step);
    }
    sessionStore.set(sessionid, {
      step: nextStep,
      msisdn,
      data: updatedData,
      history: updatedHistory,
      lastActive: Date.now(),
    });
  }

  const safeInput = maskInput(session.step, input);
  logger.info(`[MERCHANT][PROGRESS] MSISDN: ${msisdn} | Step: ${session.step} | Input: ${safeInput} | Response: ${response}`);

  res.set("Content-Type", "text/plain").send(response);
}
