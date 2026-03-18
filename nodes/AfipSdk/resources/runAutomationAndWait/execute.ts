import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError, sleep } from 'n8n-workflow';
import { parseParametersJson } from '../../utils';

const POLL_INTERVAL_MS = 5000;
const MAX_ATTEMPTS = 24;

export async function runAutomationAndWaitExecute(
	this: IExecuteFunctions,
): Promise<INodeExecutionData[][]> {
	const operation = this.getNodeParameter('operation', 0) as string;

	if (operation === 'runAutomationAndWait') {
		const body = parseParametersJson(this);

		const baseUrl = (await this.getCredentials('afipSdkApi')).baseUrl as string;
		const created = await this.helpers.httpRequestWithAuthentication.call(this, 'afipSdkApi', {
			method: 'POST',
			url: `${baseUrl}/automations`,
			body,
			json: true,
		});

		const id = (created as { id: string }).id;
		if (!id) {
			throw new NodeOperationError(this.getNode(), 'Automation did not return an id');
		}

		for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
			await sleep(POLL_INTERVAL_MS);

			const result = await this.helpers.httpRequestWithAuthentication.call(this, 'afipSdkApi', {
				method: 'GET',
				url: `${baseUrl}/automations/${id}`,
				json: true,
			});

			if ((result as { status: string }).status !== 'in_process') {
				return [this.helpers.returnJsonArray(result)];
			}
		}

		throw new NodeOperationError(
			this.getNode(),
			`Automation "${body.automation}" timed out after ${(MAX_ATTEMPTS * POLL_INTERVAL_MS) / 1000}s`,
		);
	}

	throw new NodeOperationError(this.getNode(), `Operation "${operation}" not supported`);
}
