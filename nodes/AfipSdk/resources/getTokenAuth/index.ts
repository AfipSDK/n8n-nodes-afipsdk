import type { INodeProperties } from 'n8n-workflow';
import { buildParameterFields } from '../../shared/fields';

export const getTokenAuthFields: INodeProperties[] = [
	...buildParameterFields('getTokenAuth', [
		{ name: 'environment', example: 'dev' },
		{ name: 'wsid', example: 'wsfe' },
		{ name: 'tax_id', example: '20409378472' },
		{ name: 'force_create', example: false },
	]),
];
