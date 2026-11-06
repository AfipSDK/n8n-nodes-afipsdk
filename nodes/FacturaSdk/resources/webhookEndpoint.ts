import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { bodyField, idField, listFields } from '../shared/fields';
import { facturaSdkRequest, listAll, parseBody, readFilters } from '../shared/request';

const RESOURCE = 'webhookEndpoint';

export const webhookEndpointOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: [RESOURCE] } },
	options: [
		{
			name: 'Create',
			value: 'create',
			action: 'Create the webhook endpoint',
			description:
				'Create the URL where Factura SDK posts the result of each invoice. The answer brings the secret, shown only this once.',
		},
		{
			name: 'Get',
			value: 'get',
			action: 'Get a webhook endpoint',
		},
		{
			name: 'Get Deliveries',
			value: 'getDeliveries',
			action: 'Get the deliveries of a webhook endpoint',
			description: 'List what was sent to the endpoint, when and with what result',
		},
		{
			name: 'Get Many',
			value: 'getAll',
			action: 'Get many webhook endpoints',
		},
		{
			name: 'Rotate Secret',
			value: 'rotateSecret',
			action: 'Rotate the secret of a webhook endpoint',
			description: 'Generate a new secret. From then on every delivery is signed with it.',
		},
		{
			name: 'Test',
			value: 'test',
			action: 'Send a test event to a webhook endpoint',
			description: 'Send a signed test event and return the result of that delivery',
		},
		{
			name: 'Update',
			value: 'update',
			action: 'Update a webhook endpoint',
			description: 'Change the URL or the status (active or inactive)',
		},
	],
	default: 'create',
};

export const webhookEndpointFields: INodeProperties[] = [
	idField(
		RESOURCE,
		['get', 'update', 'rotateSecret', 'test', 'getDeliveries'],
		'endpointId',
		'Endpoint ID',
		'ID of the webhook endpoint',
	),
	bodyField(RESOURCE, 'create', { url: 'https://api.tusistema.com/webhooks/facturasdk' }),
	bodyField(RESOURCE, 'update', { status: 'inactive' }),
	...listFields(RESOURCE, 'getAll', [
		{
			displayName: 'Status',
			name: 'status',
			type: 'options',
			default: 'active',
			options: [
				{ name: 'Active', value: 'active' },
				{ name: 'Inactive', value: 'inactive' },
			],
		},
	]),
	...listFields(RESOURCE, 'getDeliveries', [
		{
			displayName: 'Status',
			name: 'status',
			type: 'options',
			default: 'delivered',
			options: [
				{ name: 'Delivered', value: 'delivered' },
				{ name: 'Failed', value: 'failed' },
				{ name: 'Pending', value: 'pending' },
			],
		},
		{
			displayName: 'Invoice ID',
			name: 'invoice_id',
			type: 'string',
			default: '',
			description: 'Deliveries of one invoice',
		},
	]),
];

export async function webhookEndpointExecute(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	const endpointId = () => this.getNodeParameter('endpointId', itemIndex) as string;

	if (operation === 'create') {
		return facturaSdkRequest(this, 'POST', 'webhook-endpoints', {
			body: parseBody(this, itemIndex),
		});
	}

	if (operation === 'get') {
		return facturaSdkRequest(this, 'GET', `webhook-endpoints/${endpointId()}`);
	}

	if (operation === 'getAll' || operation === 'getDeliveries') {
		const path =
			operation === 'getAll' ? 'webhook-endpoints' : `webhook-endpoints/${endpointId()}/deliveries`;
		const returnAll = this.getNodeParameter('returnAll', itemIndex) as boolean;
		const limit = returnAll ? 0 : (this.getNodeParameter('limit', itemIndex) as number);

		return listAll(this, path, readFilters(this, itemIndex), returnAll, limit);
	}

	if (operation === 'update') {
		return facturaSdkRequest(this, 'PUT', `webhook-endpoints/${endpointId()}`, {
			body: parseBody(this, itemIndex),
		});
	}

	if (operation === 'rotateSecret') {
		return facturaSdkRequest(this, 'POST', `webhook-endpoints/${endpointId()}/rotate`);
	}

	if (operation === 'test') {
		return facturaSdkRequest(this, 'POST', `webhook-endpoints/${endpointId()}/test`);
	}

	throw new Error(`Operation "${operation}" not supported`);
}
