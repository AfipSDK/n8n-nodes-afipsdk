import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class AfipSdkApi implements ICredentialType {
	name = 'afipSdkApi';

	displayName = 'Afip SDK API';

	icon: ICredentialType['icon'] = { light: 'file:../icons/afipsdk.svg', dark: 'file:../icons/afipsdk.dark.svg' };

	documentationUrl = 'https://docs.afipsdk.com/';

	properties: INodeProperties[] = [
		{
			displayName: 'Bearer Token',
			name: 'token',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'Access token of your project in app.afipsdk.com. The token of an Afip SDK project is for the Web Service, Automation, PDF and Util resources; the token of a Factura SDK project (fsk_dev_… for the sandbox, fsk_prod_… for real invoices) is for the Invoice, Issuer, Certificate and Webhook Endpoint resources and for the Afip SDK Trigger.',
		},
		{
			displayName: 'Webhook Secret',
			name: 'webhookSecret',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'Secret of the Factura SDK webhook endpoint (whsec_…). Only needed if you created the endpoint yourself instead of letting the Afip SDK Trigger register it.',
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
				Authorization: '=Bearer {{$credentials.token}}',
			},
		},
	};

	// The current project is readable with the token of any product
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/projects/current',
		},
	};
}
