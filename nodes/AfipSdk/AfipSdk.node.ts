import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import { itemError } from '../shared/errors';
import { getTokenAuthFields } from './resources/getTokenAuth';
import { getTokenAuthExecute } from './resources/getTokenAuth/execute';
import { makeRequestFields } from './resources/makeRequest';
import { makeRequestExecute } from './resources/makeRequest/execute';
import { getLastXmlExecute } from './resources/getLastXml/execute';
import { createPdfExecute } from './resources/createPdf/execute';
import { createPdfFields } from './resources/createPdf';
import { runAutomationAndWaitFields } from './resources/runAutomationAndWait';
import { runAutomationAndWaitExecute } from './resources/runAutomationAndWait/execute';
import { runAutomationExecute } from './resources/runAutomation/execute';
import { runAutomationFields } from './resources/runAutomation';
import { getAutomationResultFields } from './resources/getAutomationResult';
import { getAutomationResultExecute } from './resources/getAutomationResult/execute';
import {
	certificateExecute,
	certificateFields,
	certificateOperations,
} from './facturasdk/resources/certificate';
import { invoiceExecute, invoiceFields, invoiceOperations } from './facturasdk/resources/invoice';
import { issuerExecute, issuerFields, issuerOperations } from './facturasdk/resources/issuer';
import {
	webhookEndpointExecute,
	webhookEndpointFields,
	webhookEndpointOperations,
} from './facturasdk/resources/webhookEndpoint';

type ResourceExecute = (
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
) => Promise<IDataObject | IDataObject[]>;

// Electronic invoicing with Factura SDK: one request per item, with the error kept on the item
const invoicingExecutors: Record<string, ResourceExecute> = {
	certificate: certificateExecute,
	invoice: invoiceExecute,
	issuer: issuerExecute,
	webhookEndpoint: webhookEndpointExecute,
};

export class AfipSdk implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Afip SDK',
		name: 'afipSdk',
		icon: { light: 'file:../../icons/afipsdk.svg', dark: 'file:../../icons/afipsdk.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["resource"] + ": " + $parameter["operation"] }}',
		description:
			'ARCA web services, automations, PDFs and electronic invoicing with Factura SDK, by Afip SDK',
		defaults: {
			name: 'Afip SDK',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'afipSdkApi',
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
					{ name: 'PDF', value: 'pdf' },
					{ name: 'Util', value: 'util' },
					{ name: 'Web Service', value: 'webService' },
					{ name: 'Webhook Endpoint', value: 'webhookEndpoint' },
				],
				default: 'webService',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['webService'] } },
				options: [
					{
						name: 'Get Authorization Token (TA)',
						value: 'getTokenAuth',
						action: 'Get authorization token (TA)',
						description:
							'Before calling an ARCA web service, you need a TA, also known as an authorization token',
					},
					{
						name: 'Make Requests to ARCA Service',
						value: 'makeRequest',
						action: 'Execute web service request',
						description: 'Send requests to the ARCA web services',
					},
				],
				default: 'getTokenAuth',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['automation'] } },
				options: [
					{
						name: 'Get Result',
						value: 'getAutomationResult',
						action: 'Get automation result',
						description:
							'Get the result of an automation, started with Run or by an invoicing operation, and wait if it is not complete',
					},
					{
						name: 'Run',
						value: 'runAutomation',
						action: 'Run automation',
						description: 'Execute an Afip SDK automation',
					},
					{
						name: 'Run and Wait',
						value: 'runAutomationAndWait',
						action: 'Run automation and wait',
						description: 'Execute an Afip SDK automation and wait for its result',
					},
				],
				default: 'runAutomation',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['pdf'] } },
				options: [
					{
						name: 'Create',
						value: 'createPdf',
						action: 'Create PDF',
						description: 'Create a PDF of your bills and send it to your customers',
					},
				],
				default: 'createPdf',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['util'] } },
				options: [
					{
						name: 'Get XML From Last Request',
						value: 'getLastXml',
						action: 'Get XML from last request',
						description:
							'Get an XML including the last request and response to send to ARCA support mail',
					},
				],
				default: 'getLastXml',
			},
			invoiceOperations,
			issuerOperations,
			certificateOperations,
			webhookEndpointOperations,

			// ── Fields ───────────────────────────────────────────────────
			...getTokenAuthFields,
			...makeRequestFields,
			...createPdfFields,
			...runAutomationAndWaitFields,
			...runAutomationFields,
			...getAutomationResultFields,
			...invoiceFields,
			...issuerFields,
			...certificateFields,
			...webhookEndpointFields,
		],
		usableAsTool: true,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		const invoicingExecutor = invoicingExecutors[resource];

		if (invoicingExecutor) return executeInvoicing.call(this, invoicingExecutor, operation);

		if (operation === 'getTokenAuth') return getTokenAuthExecute.call(this);
		if (operation === 'makeRequest') return makeRequestExecute.call(this);
		if (operation === 'getLastXml') return getLastXmlExecute.call(this);
		if (operation === 'createPdf') return createPdfExecute.call(this);
		if (operation === 'runAutomationAndWait') return runAutomationAndWaitExecute.call(this);
		if (operation === 'runAutomation') return runAutomationExecute.call(this);
		if (operation === 'getAutomationResult') return getAutomationResultExecute.call(this);

		throw new NodeOperationError(this.getNode(), `Operation "${operation}" not supported`);
	}
}

async function executeInvoicing(
	this: IExecuteFunctions,
	executor: ResourceExecute,
	operation: string,
): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

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
				continue;
			}

			throw itemError(this.getNode(), error, itemIndex);
		}
	}

	return [returnData];
}
