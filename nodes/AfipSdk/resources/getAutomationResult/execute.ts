import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError, sleep } from 'n8n-workflow';
import { itemError } from '../../../shared/errors';

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

	const getAutomation = async (automationId: string) =>
		this.helpers.httpRequestWithAuthentication.call(this, 'afipSdkApi', {
			method: 'GET',
			url: `${baseUrl}/automations/${automationId}`,
			json: true,
		});

	const pushResult = (result: unknown, itemIndex: number) => {
		const responseItems = this.helpers.returnJsonArray(result as Parameters<typeof this.helpers.returnJsonArray>[0]);

		returnData.push(...responseItems.map((item) => ({ ...item, pairedItem: { item: itemIndex } })));
	};

	for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		try {
			const automationId = this.getNodeParameter('automationId', itemIndex) as string;
			const wait = this.getNodeParameter('wait', itemIndex, true) as boolean;

			if (!wait) {
				pushResult(await getAutomation(automationId), itemIndex);
				continue;
			}

			const secondsToWait = (this.getNodeParameter('secondsToWait', itemIndex) as number) * 1000;

			let resolved = false;
			for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
				await sleep(secondsToWait);
				const result = await getAutomation(automationId);

				if ((result as { status: string }).status !== 'in_process') {
					pushResult(result, itemIndex);
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
		} catch (error) {
			if (this.continueOnFail()) {
				returnData.push({
					json: { error: (error as Error).message },
					pairedItem: { item: itemIndex },
				});
				continue;
			}

			throw itemError(this.getNode(), error, itemIndex);
		}
	}

	return [returnData];
}
