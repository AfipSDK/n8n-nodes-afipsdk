import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError, sleep } from 'n8n-workflow';

const POLL_INTERVAL_MS = 5000;
const MAX_ATTEMPTS = 24;

export async function runAutomationExecute(
	this: IExecuteFunctions,
): Promise<INodeExecutionData[][]> {
	const operation = this.getNodeParameter('operation', 0) as string;

	if (operation === 'runAutomation') {
		const raw = this.getNodeParameter('parametersJson', 0) as string;
		let body: Record<string, unknown> = {};
		try {
			body = JSON.parse(raw);
		} catch {
			throw new NodeOperationError(this.getNode(), 'Params JSON is not valid');
		}

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
