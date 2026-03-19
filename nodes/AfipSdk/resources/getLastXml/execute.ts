import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export async function getLastXmlExecute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const operation = this.getNodeParameter('operation', 0) as string;
	
	if (operation === 'getLastXml') {
		const baseUrl = (await this.getCredentials('afipSdkApi')).baseUrl as string;
		const response = await this.helpers.httpRequestWithAuthentication.call(this, 'afipSdkApi', {
			method: 'GET',
			url: `${baseUrl}/afip/requests/last-xml`,
			json: true,
		});
		return [this.helpers.returnJsonArray(response)];
	}

	throw new NodeOperationError(this.getNode(), `Operation "${operation}" not supported`);
}
