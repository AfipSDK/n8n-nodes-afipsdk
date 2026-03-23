import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError, sleep } from 'n8n-workflow';
import { parseParametersJson } from '../../utils';

const POLL_INTERVAL_MS = 5000;
const MAX_ATTEMPTS = 24;

export async function runAutomationAndWaitExecute(
	this: IExecuteFunctions,
): Promise<INodeExecutionData[][]> {
	const operation = this.getNodeParameter('operation', 0) as string;
	const baseUrl = (await this.getCredentials('afipSdkApi')).baseUrl as string;
	const items = this.getInputData();
	const returnData: INodeExecutionData[] = [];

	if (operation !== 'runAutomationAndWait') {
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

		let resolved = false;
		for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
			await sleep(POLL_INTERVAL_MS);

			const result = await this.helpers.httpRequestWithAuthentication.call(this, 'afipSdkApi', {
				method: 'GET',
				url: `${baseUrl}/automations/${id}`,
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
				`Automation "${body.automation}" timed out after ${(MAX_ATTEMPTS * POLL_INTERVAL_MS) / 1000}s`,
				{ itemIndex },
			);
		}
	}

	return [returnData];
}
