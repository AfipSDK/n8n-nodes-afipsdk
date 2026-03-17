import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export async function createPdfExecute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const operation = this.getNodeParameter('operation', 0) as string;
	
	if (operation === 'createPdf') {
		const raw = this.getNodeParameter('parametersJson', 0) as string;
		let body: Record<string, unknown> = {};
		try {
			body = JSON.parse(raw);
		} catch {
			throw new NodeOperationError(this.getNode(), 'Params JSON is not valid');
		}

		const baseUrl = (await this.getCredentials('afipSdkApi')).baseUrl as string;
		const response = await this.helpers.httpRequestWithAuthentication.call(this, 'afipSdkApi', {
			method: 'POST',
			url: `${baseUrl}/pdfs`,
			body,
			json: true,
		});
		return [this.helpers.returnJsonArray(response)];
	}

	throw new NodeOperationError(this.getNode(), `Operation "${operation}" not sopported`);
}
