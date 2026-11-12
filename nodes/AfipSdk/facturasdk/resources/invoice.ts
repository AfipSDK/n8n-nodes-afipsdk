import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { bodyField, idField, listFields } from '../shared/fields';
import {
	facturaSdkRequest,
	isPendingInvoice,
	listAll,
	parseBody,
	readFilters,
	waitForInvoice,
} from '../shared/request';

const RESOURCE = 'invoice';

export const invoiceOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: [RESOURCE] } },
	options: [
		{
			name: 'Cancel',
			value: 'cancel',
			action: 'Cancel an invoice',
			description: 'Cancel an invoice that is still queued, so it never gets issued',
		},
		{
			name: 'Create',
			value: 'create',
			action: 'Create an invoice',
			description:
				'Issue an invoice: Factura SDK answers right away with it queued and the result arrives at your webhook',
		},
		{
			name: 'Get',
			value: 'get',
			action: 'Get an invoice',
			description: 'Get an invoice with its current status',
		},
		{
			name: 'Get Many',
			value: 'getAll',
			action: 'Get many invoices',
			description: 'List invoices, newest first',
		},
	],
	default: 'create',
};

export const invoiceFields: INodeProperties[] = [
	bodyField(RESOURCE, 'create', {
		issuer_cuit: '20111111112',
		invoice_type: 6,
		concept: 1,
		receiver: {
			doc_type: 96,
			doc_number: '12345678',
			vat_condition: 5,
			name: 'Juan Pérez',
			address: 'Calle Falsa 123, CABA',
		},
		amounts: { net: 1000, vat: 210, total: 1210 },
		vat_items: [{ id: 5, base: 1000, amount: 210 }],
		items: [{ description: 'Teclado inalámbrico', quantity: 1, unit_price: 1210, subtotal: 1210 }],
		sale_condition: 'Contado',
	}),
	{
		displayName: 'Idempotency Key',
		name: 'idempotencyKey',
		type: 'string',
		default: '',
		description:
			'Identifier of the sale in your system. Repeating it returns the same invoice instead of issuing another one.',
		displayOptions: { show: { resource: [RESOURCE], operation: ['create'] } },
	},
	{
		displayName: 'Wait For Result',
		name: 'wait',
		type: 'boolean',
		default: false,
		description:
			'Whether to wait until the invoice is approved, rejected or failed instead of returning it queued',
		displayOptions: { show: { resource: [RESOURCE], operation: ['create', 'get'] } },
	},
	idField(RESOURCE, ['get', 'cancel'], 'invoiceId', 'Invoice ID', 'ID of the invoice'),
	...listFields(RESOURCE, 'getAll', [
		{
			displayName: 'Issuer CUIT',
			name: 'issuer_cuit',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Status',
			name: 'status',
			type: 'options',
			default: 'approved',
			options: [
				{ name: 'Approved', value: 'approved' },
				{ name: 'Cancelled', value: 'cancelled' },
				{ name: 'Failed', value: 'failed' },
				{ name: 'Processing', value: 'processing' },
				{ name: 'Queued', value: 'queued' },
				{ name: 'Rejected', value: 'rejected' },
			],
		},
		{
			displayName: 'Invoice Type',
			name: 'invoice_type',
			type: 'number',
			default: 6,
			description: 'Type of invoice as in ARCA: 1 Factura A, 6 Factura B, 11 Factura C…',
		},
		{
			displayName: 'Created From',
			name: 'start',
			type: 'string',
			default: '',
			placeholder: '2026-10-01T00:00:00.000Z',
			description: 'Creation date from, as a full ISO 8601 date and time',
		},
		{
			displayName: 'Created To',
			name: 'end',
			type: 'string',
			default: '',
			placeholder: '2026-10-31T23:59:59.999Z',
			description: 'Creation date to, as a full ISO 8601 date and time',
		},
	]),
];

export async function invoiceExecute(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	if (operation === 'create') {
		const body = parseBody(this, itemIndex);
		const idempotencyKey = this.getNodeParameter('idempotencyKey', itemIndex, '') as string;
		const wait = this.getNodeParameter('wait', itemIndex, false) as boolean;
		const headers = idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : undefined;

		const invoice = await facturaSdkRequest(this, 'POST', 'invoices', { body, headers });

		if (wait && isPendingInvoice(invoice)) {
			return waitForInvoice(this, invoice.id as string, itemIndex);
		}

		return invoice;
	}

	if (operation === 'get') {
		const invoiceId = this.getNodeParameter('invoiceId', itemIndex) as string;
		const wait = this.getNodeParameter('wait', itemIndex, false) as boolean;

		if (wait) {
			return waitForInvoice(this, invoiceId, itemIndex);
		}

		return facturaSdkRequest(this, 'GET', `invoices/${invoiceId}`);
	}

	if (operation === 'getAll') {
		const returnAll = this.getNodeParameter('returnAll', itemIndex) as boolean;
		const limit = returnAll ? 0 : (this.getNodeParameter('limit', itemIndex) as number);

		return listAll(this, 'invoices', readFilters(this, itemIndex), returnAll, limit);
	}

	if (operation === 'cancel') {
		const invoiceId = this.getNodeParameter('invoiceId', itemIndex) as string;

		return facturaSdkRequest(this, 'POST', `invoices/${invoiceId}/cancel`);
	}

	throw new Error(`Operation "${operation}" not supported`);
}
