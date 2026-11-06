import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

type Show = { resource: string[]; operation: string[] };

/**
 * A required ID field shown for the given operations.
 */
export function idField(
	resource: string,
	operations: string[],
	name: string,
	displayName: string,
	description: string,
): INodeProperties {
	return {
		displayName,
		name,
		type: 'string',
		default: '',
		required: true,
		description,
		displayOptions: { show: { resource: [resource], operation: operations } },
	};
}

/**
 * The JSON body of the request, pre-loaded with an example.
 */
export function bodyField(resource: string, operation: string, example: object): INodeProperties {
	return {
		displayName: 'Body (JSON)',
		name: 'parametersJson',
		type: 'json',
		default: JSON.stringify(example, null, 2),
		description: 'Fields of the request, as in the Factura SDK documentation',
		displayOptions: { show: { resource: [resource], operation: [operation] } },
	};
}

/**
 * Whether to wait for an automation started by the operation, and how often to poll it.
 */
export function waitFields(resource: string, operations: string[]): INodeProperties[] {
	const show: Show = { resource: [resource], operation: operations };

	return [
		{
			displayName: 'Wait For Result',
			name: 'wait',
			type: 'boolean',
			default: true,
			description: 'Whether to wait until the automation finishes and return its result',
			displayOptions: { show },
		},
		{
			displayName: 'Seconds Between Checks',
			name: 'secondsToWait',
			type: 'number',
			default: 3,
			typeOptions: { minValue: 1 },
			description: 'How often to check the automation while waiting',
			displayOptions: { show: { ...show, wait: [true] } },
		},
	];
}

/**
 * Return All, Limit and Filters for a list operation.
 */
export function listFields(
	resource: string,
	operation: string,
	filters: INodePropertyOptions[] | INodeProperties[],
): INodeProperties[] {
	const show: Show = { resource: [resource], operation: [operation] };

	return [
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			default: false,
			description: 'Whether to return all results or only up to a given limit',
			displayOptions: { show },
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			default: 50,
			typeOptions: { minValue: 1 },
			description: 'Max number of results to return',
			displayOptions: { show: { ...show, returnAll: [false] } },
		},
		{
			displayName: 'Filters',
			name: 'filters',
			type: 'collection',
			placeholder: 'Add Filter',
			default: {},
			displayOptions: { show },
			options: filters as INodeProperties[],
		},
	];
}
