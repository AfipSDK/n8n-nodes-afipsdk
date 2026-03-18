import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError, sleep } from 'n8n-workflow';

const MAX_ATTEMPTS = 24;

export async function runAutomationAndWaitExecute(
	this: IExecuteFunctions,
): Promise<INodeExecutionData[][]> {
	const operation = this.getNodeParameter('operation', 0) as string;

	if (operation === 'getAutomationResult') {
		const automationId = this.getNodeParameter('automationId', 0) as string;
		const secondsToWait = this.getNodeParameter('secondsToWait', 0) as number * 1000;
		const baseUrl = (await this.getCredentials('afipSdkApi')).baseUrl as string;

		for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
			await sleep(secondsToWait);
			const result = await this.helpers.httpRequestWithAuthentication.call(this, 'afipSdkApi', {
				method: 'GET',
				url: `${baseUrl}/automations/${automationId}`,
				json: true,
			});

			if ((result as { status: string }).status !== 'in_process') {
				return [this.helpers.returnJsonArray(result)];
			}
		}

		throw new NodeOperationError(
			this.getNode(),
			`Get Automation result timed out after ${(MAX_ATTEMPTS * secondsToWait)}s`,
		);
	}

	throw new NodeOperationError(this.getNode(), `Operation "${operation}" not supported`);
}
