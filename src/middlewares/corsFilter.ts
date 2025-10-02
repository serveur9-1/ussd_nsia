import { Request, Response, NextFunction } from "express";

const allowedOrigins = [
  "https://billmap.mtn.ci:8443",
];

function unAuthorize(headers: Record<string, any>): boolean {
  return (
    typeof headers["user-agent"] !== "undefined" ||
    typeof headers["sec-ch-ua"] !== "undefined" ||
    typeof headers["sec-fetch-site"] !== "undefined" ||
    typeof headers["upgrade-insecure-requests"] !== "undefined"
  );
}

export default function corsFilter(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin as string | undefined;

  if (unAuthorize(req.headers)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS, HEAD, PUT, POST");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
}
