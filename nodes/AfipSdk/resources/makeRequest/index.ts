import type { INodeProperties } from 'n8n-workflow';
import { buildParameterFields } from '../../shared/fields';

export const makeRequestFields: INodeProperties[] = [
	...buildParameterFields('makeHttpRequest', [
		{ name: 'environment', example: 'dev' },
		{ name: 'method', example: '<AfipSDK method>' },
		{ name: 'wsid', example: 'wsfe' },
		{ name: '<key>', example: '<value>' },
	]),
];
