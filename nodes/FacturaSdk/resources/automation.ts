import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { idField, waitFields } from '../shared/fields';
import { facturaSdkRequest, waitForAutomation } from '../shared/request';

const RESOURCE = 'automation';

export const automationOperations: INodeProperties = {
	displayName: 'Operation',
	name: 'operation',
	type: 'options',
	noDataExpression: true,
	displayOptions: { show: { resource: [RESOURCE] } },
	options: [
		{
			name: 'Get',
			value: 'get',
			action: 'Get an automation',
			description:
				'Get an automation started by another operation (a certificate created in ARCA, a verification) and, if you want, wait until it finishes',
		},
	],
	default: 'get',
};

export const automationFields: INodeProperties[] = [
	idField(RESOURCE, ['get'], 'automationId', 'Automation ID', 'ID of the automation'),
	...waitFields(RESOURCE, ['get']),
];

export async function automationExecute(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject> {
	if (operation === 'get') {
		const automationId = this.getNodeParameter('automationId', itemIndex) as string;
		const wait = this.getNodeParameter('wait', itemIndex, true) as boolean;
		const secondsToWait = this.getNodeParameter('secondsToWait', itemIndex, 3) as number;

		if (wait) {
			return waitForAutomation(this, automationId, secondsToWait, itemIndex);
		}

		return facturaSdkRequest(this, 'GET', `automations/${automationId}`);
	}

	throw new Error(`Operation "${operation}" not supported`);
}
