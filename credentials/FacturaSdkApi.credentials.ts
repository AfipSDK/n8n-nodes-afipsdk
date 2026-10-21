import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class FacturaSdkApi implements ICredentialType {
	name = 'facturaSdkApi';

	displayName = 'Factura SDK API';

	icon: ICredentialType['icon'] = {
		light: 'file:../icons/afipsdk.svg',
		dark: 'file:../icons/afipsdk.dark.svg',
	};

	documentationUrl = 'https://afipsdk.com/docs/facturasdk/access-tokens';

	properties: INodeProperties[] = [
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'Access token of a Factura SDK project. It decides the environment: fsk_dev_… works in the sandbox, fsk_prod_… issues real invoices.',
		},
		{
			displayName: 'Webhook Secret',
			name: 'webhookSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'Secret of the webhook endpoint (whsec_…), used by the Factura SDK Trigger node to verify the signature of each event',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://app.afipsdk.com/api/v1',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.accessToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/issuers',
			qs: { limit: 1 },
		},
	};
}
