import type { INodeProperties } from 'n8n-workflow';

export interface RequiredParam {
	name: string;
	example?: unknown;
}

/**
 * Generates the JSON parameters field for a given resource/operation.
 * @param requiredParams List of required parameters pre-loaded as an example.
 */
export function buildParameterFields(
	resource: string,
	operation: string,
	requiredParams: RequiredParam[] = [],
): INodeProperties[] {
	const displayWhen = {
		resource: [resource],
		operation: [operation],
	};

	const jsonDefault = requiredParams.length
		? JSON.stringify(
				Object.fromEntries(requiredParams.map(({ name, example = null }) => [name, example])),
				null,
				2,
			)
		: '{}';

	return [
		{
			displayName: 'Body (JSON)',
			name: 'parametersJson',
			type: 'json',
			default: jsonDefault,
			displayOptions: { show: displayWhen },
		},
	];
}
