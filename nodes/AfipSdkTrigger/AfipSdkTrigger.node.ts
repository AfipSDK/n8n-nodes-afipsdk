import type {
	IDataObject,
	IHookFunctions,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { facturaSdkRequest, listAll } from '../AfipSdk/facturasdk/shared/request';
import { verifyWebhookSignature } from '../AfipSdk/facturasdk/shared/signature';

/**
 * What the node keeps between activations: the webhook endpoint it registered in Factura SDK
 * and the secret that signs its deliveries.
 */
interface EndpointStaticData extends IDataObject {
	endpointId?: string;
	endpointSecret?: string;
}

interface Endpoint extends IDataObject {
	id: string;
	url: string;
	status: string;
}

export class AfipSdkTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Afip SDK Trigger',
		name: 'afipSdkTrigger',
		icon: {
			light: 'file:../../icons/afipsdk.svg',
			dark: 'file:../../icons/afipsdk.dark.svg',
		},
		group: ['trigger'],
		version: 1,
		subtitle: '={{ $parameter["events"].join(", ") }}',
		description:
			'Starts the workflow when Factura SDK sends the result of an invoice (approved, rejected or failed)',
		defaults: {
			name: 'Afip SDK Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'afipSdkApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName:
					'When the workflow is activated, the node registers its URL as the webhook endpoint of the environment of the credential and keeps the secret that signs every event. Factura SDK accepts one active endpoint per environment: if another one is active, point it to this URL or deactivate it first.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				options: [
					{
						name: 'Invoice Approved',
						value: 'invoice.approved',
						description: 'ARCA approved the invoice, with or without observations',
					},
					{
						name: 'Invoice Failed',
						value: 'invoice.failed',
						description:
							'The invoice could not be authorized: retries ran out or there is a configuration error',
					},
					{
						name: 'Invoice Rejected',
						value: 'invoice.rejected',
						description: 'ARCA rejected the invoice, with the reasons in errors',
					},
					{
						name: 'Test',
						value: 'test',
						description: 'The test event sent from the dashboard or with the Factura SDK node',
					},
				],
				default: ['invoice.approved', 'invoice.rejected', 'invoice.failed'],
				required: true,
			},
		],
	};

	webhookMethods = {
		default: {
			/**
			 * The endpoint exists when the active endpoint of the environment has the URL of this node,
			 * whoever registered it. When the node has no secret for it and the credential has none
			 * either, it rotates the secret and keeps the new one: nothing else receives that URL.
			 */
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const staticData = this.getWorkflowStaticData('node') as EndpointStaticData;
				const endpoints = await listEndpoints(this, { status: 'active' });
				const endpoint = endpoints.find((item) => item.url === webhookUrl);

				if (!endpoint) {
					return false;
				}

				if (staticData.endpointId !== endpoint.id) {
					staticData.endpointId = endpoint.id;
					delete staticData.endpointSecret;
				}

				if (!staticData.endpointSecret && !(await credentialSecret(this))) {
					staticData.endpointSecret = await rotateSecret(this, endpoint.id);
				}

				return true;
			},

			/**
			 * Registers the URL of this node. Factura SDK accepts one active endpoint per environment
			 * and answers 409 to a second endpoint with the same URL, so an existing one is reactivated
			 * instead, with a new secret, and another active one stops the activation with its URL.
			 */
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const staticData = this.getWorkflowStaticData('node') as EndpointStaticData;
				const endpoints = await listEndpoints(this);
				const active = endpoints.find((item) => item.status === 'active');

				if (active && active.url !== webhookUrl) {
					throw new NodeOperationError(
						this.getNode(),
						`Factura SDK already has an active webhook endpoint in this environment: ${active.url}`,
						{
							description:
								'Factura SDK accepts one active endpoint per environment. Change the URL of that endpoint to the URL of this node, or deactivate it, and activate the workflow again. To test the trigger while the workflow is active, use a credential with a sandbox token.',
						},
					);
				}

				const existing = active ?? endpoints.find((item) => item.url === webhookUrl);

				if (existing) {
					if (existing.status !== 'active') {
						await facturaSdkRequest(this, 'PUT', `webhook-endpoints/${existing.id}`, {
							body: { status: 'active' },
						});
					}

					staticData.endpointId = existing.id;
					staticData.endpointSecret = await rotateSecret(this, existing.id);

					return true;
				}

				const created = await facturaSdkRequest(this, 'POST', 'webhook-endpoints', {
					body: { url: webhookUrl },
				});

				if (typeof created.id !== 'string' || typeof created.secret !== 'string') {
					throw new NodeOperationError(
						this.getNode(),
						'Factura SDK did not answer the ID and the secret of the new webhook endpoint',
					);
				}

				staticData.endpointId = created.id;
				staticData.endpointSecret = created.secret;

				return true;
			},

			/**
			 * Deactivates the endpoint instead of deleting it, which the API does not offer: an inactive
			 * endpoint receives no invoice events and is reactivated by create.
			 */
			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node') as EndpointStaticData;

				if (staticData.endpointId) {
					try {
						await facturaSdkRequest(this, 'PUT', `webhook-endpoints/${staticData.endpointId}`, {
							body: { status: 'inactive' },
						});
					} catch (error) {
						this.logger.error('Afip SDK Trigger could not deactivate its webhook endpoint', {
							endpointId: staticData.endpointId,
							error,
						});

						return false;
					}

					delete staticData.endpointId;
					delete staticData.endpointSecret;
				}

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const staticData = this.getWorkflowStaticData('node') as EndpointStaticData;
		const secrets = [staticData.endpointSecret ?? '', await credentialSecret(this)].filter(
			(secret) => secret !== '',
		);

		if (secrets.length === 0) {
			throw new NodeOperationError(
				this.getNode(),
				'There is no secret to verify the events: activate the workflow again so the node registers the endpoint, or set the webhook secret in the Factura SDK credential',
			);
		}

		const request = this.getRequestObject() as unknown as { rawBody?: Buffer };
		const body = request.rawBody ?? Buffer.from(JSON.stringify(this.getBodyData()), 'utf8');
		const signature = this.getHeaderData()['x-facturasdk-signature'] as string | undefined;

		if (!secrets.some((secret) => verifyWebhookSignature(signature, body, secret))) {
			const response = this.getResponseObject();
			response.status(400).json({ message: 'Invalid signature' });

			return { noWebhookResponse: true };
		}

		const event = JSON.parse(body.toString('utf8')) as IDataObject;
		const events = this.getNodeParameter('events') as string[];

		if (!events.includes(event.type as string)) {
			return {};
		}

		return {
			workflowData: [this.helpers.returnJsonArray(event)],
		};
	}
}

async function credentialSecret(context: IHookFunctions | IWebhookFunctions): Promise<string> {
	const secret = (await context.getCredentials('afipSdkApi')).webhookSecret;

	return typeof secret === 'string' ? secret : '';
}

async function listEndpoints(
	context: IHookFunctions,
	filters: IDataObject = {},
): Promise<Endpoint[]> {
	return (await listAll(context, 'webhook-endpoints', filters, true, 0)) as Endpoint[];
}

async function rotateSecret(context: IHookFunctions, endpointId: string): Promise<string> {
	const rotated = await facturaSdkRequest(
		context,
		'POST',
		`webhook-endpoints/${endpointId}/rotate`,
	);

	if (typeof rotated.secret !== 'string' || rotated.secret === '') {
		throw new NodeOperationError(
			context.getNode(),
			'Factura SDK did not answer the new secret of the webhook endpoint',
		);
	}

	return rotated.secret;
}
