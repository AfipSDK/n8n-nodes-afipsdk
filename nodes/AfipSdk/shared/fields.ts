import type { INodeProperties } from 'n8n-workflow';

export interface RequiredParam {
	name: string;
	example?: unknown;
}

/**
 * Genera el campo de parámetros JSON para un resource/operation dado.
 * @param requiredParams Lista de parámetros requeridos que se pre-cargan como ejemplo.
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
			displayName: 'Params (JSON)',
			name: 'parametersJson',
			type: 'json',
			default: jsonDefault,
			displayOptions: { show: displayWhen },
		},
	];
}
