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
import { runAutomationFields } from './resources/runAutomation';
import { runAutomationExecute } from './resources/runAutomation/execute';

export class AfipSdk implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AfipSDK',
		name: 'afipSdk',
		icon: { light: 'file:afipsdk.svg', dark: 'file:afipsdk.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] }}',
		description: 'Official AFIPsdk nodes for connecting to ARCA services.',
		defaults: {
			name: 'AfipSDK',
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
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Create A PDF',
						value: 'createPdf',
						action: 'Create a PDF',
						description: 'Create a PDF of your bills, ready to send it to your customers',
					},
					{
						name: 'Get Token Authorization (TA)',
						value: 'getTokenAuth',
						action: 'Get token authorization (TA)',
						description:
							"Before calling ARCA's web services, you need an access token (AT), also known as an authorization token",
					},
					{
						name: 'Get XML From Last Request',
						value: 'getLastXml',
						action: 'Get XML from last request',
						description:
							'Get an XML including the last request and response to send to ARCA support mail',
					},
					{
						name: 'Make Requests to ARCA Service',
						value: 'makeRequest',
						action: 'Make HTTP request to ARCA',
						description: 'Send requests to the ARCA service using AfipSDK',
					},
					{
						name: 'Run Automation',
						value: 'runAutomation',
						action: 'Run automation',
						description: 'Execute an AfipSDK automation and wait for its result',
					},
				],
				default: 'getTokenAuth',
			},
			{
				displayName: 'Custom Certificate',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'Cert',
						name: 'cert',
						type: 'string',
						default: '',
						description: 'Content of cert.crt file',
					},
					{
						displayName: 'Key',
						name: 'key',
						type: 'string',
						default: '',
						description: 'Content of key.key file',
					},
				],
			},

			// ── Operations ───────────────────────────────────────────────
			...getTokenAuthFields,
			...makeRequestFields,
			...createPdfFields,
			...runAutomationFields,
		],
		usableAsTool: true,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const operation = this.getNodeParameter('operation', 0) as string;

		if (operation === 'getTokenAuth') return getTokenAuthExecute.call(this);
		if (operation === 'makeRequest') return makeRequestExecute.call(this);
		if (operation === 'getLastXml') return getLastXmlExecute.call(this);
		if (operation === 'createPdf') return createPdfExecute.call(this);
		if (operation === 'runAutomation') return runAutomationExecute.call(this);

		throw new NodeOperationError(this.getNode(), `Operation "${operation}" not supported`);
	}
}
