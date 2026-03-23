import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError, sleep } from 'n8n-workflow';

const MAX_ATTEMPTS = 24;

export async function getAutomationResultExecute(
	this: IExecuteFunctions,
): Promise<INodeExecutionData[][]> {
	const operation = this.getNodeParameter('operation', 0) as string;
	const baseUrl = (await this.getCredentials('afipSdkApi')).baseUrl as string;
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	if (operation !== 'getAutomationResult') {
		throw new NodeOperationError(this.getNode(), `Operation "${operation}" not supported`);
	}

	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		const automationId = this.getNodeParameter('automationId', itemIndex) as string;
		const secondsToWait = this.getNodeParameter('secondsToWait', itemIndex) as number * 1000;

		let resolved = false;
		for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
			await sleep(secondsToWait);
			const result = await this.helpers.httpRequestWithAuthentication.call(this, 'afipSdkApi', {
				method: 'GET',
				url: `${baseUrl}/automations/${automationId}`,
				json: true,
			});

			if ((result as { status: string }).status !== 'in_process') {
				const responseItems = this.helpers.returnJsonArray(result);
				returnData.push(...responseItems.map((item) => ({ ...item, pairedItem: { item: itemIndex } })));
				resolved = true;
				break;
			}
		}

		if (!resolved) {
			throw new NodeOperationError(
				this.getNode(),
				`Get Automation result timed out after ${MAX_ATTEMPTS * secondsToWait}s`,
				{ itemIndex },
			);
		}
	}

	return [returnData];
}
