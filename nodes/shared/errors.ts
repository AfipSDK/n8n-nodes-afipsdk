import type { INode } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

/**
 * The error to throw for an item that failed. An error of the API or of the node keeps its
 * HTTP context (status, message and description) and learns the item it belongs to; anything
 * else becomes an operation error of that item.
 */
export function itemError(
	node: INode,
	error: unknown,
	itemIndex: number,
): NodeApiError | NodeOperationError {
	if (error instanceof NodeApiError || error instanceof NodeOperationError) {
		error.context.itemIndex = itemIndex;

		return error;
	}

	return new NodeOperationError(node, error as Error, { itemIndex });
}
