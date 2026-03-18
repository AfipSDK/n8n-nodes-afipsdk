import type { INodeProperties } from 'n8n-workflow';
import { buildParameterFields } from '../../shared/fields';

export const makeRequestFields: INodeProperties[] = [
	...buildParameterFields('webService', 'makeRequest', []),
];
