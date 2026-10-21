import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { automationExecute, automationFields, automationOperations } from './resources/automation';
import {
	certificateExecute,
	certificateFields,
	certificateOperations,
} from './resources/certificate';
import { invoiceExecute, invoiceFields, invoiceOperations } from './resources/invoice';
import { issuerExecute, issuerFields, issuerOperations } from './resources/issuer';
import {
	webhookEndpointExecute,
	webhookEndpointFields,
	webhookEndpointOperations,
} from './resources/webhookEndpoint';

type ResourceExecute = (
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
) => Promise<IDataObject | IDataObject[]>;

const executors: Record<string, ResourceExecute> = {
	automation: automationExecute,
	certificate: certificateExecute,
	invoice: invoiceExecute,
	issuer: issuerExecute,
	webhookEndpoint: webhookEndpointExecute,
};

export class FacturaSdk implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Factura SDK',
		name: 'facturaSdk',
		icon: { light: 'file:../../icons/afipsdk.svg', dark: 'file:../../icons/afipsdk.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["resource"] + ": " + $parameter["operation"] }}',
		description:
			'Issue electronic invoices end to end with Factura SDK: issuers, certificates, invoices and webhooks',
		defaults: {
			name: 'Factura SDK',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'facturaSdkApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Automation', value: 'automation' },
					{ name: 'Certificate', value: 'certificate' },
					{ name: 'Invoice', value: 'invoice' },
					{ name: 'Issuer', value: 'issuer' },
					{ name: 'Webhook Endpoint', value: 'webhookEndpoint' },
				],
				default: 'invoice',
			},

			invoiceOperations,
			issuerOperations,
			certificateOperations,
			webhookEndpointOperations,
			automationOperations,

			// ── Fields ───────────────────────────────────────────────────
			...invoiceFields,
			...issuerFields,
			...certificateFields,
			...webhookEndpointFields,
			...automationFields,
		],
		usableAsTool: true,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const executor = executors[resource];

		if (!executor) {
			throw new NodeOperationError(this.getNode(), `Resource "${resource}" not supported`);
		}

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const result = await executor.call(this, operation, itemIndex);
				const responseItems = this.helpers.returnJsonArray(result);

				returnData.push(
					...responseItems.map((item) => ({ ...item, pairedItem: { item: itemIndex } })),
				);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: itemIndex },
					});
				} else {
					if (error.context) {
						error.context.itemIndex = itemIndex;
						throw error;
					}
					throw new NodeOperationError(this.getNode(), error, { itemIndex });
				}
			}
		}

		return [returnData];
	}
}
