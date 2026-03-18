import type { INodeProperties } from 'n8n-workflow';
import { buildParameterFields } from '../../shared/fields';

export const makeRequestFields: INodeProperties[] = [
	...buildParameterFields('webService', 'makeRequest', [
		{ name: 'environment', example: 'dev' },
		{ name: 'method', example: '<Afip SDK method>' },
		{ name: 'wsid', example: 'wsfe' },
		{ name: '<key>', example: '<value>' },
	]),
];
