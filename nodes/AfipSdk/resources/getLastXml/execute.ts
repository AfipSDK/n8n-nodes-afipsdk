import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export async function getLastXmlExecute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const operation = this.getNodeParameter('operation', 0) as string;
	const baseUrl = (await this.getCredentials('afipSdkApi')).baseUrl as string;
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	if (operation !== 'getLastXml') {
		throw new NodeOperationError(this.getNode(), `Operation "${operation}" not supported`);
	}

	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		try {
			const response = await this.helpers.httpRequestWithAuthentication.call(this, 'afipSdkApi', {
				method: 'GET',
				url: `${baseUrl}/afip/requests/last-xml`,
				json: true,
			});
			const responseItems = this.helpers.returnJsonArray(response);
			returnData.push(...responseItems.map((item) => ({ ...item, pairedItem: { item: itemIndex } })));
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: itemIndex } });
			} else {
				if (error.context) {
					error.context.itemIndex = itemIndex;
					throw error;
				}
				throw new NodeOperationError(this.getNode(), error, { itemIndex });
			}
		}
	}

	return [returnData];
}
