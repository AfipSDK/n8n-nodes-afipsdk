import type { INodeProperties } from 'n8n-workflow';
import { buildParameterFields } from '../../shared/fields';

export const runAutomationAndWaitFields: INodeProperties[] = [
	...buildParameterFields('automation', 'runAutomationAndWait', [
		{ name: 'automation', example: '<AUTOMATION NAME>' },
		{ name: 'params', example: '{ <YOUR PARAMS> }' },
	]),
];
