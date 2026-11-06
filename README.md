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
| **Get Authorization Token (TA)** | Obtains an authorization token (Ticket de Acceso) required before calling any ARCA web service. Accepts `environment`, `tax_id`, `wsid`, and `force_create`. Supports custom `cert`/`key` for non-default certificates. |
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

## Factura SDK

[Factura SDK](https://afipsdk.com/docs/facturasdk/) issues electronic invoices end to end: issuers, certificates, authorization in ARCA, PDF and webhooks. The package includes two nodes for it, which use the **Factura SDK API** credential (`facturaSdkApi`): the access token of a Factura SDK project (`fsk_dev_…` for the sandbox, `fsk_prod_…` for production) and, for the trigger, the secret of your webhook endpoint.

### Factura SDK node

| Resource | Operations |
|----------|------------|
| **Invoice** | Create (with `Idempotency-Key` and an optional wait for the final status), Get, Get Many, Cancel |
| **Issuer** | Create, Get, Get Many, Update, Delete, Lookup (registration data of a CUIT), Get Sales Points, Create Sales Point, Create Certificate, Accept Delegation, Verify |
| **Certificate** | Create (upload or create in ARCA), Get, Get Many, Revoke, Renew (upload or in ARCA, keeping its ID), Delete, Authorize |
| **Webhook Endpoint** | Create, Get, Get Many, Update, Rotate Secret, Test, Get Deliveries |
| **Automation** | Get, with an optional wait until it finishes |

The operations that start an automation in ARCA (sales points, certificates created with the tax password, delegation, verification) wait for its result by default; turn off **Wait For Result** to get the automation ID and check it later. Bodies are sent as JSON, exactly as in the [documentation](https://afipsdk.com/docs/facturasdk/invoices). API errors come with the message, the rules that were not met and the problems by field.

### Factura SDK Trigger node

Starts the workflow when Factura SDK sends the result of an invoice: `invoice.approved`, `invoice.rejected` or `invoice.failed` (and `test`, if you select it). Create a webhook endpoint in Factura SDK with the production URL of the node (from the dashboard, *Configuración → Webhooks*, or with the Factura SDK node) and save its secret in the credential: the node verifies the `X-FacturaSDK-Signature` of every delivery and rejects the invalid ones. Factura SDK accepts one active endpoint per environment, so the node does not create it by itself.

## Credentials

### Afip SDK API

This node requires an **Afip SDK API** credential (`afipSdkApi`).

To set up credentials:
1. Sign up at [afipsdk.com](https://afipsdk.com/) to obtain your API key.
2. In n8n, go to **Settings → Credentials → New** and search for *Afip SDK*.
3. Enter your API key and save.

### Factura SDK API

The Factura SDK nodes require a **Factura SDK API** credential (`facturaSdkApi`):
1. In [app.afipsdk.com](https://app.afipsdk.com/), create a project of type Factura SDK and, in *Configuración → Access tokens*, a token of the environment you want to use.
2. In n8n, go to **Settings → Credentials → New** and search for *Factura SDK*.
3. Enter the access token and, if you use the trigger, the secret of your webhook endpoint.

## Compatibility

- Tested with n8n `1.x`.
- Requires n8n Nodes API version 1.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [Afip SDK documentation](https://afipsdk.com/docs)
- [ARCA (formerly AFIP) web services](https://www.afip.gob.ar/ws/)
