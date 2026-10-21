import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IN8nHttpFullResponse,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError, sleep } from 'n8n-workflow';

// Automations (ARCA with the tax password, verification) take from seconds to a couple of minutes;
// an invoice is authorized in the background in seconds
const AUTOMATION_ATTEMPTS = 60;
const INVOICE_INTERVAL_MS = 2000;
const INVOICE_ATTEMPTS = 60;

const PENDING_INVOICE_STATUSES = ['queued', 'processing'];

export interface RequestOptions {
	body?: IDataObject;
	qs?: IDataObject;
	headers?: Record<string, string>;
}

/**
 * Sends a request to the Factura SDK API with the credential of the node. Any status from 400
 * on becomes a NodeApiError whose message comes from the body: message, the rules in errors
 * and the problems by field in data_errors (https://afipsdk.com/docs/facturasdk/errors).
 */
export async function facturaSdkRequest(
	context: IExecuteFunctions,
	method: IHttpRequestMethods,
	path: string,
	options: RequestOptions = {},
): Promise<IDataObject> {
	const baseUrl = ((await context.getCredentials('facturaSdkApi')).baseUrl as string).replace(
		/\/$/,
		'',
	);

	const response = (await context.helpers.httpRequestWithAuthentication.call(
		context,
		'facturaSdkApi',
		{
			method,
			url: `${baseUrl}/${path}`,
			body: options.body,
			qs: options.qs,
			headers: options.headers,
			json: true,
			ignoreHttpStatusErrors: true,
			returnFullResponse: true,
		},
	)) as IN8nHttpFullResponse;

	if (response.statusCode >= 400) {
		const body = (response.body ?? {}) as IDataObject;

		throw new NodeApiError(context.getNode(), body as JsonObject, {
			message: describeError(response.statusCode, body),
			httpCode: String(response.statusCode),
		});
	}

	if (response.body === undefined || response.body === null || response.body === '') {
		return {};
	}

	return response.body as IDataObject;
}

/**
 * Builds a readable message out of an error body. A failed automation answers
 * { status: "error", data: { message, data_errors, errors } }.
 */
export function describeError(status: number, body: IDataObject): string {
	const detail = detailOf(body);
	const parts: string[] = [];

	if (typeof detail.message === 'string' && detail.message !== '') {
		parts.push(detail.message);
	}

	if (Array.isArray(detail.errors)) {
		for (const error of detail.errors as IDataObject[]) {
			parts.push(`${error.code}: ${error.message}`);
		}
	}

	if (isObject(detail.data_errors)) {
		parts.push(...flattenDataErrors(detail.data_errors as IDataObject, ''));
	}

	if (parts.length > 0) {
		return parts.join(' ');
	}

	if (typeof body === 'string' && body !== '') {
		return body;
	}

	return `Factura SDK responded ${status}`;
}

function detailOf(body: IDataObject): IDataObject {
	if (!isObject(body)) {
		return {};
	}

	if (body.status === 'error' && isObject(body.data)) {
		return body.data as IDataObject;
	}

	return body;
}

function flattenDataErrors(errors: IDataObject, prefix: string): string[] {
	const lines: string[] = [];

	for (const [field, value] of Object.entries(errors)) {
		const path = prefix === '' ? field : `${prefix}.${field}`;

		if (isObject(value)) {
			lines.push(...flattenDataErrors(value as IDataObject, path));
		} else {
			lines.push(`${path}: ${String(value)}`);
		}
	}

	return lines;
}

