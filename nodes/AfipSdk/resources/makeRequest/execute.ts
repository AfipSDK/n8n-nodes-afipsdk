import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { parseParametersJson } from '../../utils';

export async function makeRequestExecute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const operation = this.getNodeParameter('operation', 0) as string;
	const baseUrl = (await this.getCredentials('afipSdkApi')).baseUrl as string;
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	if (operation !== 'makeRequest') {
		throw new NodeOperationError(this.getNode(), `Operation "${operation}" not supported`);
	}

	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		const body = parseParametersJson(this, itemIndex);

		const response = await this.helpers.httpRequestWithAuthentication.call(this, 'afipSdkApi', {
			method: 'POST',
			url: `${baseUrl}/afip/requests`,
			body,
			json: true,
		});
		const responseItems = this.helpers.returnJsonArray(response);
		returnData.push(...responseItems.map((item) => ({ ...item, pairedItem: { item: itemIndex } })));
	}

	return [returnData];
}
