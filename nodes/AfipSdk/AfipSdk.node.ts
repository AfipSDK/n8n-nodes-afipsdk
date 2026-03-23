import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
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

export class AfipSdk implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Afip SDK',
		name: 'afipSdk',
		icon: { light: 'file:../../icons/afipsdk.svg', dark: 'file:../../icons/afipsdk.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["resource"] + ": " + $parameter["operation"] }}',
		description: 'Official Afip SDK nodes.',
		defaults: {
			name: 'Afip SDK',
		},
		inputs: ['main'],
		outputs: ['main'],
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
					{ name: 'PDF', value: 'pdf' },
					{ name: 'Util', value: 'util' },
					{ name: 'Web Service', value: 'webService' },
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
						name: 'Get Automation Result',
						value: 'getAutomationResult',
						action: 'Get automation result',
						description: 'Get automation result and retry if the automation is not complete',
					},
					{
						name: 'Run Automation',
						value: 'runAutomation',
						action: 'Run automation',
						description: 'Execute an Afip SDK automation',
					},
					{
						name: 'Run Automation And Wait',
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
						name: 'Create A PDF',
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

			// ── Operations ───────────────────────────────────────────────
			...getTokenAuthFields,
			...makeRequestFields,
			...createPdfFields,
			...runAutomationAndWaitFields,
			...runAutomationFields,
			...getAutomationResultFields,
		],
		usableAsTool: true,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const operation = this.getNodeParameter('operation', 0) as string;

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