function isObject(value: unknown): boolean {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Resolves the answer of an endpoint that may start an automation (202 with automation_id):
 * when it did and the node waits, polls the automation until it finishes.
 */
export async function resolveAutomation(
	context: IExecuteFunctions,
	result: IDataObject,
	wait: boolean,
	intervalSeconds: number,
	itemIndex: number,
): Promise<IDataObject> {
	const automationId = result.automation_id;

	if (!wait || typeof automationId !== 'string' || automationId === '') {
		return result;
	}

	return waitForAutomation(context, automationId, intervalSeconds, itemIndex);
}

/**
 * Polls an automation until it is no longer in_process. A failed automation answers 400 and
 * becomes a NodeApiError.
 */
export async function waitForAutomation(
	context: IExecuteFunctions,
	automationId: string,
	intervalSeconds: number,
	itemIndex: number,
): Promise<IDataObject> {
	const intervalMs = Math.max(1, intervalSeconds) * 1000;

	for (let attempt = 0; attempt < AUTOMATION_ATTEMPTS; attempt++) {
		const automation = await facturaSdkRequest(context, 'GET', `automations/${automationId}`);

		if (automation.status !== 'in_process') {
			return automation;
		}

		await sleep(intervalMs);
	}

	throw new NodeOperationError(
		context.getNode(),
		`Automation "${automationId}" timed out after ${(AUTOMATION_ATTEMPTS * intervalMs) / 1000}s`,
		{ itemIndex },
	);
}

/**
 * Polls an invoice until it is approved, rejected or failed. The invoice keeps its course in
 * Factura SDK if the wait ends; the result still arrives at the webhook.
 */
export async function waitForInvoice(
	context: IExecuteFunctions,
	invoiceId: string,
	itemIndex: number,
): Promise<IDataObject> {
	for (let attempt = 0; attempt < INVOICE_ATTEMPTS; attempt++) {
		const invoice = await facturaSdkRequest(context, 'GET', `invoices/${invoiceId}`);

		if (!PENDING_INVOICE_STATUSES.includes(invoice.status as string)) {
			return invoice;
		}

		await sleep(INVOICE_INTERVAL_MS);
	}

	throw new NodeOperationError(
		context.getNode(),
		`Invoice "${invoiceId}" is still pending after ${(INVOICE_ATTEMPTS * INVOICE_INTERVAL_MS) / 1000}s; the result will arrive at your webhook`,
		{ itemIndex },
	);
}

export function isPendingInvoice(invoice: IDataObject): boolean {
	return PENDING_INVOICE_STATUSES.includes(invoice.status as string);
}

/**
 * Lists a paginated endpoint (data, next_cursor, total_count): all pages when returnAll, or up
 * to limit items.
 */
export async function listAll(
	context: IExecuteFunctions,
	path: string,
	filters: IDataObject,
	returnAll: boolean,
	limit: number,
): Promise<IDataObject[]> {
	const items: IDataObject[] = [];
	let cursor: string | undefined;

	do {
		const qs: IDataObject = {
			...filters,
			limit: returnAll ? 100 : Math.min(limit - items.length, 100),
		};

		if (cursor) {
			qs.cursor = cursor;
		}

		const page = await facturaSdkRequest(context, 'GET', path, { qs });
		const data = Array.isArray(page.data) ? (page.data as IDataObject[]) : [];

		items.push(...data);

		cursor = typeof page.next_cursor === 'string' && data.length > 0 ? page.next_cursor : undefined;
	} while (cursor && (returnAll || items.length < limit));

	return returnAll ? items : items.slice(0, limit);
}

/**
 * Reads the JSON body parameter of the item.
 */
export function parseBody(context: IExecuteFunctions, itemIndex: number): IDataObject {
	const raw = context.getNodeParameter('parametersJson', itemIndex);

	if (typeof raw === 'object' && raw !== null) {
		return raw as IDataObject;
	}

	try {
		return JSON.parse(raw as string) as IDataObject;
	} catch {
		throw new NodeOperationError(context.getNode(), 'Body JSON is not valid', { itemIndex });
	}
}

/**
 * Reads the filters collection of a list operation, dropping empty values.
 */
export function readFilters(context: IExecuteFunctions, itemIndex: number): IDataObject {
	const filters = context.getNodeParameter('filters', itemIndex, {}) as IDataObject;
	const clean: IDataObject = {};

	for (const [key, value] of Object.entries(filters)) {
		if (value !== '' && value !== undefined && value !== null) {
			clean[key] = value;
		}
	}

	return clean;
}
