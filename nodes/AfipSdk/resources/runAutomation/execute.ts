import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { parseParametersJson } from '../../utils';

export async function runAutomationExecute(
	this: IExecuteFunctions,
): Promise<INodeExecutionData[][]> {
	const operation = this.getNodeParameter('operation', 0) as string;
	const baseUrl = (await this.getCredentials('afipSdkApi')).baseUrl as string;
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	if (operation !== 'runAutomation') {
		throw new NodeOperationError(this.getNode(), `Operation "${operation}" not supported`);
	}

	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		const body = parseParametersJson(this, itemIndex);

		const created = await this.helpers.httpRequestWithAuthentication.call(this, 'afipSdkApi', {
			method: 'POST',
			url: `${baseUrl}/automations`,
			body,
			json: true,
		});

		const id = (created as { id: string }).id;
		if (!id) {
			throw new NodeOperationError(this.getNode(), 'Automation did not return an id', { itemIndex });
		}

		const responseItems = this.helpers.returnJsonArray(created);
		returnData.push(...responseItems.map((item) => ({ ...item, pairedItem: { item: itemIndex } })));
	}

	return [returnData];
}
