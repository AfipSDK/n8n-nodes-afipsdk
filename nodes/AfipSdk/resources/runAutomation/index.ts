import type { INodeProperties } from 'n8n-workflow';
import { buildParameterFields } from '../../shared/fields';

export const runAutomationFields: INodeProperties[] = [
	...buildParameterFields('runAutomation', [
		{ name: 'automation', example: '<AUTOMATION NAME>' },
		{ name: 'params', example: '{ <YOUR PARAMS> }' },
	]),
];
