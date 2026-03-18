# n8n-nodes-afipsdk

This is an n8n community node that lets you use **Afip SDK** in your n8n workflows.

[Afip SDK](https://afipsdk.com/) is a service that simplifies integration with ARCA (formerly AFIP), Argentina's federal tax authority. It handles authentication, web service requests, PDF generation, and browser automations so you don't have to deal with SOAP/XML directly.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)
[Operations](#operations)
[Credentials](#credentials)
[Compatibility](#compatibility)
[Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

Search for `n8n-nodes-afipsdk` in the community nodes panel.

## Operations

### Web Service

| Operation | Description |
|-----------|-------------|
| **Get Ticket De Acceso (TA)** | Obtains an authorization token (Ticket de Acceso) required before calling any ARCA web service. Accepts `environment`, `tax_id`, `wsid`, and `force_create`. Supports custom `cert`/`key` for non-default certificates. |
| **Make Requests to ARCA Service** | Sends requests to any ARCA web service using a previously obtained TA. |

### Automation

| Operation | Description |
|-----------|-------------|
| **Run Automation** | Executes an Afip SDK automation asynchronously. Returns an automation ID you can use to poll for the result. |
| **Run Automation And Wait** | Executes an automation and blocks until it completes, returning the result directly. |
| **Get Automation Result** | Polls for the result of a previously started automation. Accepts an `automationId` and a `secondsToWait` retry interval. |

### PDF

| Operation | Description |
|-----------|-------------|
| **Create A PDF** | Generates a PDF from a template and optionally emails it to a recipient. Accepts `file_name`, `send_to`, and `template`. |

### Util

| Operation | Description |
|-----------|-------------|
| **Get XML From Last Request** | Returns the raw XML of the last request/response pair. Useful for debugging or sending to ARCA support. |

## Credentials

This node requires an **Afip SDK API** credential (`afipSdkApi`).

To set up credentials:
1. Sign up at [afipsdk.com](https://afipsdk.com/) to obtain your API key.
2. In n8n, go to **Settings → Credentials → New** and search for *Afip SDK*.
3. Enter your API key and save.

## Compatibility

- Tested with n8n `1.x`.
- Requires n8n Nodes API version 1.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [Afip SDK documentation](https://afipsdk.com/docs)
- [ARCA (formerly AFIP) web services](https://www.afip.gob.ar/ws/)
