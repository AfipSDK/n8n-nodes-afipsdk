import type {
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookFunctions,
	IWebhookResponseData,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { verifyWebhookSignature } from '../FacturaSdk/shared/signature';

export class FacturaSdkTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Factura SDK Trigger',
		name: 'facturaSdkTrigger',
		icon: { light: 'file:../../icons/afipsdk.svg', dark: 'file:../../icons/afipsdk.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{ $parameter["events"].join(", ") }}',
		description:
			'Starts the workflow when Factura SDK sends the result of an invoice (approved, rejected or failed)',
		defaults: {
			name: 'Factura SDK Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'facturaSdkApi',
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
					'Create a webhook endpoint in Factura SDK with the production URL of this node (from the dashboard, Configuración → Webhooks, or with the Factura SDK node) and save its secret in the credential: every event is verified with it. Factura SDK accepts one active endpoint per environment.',
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
		usableAsTool: true,
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const secret = (await this.getCredentials('facturaSdkApi')).webhookSecret as string;

		if (!secret) {
			throw new NodeOperationError(
				this.getNode(),
				'Set the webhook secret of the Factura SDK credential to verify the events',
			);
		}

		const request = this.getRequestObject() as unknown as { rawBody?: Buffer };
		const body = request.rawBody ?? Buffer.from(JSON.stringify(this.getBodyData()), 'utf8');
		const signature = this.getHeaderData()['x-facturasdk-signature'] as string | undefined;

		if (!verifyWebhookSignature(signature, body, secret)) {
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
