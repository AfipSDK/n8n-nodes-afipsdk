import type { INodeProperties } from 'n8n-workflow';
import { buildParameterFields } from '../../shared/fields';

export const createPdfFields: INodeProperties[] = [
	...buildParameterFields('pdf', 'createPdf', [
		{ name: 'file_name', example: 'example.pdf' },
		{ name: 'send_to', example: 'test@example.com' },
		{ name: 'template', example: '{ <YOUR TEMPLATE DATA> }' },
	]),
];
