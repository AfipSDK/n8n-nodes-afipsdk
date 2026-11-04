import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { bodyField, idField, listFields, waitFields } from '../shared/fields';
import {
	facturaSdkRequest,
	listAll,
	parseBody,
	readFilters,
	resolveAutomation,
} from '../shared/request';

const RESOURCE = 'certificate';

export const certificateOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: [RESOURCE] } },
	options: [
		{
			name: 'Authorize',
			value: 'authorize',
			action: 'Authorize a certificate for wsfe',
			description:
				'Authorize in ARCA a certificate for the electronic billing web service (wsfe), with the tax password of its owner',
		},
		{
			name: 'Create',
			value: 'create',
			action: 'Create a certificate',
			description:
				'Upload a certificate (cert and key in PEM) or create one in ARCA (source automation, with the tax password)',
		},
		{
			name: 'Delete',
			value: 'delete',
			action: 'Delete a certificate',
			description:
				'Delete a certificate: it disappears from the project without being revoked in ARCA. The issuers that used it keep their reference.',
		},
		{
			name: 'Get',
			value: 'get',
			action: 'Get a certificate',
		},
		{
			name: 'Get Many',
			value: 'getAll',
			action: 'Get many certificates',
		},
		{
			name: 'Renew',
			value: 'renew',
			action: 'Renew a certificate',
			description:
				'Renew a certificate in place, keeping its ID: upload the new cert and key in PEM, or renew it in ARCA (source automation, with the tax password). A revoked certificate can not be renewed.',
		},
		{
			name: 'Revoke',
			value: 'revoke',
			action: 'Revoke a certificate',
			description: 'Revoke a certificate: it no longer signs',
		},
	],
	default: 'create',
};

export const certificateFields: INodeProperties[] = [
	idField(
		RESOURCE,
		['get', 'revoke', 'renew', 'delete', 'authorize'],
		'certificateId',
		'Certificate ID',
		'ID of the certificate',
	),
	bodyField(RESOURCE, 'create', { tax_id: '20111111112', cert: 'VALID_CERT', key: 'VALID_KEY' }),
	bodyField(RESOURCE, 'renew', { cert: 'VALID_CERT', key: 'VALID_KEY' }),
	bodyField(RESOURCE, 'authorize', { password: '<CLAVE_FISCAL>' }),
	...waitFields(RESOURCE, ['create', 'renew', 'authorize']),
	...listFields(RESOURCE, 'getAll', [
		{
			displayName: 'Tax ID (CUIT)',
			name: 'tax_id',
			type: 'string',
			default: '',
			description: 'CUIT that owns the certificate',
		},
		{
			displayName: 'Status',
			name: 'status',
			type: 'options',
			default: 'active',
			options: [
				{ name: 'Active', value: 'active' },
				{ name: 'Expired', value: 'expired' },
				{ name: 'Revoked', value: 'revoked' },
			],
		},
	]),
];

export async function certificateExecute(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	const certificateId = () => this.getNodeParameter('certificateId', itemIndex) as string;

	if (operation === 'create' || operation === 'renew' || operation === 'authorize') {
		const path =
			operation === 'create' ? 'certificates' : `certificates/${certificateId()}/${operation}`;
		const wait = this.getNodeParameter('wait', itemIndex, true) as boolean;
		const secondsToWait = this.getNodeParameter('secondsToWait', itemIndex, 3) as number;

		const result = await facturaSdkRequest(this, 'POST', path, {
			body: parseBody(this, itemIndex),
		});

		return resolveAutomation(this, result, wait, secondsToWait, itemIndex);
	}

	if (operation === 'get') {
		return facturaSdkRequest(this, 'GET', `certificates/${certificateId()}`);
	}

	if (operation === 'getAll') {
		const returnAll = this.getNodeParameter('returnAll', itemIndex) as boolean;
		const limit = returnAll ? 0 : (this.getNodeParameter('limit', itemIndex) as number);

		return listAll(this, 'certificates', readFilters(this, itemIndex), returnAll, limit);
	}

	if (operation === 'revoke') {
		return facturaSdkRequest(this, 'POST', `certificates/${certificateId()}/revoke`);
	}

	if (operation === 'delete') {
		await facturaSdkRequest(this, 'DELETE', `certificates/${certificateId()}`);

		return { success: true };
	}

	throw new Error(`Operation "${operation}" not supported`);
}
