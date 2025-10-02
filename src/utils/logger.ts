import {createLogger, format, transports} from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import fs from "fs";

const logRootDir = path.resolve(__dirname, "../../logs");
const appLogDir = path.join(logRootDir, "app");
const reqLogDir = path.join(logRootDir, "requests");

if (!fs.existsSync(appLogDir)) fs.mkdirSync(appLogDir, {recursive: true});
if (!fs.existsSync(reqLogDir)) fs.mkdirSync(reqLogDir, {recursive: true});

const appRotateTransport = new DailyRotateFile({
	filename: path.join(appLogDir, "app-%DATE%.log"),
	datePattern: "YYYY-MM-DD",
	maxFiles: "182d", // conserve 6 mois
	level: "silly",
	zippedArchive: true,
});

const reqRotateTransport = new DailyRotateFile({
	filename: path.join(reqLogDir, "access-%DATE%.log"),
	datePattern: "YYYY-MM-DD",
	maxFiles: "182d", // conserve 6 mois
	level: "silly",
	zippedArchive: true,
});

const errorFormat = format((info) => {
	if (info instanceof Error) {
		return {
			...info,
			message: info.message,
			stack: info.stack,
		};
	}
	
	if (info.error instanceof Error) {
		return {
			...info,
			message: info.message || info.error.message,
			stack: info.error.stack,
		};
	}
	
	return info;
});

export const logger = createLogger({
	level: "silly",
	format: format.combine(
		errorFormat(),
		format.timestamp({format: "YYYY-MM-DD HH:mm:ss"}),
		format.errors({stack: true}),
		format.splat(),
		format.json()
	),
	transports: [
		appRotateTransport,
		new transports.Console({
			format: format.combine(format.colorize(), format.simple()),
		}),
	],
});

export const reqLogger = createLogger({
	level: "silly",
	format: format.combine(
		format.timestamp({format: "YYYY-MM-DD HH:mm:ss"}),
		format.printf(({timestamp, level, message}) => `${timestamp} [${level}] ${message}`)
	),
	transports: [reqRotateTransport],
});
