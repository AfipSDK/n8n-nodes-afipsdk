import type { INodeProperties } from 'n8n-workflow';
import { buildParameterFields } from '../../shared/fields';

export const getTokenAuthFields: INodeProperties[] = [
	{
		displayName: 'Custom Certificate',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { resource: ['webService'], operation: ['getTokenAuth'] } },
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
	...buildParameterFields('webService', 'getTokenAuth', [
		{ name: 'environment', example: 'dev' },
		{ name: 'tax_id', example: '20409378472' },
		{ name: 'wsid', example: 'wsfe' },
		{ name: 'force_create', example: false },
	]),
];
