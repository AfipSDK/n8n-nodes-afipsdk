import type { INodeProperties } from 'n8n-workflow';

export const getAutomationResultFields: INodeProperties[] = [
	{
		displayName: 'Automation ID',
		name: 'automationId',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['automation'],
				operation: ['getAutomationResult'],
			},
		},
	},
	{
		displayName: 'Seconds To Wait',
		name: 'secondsToWait',
		type: 'number',
		default: 5,
		displayOptions: {
			show: {
				resource: ['automation'],
				operation: ['getAutomationResult'],
			},
		},
	},
];
