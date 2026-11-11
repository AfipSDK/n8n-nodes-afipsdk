# n8n-nodes-afipsdk

This is an n8n community node that lets you use **Afip SDK** in your n8n workflows.

[Afip SDK](https://afipsdk.com/) is a service that simplifies integration with ARCA (formerly AFIP), Argentina's federal tax authority. It handles authentication, web service requests, PDF generation and browser automations so you don't have to deal with SOAP/XML directly, and with [Factura SDK](https://afipsdk.com/docs/facturasdk/) it issues electronic invoices end to end: issuers, certificates, authorization in ARCA, PDF and webhooks.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)
[Operations](#operations)
[Afip SDK Trigger](#afip-sdk-trigger)
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
| **Run** | Executes an Afip SDK automation asynchronously. Returns an automation ID you can use to poll for the result. |
| **Run and Wait** | Executes an automation and blocks until it completes, returning the result directly. |
| **Get Result** | Gets the result of an automation started with Run or by an invoicing operation (a certificate created in ARCA, a verification). Waits until it finishes, checking every `secondsToWait`, or returns its current state when **Wait For Result** is off. |

### PDF

| Operation | Description |
|-----------|-------------|
| **Create** | Generates a PDF from a template and optionally emails it to a recipient. Accepts `file_name`, `send_to`, and `template`. |

### Util

| Operation | Description |
|-----------|-------------|
| **Get XML From Last Request** | Returns the raw XML of the last request/response pair. Useful for debugging or sending to ARCA support. |

### Electronic invoicing with Factura SDK

| Resource | Operations |
|----------|------------|
| **Invoice** | Create (with `Idempotency-Key` and an optional wait for the final status), Get, Get Many, Cancel |
| **Issuer** | Create, Get, Get Many, Update, Delete, Lookup (registration data of a CUIT), Get Sales Points, Create Sales Point, Create Certificate, Accept Delegation, Verify |
| **Certificate** | Create (upload or create in ARCA), Get, Get Many, Revoke, Renew (upload or in ARCA, keeping its ID), Delete, Authorize |
| **Webhook Endpoint** | Create, Get, Get Many, Update, Rotate Secret, Test, Get Deliveries |

The operations that start an automation in ARCA (sales points, certificates created with the tax password, delegation, verification) wait for its result by default; turn off **Wait For Result** to get the automation ID and check it later with **Automation → Get Result**. Bodies are sent as JSON, exactly as in the [documentation](https://afipsdk.com/docs/facturasdk/invoices). API errors come with the message, the rules that were not met and the problems by field.

## Afip SDK Trigger

Starts the workflow when Factura SDK sends the result of an invoice: `invoice.approved`, `invoice.rejected` or `invoice.failed` (and `test`, if you select it). When you activate the workflow, the node registers its URL as the webhook endpoint of the environment of the credential and keeps the secret; when you deactivate it, the endpoint becomes inactive. The node verifies the `X-FacturaSDK-Signature` of every delivery and rejects the invalid ones.

Factura SDK accepts one active endpoint per environment. If another endpoint is active, the activation fails and tells you its URL: change that URL to the URL of the node, or deactivate it, and activate the workflow again. To test the trigger in the editor while the workflow is active, use a credential with a sandbox token: the sandbox has its own endpoint. If you prefer to create the endpoint yourself (from the dashboard, *Configuración → Webhooks*, or with the Webhook Endpoint resource) with the production URL of the node, save its secret in the credential; the node uses it when it finds the endpoint already registered.

## Credentials

Both nodes use the **Afip SDK API** credential (`afipSdkApi`): the access token of a project in [app.afipsdk.com](https://app.afipsdk.com/).

1. In [app.afipsdk.com](https://app.afipsdk.com/), create a project and, in *Configuración → Access tokens*, a token.
2. In n8n, go to **Settings → Credentials → New** and search for *Afip SDK*.
3. Enter the token and save.

The token decides what the credential can do:

- The token of an **Afip SDK** project is for the Web Service, Automation, PDF and Util resources.
- The token of a **Factura SDK** project is for the Invoice, Issuer, Certificate and Webhook Endpoint resources and for the Afip SDK Trigger. `fsk_dev_…` works in the sandbox, `fsk_prod_…` issues real invoices.

A resource used with the token of the other product fails with the message of the API. The webhook secret is only needed if you create the webhook endpoint yourself instead of letting the trigger register it.

## Compatibility

- Tested with n8n `1.x`.
- Requires n8n Nodes API version 1.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [Afip SDK documentation](https://afipsdk.com/docs)
- [Factura SDK documentation](https://afipsdk.com/docs/facturasdk/)
- [ARCA (formerly AFIP) web services](https://www.afip.gob.ar/ws/)
