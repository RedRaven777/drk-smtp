import "server-only";

import crypto from "crypto";

export const FORM_SIGNATURE_MAX_SKEW_MS =
	5 * 60 * 1000;

export function createRequestNonce() {
	return crypto.randomUUID();
}

export function createRequestTimestamp() {
	return String(Date.now());
}

export function createRequestSignature(params: {
	body: string | Buffer;
	timestamp: string;
	nonce: string;
	secret: string;
}) {
	return crypto
		.createHmac("sha256", params.secret)
		.update(params.timestamp)
		.update(".")
		.update(params.nonce)
		.update(".")
		.update(params.body)
		.digest("hex");
}

export function timingSafeEqualHex(
	a: string,
	b: string
) {
	try {
		const aBuffer = Buffer.from(a, "hex");
		const bBuffer = Buffer.from(b, "hex");

		if (aBuffer.length !== bBuffer.length) {
			return false;
		}

		return crypto.timingSafeEqual(
			aBuffer,
			bBuffer
		);
	} catch {
		return false;
	}
}