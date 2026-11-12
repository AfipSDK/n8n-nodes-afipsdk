import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { bodyField, idField, listFields, waitFields } from '../shared/fields';
import {
	facturaSdkRequest,
	listAll,
	parseBody,
	readFilters,
	resolveAutomation,
} from '../shared/request';

const RESOURCE = 'issuer';

const AUTOMATION_OPERATIONS = [
	'acceptDelegation',
	'createCertificate',
	'createSalesPoint',
	'getSalesPoints',
	'verify',
];

export const issuerOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: [RESOURCE] } },
	options: [
		{
			name: 'Accept Delegation',
			value: 'acceptDelegation',
			action: 'Accept the delegation of an issuer',
			description:
				'Accept in ARCA the delegation of the issuer to the owner of its certificate, with the tax password of the certificate owner',
		},
		{
			name: 'Create',
			value: 'create',
			action: 'Create an issuer',
			description:
				'Create an issuer: a CUIT that invoices. It is created pending and invoices once verified.',
		},
		{
			name: 'Create Certificate',
			value: 'createCertificate',
			action: 'Create a certificate for an issuer',
			description:
				'Upload a certificate (cert and key in PEM) or create one in ARCA (source automation) and assign it to the issuer',
		},
		{
			name: 'Create Sales Point',
			value: 'createSalesPoint',
			action: 'Create a sales point in ARCA',
			description:
				'Create in ARCA a sales point for web services for a CUIT, with its tax password',
		},
		{
			name: 'Delete',
			value: 'delete',
			action: 'Delete an issuer',
			description: 'Delete an issuer. Its invoices remain.',
		},
		{
			name: 'Get',
			value: 'get',
			action: 'Get an issuer',
		},
		{
			name: 'Get Many',
			value: 'getAll',
			action: 'Get many issuers',
		},
		{
			name: 'Get Sales Points',
			value: 'getSalesPoints',
			action: 'Get the sales points of a CUIT in ARCA',
			description: 'List the sales points of a CUIT in ARCA, with its tax password',
		},
		{
			name: 'Lookup',
			value: 'lookup',
			action: 'Look up the registration data of a CUIT',
			description:
				'Get the data of a CUIT from its registration certificate in ARCA, to create the issuer without typing them',
		},
		{
			name: 'Update',
			value: 'update',
			action: 'Update an issuer',
			description: 'Update an issuer: only the fields sent change',
		},
		{
			name: 'Verify',
			value: 'verify',
			action: 'Verify an issuer',
			description:
				'Issue a $1 invoice and the credit note that cancels it; the issuer becomes active. In production both vouchers are real.',
		},
	],
	default: 'create',
};

export const issuerFields: INodeProperties[] = [
	idField(
		RESOURCE,
		['get', 'update', 'delete', 'createCertificate', 'acceptDelegation', 'verify'],
		'issuerId',
		'Issuer ID',
		'ID of the issuer',
	),
	{
		displayName: 'Tax ID (CUIT)',
		name: 'taxId',
		type: 'string',
		default: '',
		required: true,
		description: 'CUIT to look up, 11 digits',
		displayOptions: { show: { resource: [RESOURCE], operation: ['lookup'] } },
	},
	bodyField(RESOURCE, 'create', {
		tax_id: '20111111112',
		business_name: 'Emisor de prueba',
		address: 'Av. Siempre Viva 742, CABA',
		vat_condition: 1,
		gross_income: '20111111112',
		activity_start_date: '2020-01-01',
		sales_point: 1,
	}),
	bodyField(RESOURCE, 'update', { address: 'Av. Siempre Viva 744, CABA', sales_point: 2 }),
	bodyField(RESOURCE, 'createCertificate', { cert: 'VALID_CERT', key: 'VALID_KEY' }),
	bodyField(RESOURCE, 'acceptDelegation', { username: '30715000004', password: '<CLAVE_FISCAL>' }),
	bodyField(RESOURCE, 'getSalesPoints', {
		tax_id: '20111111112',
		username: '20111111112',
		password: '<CLAVE_FISCAL>',
	}),
	bodyField(RESOURCE, 'createSalesPoint', {
		tax_id: '20111111112',
		username: '20111111112',
		password: '<CLAVE_FISCAL>',
		vat_condition: 1,
	}),
	...waitFields(RESOURCE, AUTOMATION_OPERATIONS),
	...listFields(RESOURCE, 'getAll', [
		{
			displayName: 'Tax ID (CUIT)',
			name: 'tax_id',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Certificate ID',
			name: 'certificate_id',
			type: 'string',
			default: '',
			description: 'Issuers that sign with this certificate',
		},
		{
			displayName: 'Status',
			name: 'status',
			type: 'options',
			default: 'active',
			options: [
				{ name: 'Active', value: 'active' },
				{ name: 'Inactive', value: 'inactive' },
				{ name: 'Pending', value: 'pending' },
			],
		},
	]),
];

export async function issuerExecute(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	const issuerId = () => this.getNodeParameter('issuerId', itemIndex) as string;

	if (operation === 'create') {
		return facturaSdkRequest(this, 'POST', 'issuers', { body: parseBody(this, itemIndex) });
	}

	if (operation === 'get') {
		return facturaSdkRequest(this, 'GET', `issuers/${issuerId()}`);
	}

	if (operation === 'getAll') {
		const returnAll = this.getNodeParameter('returnAll', itemIndex) as boolean;
		const limit = returnAll ? 0 : (this.getNodeParameter('limit', itemIndex) as number);

		return listAll(this, 'issuers', readFilters(this, itemIndex), returnAll, limit);
	}

	if (operation === 'update') {
		return facturaSdkRequest(this, 'PUT', `issuers/${issuerId()}`, {
			body: parseBody(this, itemIndex),
		});
	}

	if (operation === 'delete') {
		await facturaSdkRequest(this, 'DELETE', `issuers/${issuerId()}`);

		return { success: true };
	}

	if (operation === 'lookup') {
		const taxId = this.getNodeParameter('taxId', itemIndex) as string;

		return facturaSdkRequest(this, 'GET', 'issuers/lookup', { qs: { tax_id: taxId } });
	}

	if (AUTOMATION_OPERATIONS.includes(operation)) {
		const paths: Record<string, string> = {
			acceptDelegation: `issuers/${operation === 'acceptDelegation' ? issuerId() : ''}/delegation`,
			createCertificate: `issuers/${operation === 'createCertificate' ? issuerId() : ''}/certificate`,
			createSalesPoint: 'issuers/sales-points/create',
			getSalesPoints: 'issuers/sales-points',
			verify: `issuers/${operation === 'verify' ? issuerId() : ''}/verify`,
		};

		const body = operation === 'verify' ? undefined : parseBody(this, itemIndex);
		const wait = this.getNodeParameter('wait', itemIndex, true) as boolean;
		const secondsToWait = this.getNodeParameter('secondsToWait', itemIndex, 3) as number;

		const result = await facturaSdkRequest(this, 'POST', paths[operation], { body });

		return resolveAutomation(this, result, wait, secondsToWait, itemIndex);
	}

	throw new Error(`Operation "${operation}" not supported`);
}
