import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

export function parseParametersJson(context: IExecuteFunctions, itemIndex = 0): Record<string, unknown> {
	const raw = context.getNodeParameter('parametersJson', itemIndex) as string;
	try {
		return JSON.parse(raw) as Record<string, unknown>;
	} catch {
		throw new NodeOperationError(context.getNode(), 'Params JSON is not valid');
	}
}
