import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verifies the signature of a Factura SDK webhook delivery.
 *
 * The X-FacturaSDK-Signature header is "t=<timestamp>,v1=<signature>", where v1 is the
 * HMAC-SHA256 of "<timestamp>.<body>" with the secret of the endpoint. The body has to be the
 * raw one received, byte by byte (https://afipsdk.com/docs/facturasdk/webhooks#verificar-la-firma).
 */
export function verifyWebhookSignature(
	signature: string | undefined,
	body: Buffer | string,
	secret: string,
	toleranceSeconds = 300,
): boolean {
	if (typeof signature !== 'string' || !secret) {
		return false;
	}

	const parts: Record<string, string> = {};

	for (const part of signature.split(',')) {
		const [name, ...rest] = part.split('=');
		parts[name] = rest.join('=');
	}

	if (!/^\d{1,18}$/.test(parts.t ?? '')) {
		return false;
	}

	const timestamp = Number(parts.t);
	const received = parts.v1 ?? '';
	const payload = Buffer.isBuffer(body) ? body : Buffer.from(body, 'utf8');

	const expected = createHmac('sha256', secret)
		.update(`${timestamp}.`)
		.update(payload)
		.digest('hex');

	const fresh = Math.abs(Math.floor(Date.now() / 1000) - timestamp) <= toleranceSeconds;

	return (
		fresh &&
		received.length === expected.length &&
		timingSafeEqual(Buffer.from(received), Buffer.from(expected))
	);
}
