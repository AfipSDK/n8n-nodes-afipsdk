import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export async function getTokenAuthExecute(
	this: IExecuteFunctions,
): Promise<INodeExecutionData[][]> {
	const operation = this.getNodeParameter('operation', 0) as string;
	
	if (operation === 'getTokenAuth') {
		const raw = this.getNodeParameter('parametersJson', 0) as string;
		let body: Record<string, unknown> = {};
		try {
			body = JSON.parse(raw);
		} catch {
			throw new NodeOperationError(this.getNode(), 'Params JSON is not valid');
		}

		const baseUrl = (await this.getCredentials('afipSdkApi')).baseUrl as string;
		const additionalFields = this.getNodeParameter('additionalFields', 0) as {
			cert?: string;
			key?: string;
		};
		const cert = additionalFields?.cert;
		const key = additionalFields?.key;

		const response = await this.helpers.httpRequestWithAuthentication.call(this, 'afipSdkApi', {
			method: 'POST',
			url: `${baseUrl}/afip/auth`,
			body: {
				...body,
				...(cert !== undefined && { cert }),
				...(key !== undefined && { key }),
			},
			json: true,
		});

		return [this.helpers.returnJsonArray(response)];
	}

	throw new NodeOperationError(this.getNode(), `Operation "${operation}" not sopported`);
}
