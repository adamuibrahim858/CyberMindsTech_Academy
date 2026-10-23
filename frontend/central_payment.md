Central Payment Integration Guide
Central CyberMinds Gateway → Paystack
Phase 1 – Analysis Complete. No files were modified. This document is read-only until you approve Phase 3.

1. Architecture Summary
The project does not call Paystack directly. Instead, it calls an internal Central CyberMinds Payment Gateway (a middleware server at https://workspace.cybermindstech.com.ng). That gateway owns the Paystack credentials and is the only service that talks to Paystack. The Laravel app is a gateway client.


┌──────────────────────────────────────────────────────────────────────────┐
│                          This Laravel App                                │
│                                                                          │
│  [User Browser]                                                          │
│       │                                                                  │
│       ▼                                                                  │
│  WalletAccounts (Livewire)  ──POST──►  Central Gateway /api/payment/initialize
│       │                                       │
│       │  ◄── authorization_url ───────────────┘
│       │
│       ▼
│  [User redirected to Paystack Checkout]
│       │
│       │  (User pays on Paystack)
│       │
│       ├──── Webhook (server→server) ──────────────────────────────────────►
│       │         POST /api/payment/webhook                                  │
│       │         ◄── PaymentWebhookController.handle()                      │
│       │                                                                    │
│       └──── Callback (browser redirect) ────────────────────────────────► │
│                  GET /paystack-callback                                    │
│                  ◄── PaymentGatewaysController.handlePaystackCallback()    │
└──────────────────────────────────────────────────────────────────────────┘
The wallet is never credited during initialization. Credit only happens via:

Webhook (preferred, server-to-server) — PaymentWebhookController
Callback fallback (browser redirect) — PaymentGatewaysController queries the gateway status API and credits if confirmed.
2. Relevant Files and Responsibilities
#	File	Responsibility
1	
Modules/User/Livewire/Wallet/WalletAccounts.php
UI logic: amount input, confirmation modal, and initiatePaystackPayment() which calls the gateway
2	
Modules/User/app/Http/Controllers/PaymentGatewaysController.php
Handles Paystack browser callback; queries gateway for status; credits wallet as fallback
3	
Modules/User/app/Http/Controllers/Api/PaymentWebhookController.php
Receives server-to-server webhook from Central Gateway; authenticates with API key; credits wallet
4	
Modules/User/app/Models/WalletHistory.php
Eloquent model for new_wallet_histories table; stores all funding transactions
5	
Modules/User/app/Models/Wallet.php
Eloquent model for wallet; balance stored encrypted with Crypt::encrypt()
6	
config/services.php
central_gateway.url and central_gateway.api_secret_key pulled from .env
7	
Modules/User/routes/web.php
 L150–151	Defines admin.show_wallet and paystack.callback web routes
8	
routes/api.php
 L46–47	Defines POST /api/payment/webhook — no auth middleware (authenticated by API key header)
9	
database/migrations/2025_08_13_165649_create_new_wallet_histories_table.php
Creates new_wallet_histories table
10	
database/migrations/2026_08_30_000001_add_central_reference_to_new_wallet_histories_table.php
Adds central_reference column for reconciliation with the gateway
11	
Modules/User/resources/views/livewire/wallet/wallet-accounts.blade.php
Blade view: amount input form and Paystack confirmation modal
3. Complete Payment Flow (Step-by-Step)
Step 1 — User Enters Amount
File: wallet-accounts.blade.php
User types a funding amount (min ₦100) into wire:model.live="paystackAmount".

Step 2 — Show Confirmation Modal
File: WalletAccounts.php → showConfirmation()
Validates paystackAmount ≥ 100, then dispatches show-paystack-confirmation (JS Bootstrap modal).

Step 3 — User Confirms → initiatePaystackPayment() fires
File: WalletAccounts.php → initiatePaystackPayment()


a) Server-side re-validates amount (min:100, max:10,000,000)
b) Opens DB::beginTransaction()
c) Reads gateway URL and API secret key from config/services.php
d) Reads school_email from GeneralSetting model
e) Generates a unique external reference: 'CM_' + random 12-char string
f) Creates a WalletHistory record with status = 'pending'
Step 4 — POST to Central Gateway
File: WalletAccounts.php → Http::post(...)
Endpoint: POST https://workspace.cybermindstech.com.ng/api/payment/initialize
Auth header: X-CyberMinds-API-Key: {secret_key} (also sent as X-API-Key and X-CyberMinds-Key for gateway compatibility)

Request payload:

json

{
  "amount": 5000,
  "currency": "NGN",
  "email": "school@example.com",
  "type": "wallet_funding",
  "external_reference": "CM_ABCXYZ123456",
  "callback_url": "https://yourdomain.com/paystack-callback",
  "source_portal": "https://yourdomain.com",
  "wallet_id": 1,
  "description": "Wallet Top-Up",
  "metadata": {
    "user_id": 42,
    "wallet_history_id": 17
  }
}
Gateway response:

json

{
  "success": true,
  "data": {
    "authorization_url": "https://checkout.paystack.com/xxxx",
    "reference": "CM-PAY-xxxxxxxx",
    "access_code": "xxxx"
  }
}
Step 5 — Update Local Record + Commit
Updates WalletHistory with central_reference (the gateway's CM-PAY-... reference) and extra_data (access_code)
DB::commit()
Dispatches hide-paystack-confirmation (close modal)
Redirects user to authorization_url (Paystack checkout page)
Step 6A — Webhook (Primary Path)
File: PaymentWebhookController.php
Route: POST /api/payment/webhook (no CSRF, no auth middleware — authenticated via API key header)


a) Reads X-CyberMinds-API-Key header from request
b) Compares with config key using hash_equals() (constant-time)
c) Rejects with 401 if mismatch
d) Extracts external_reference, reference (central_reference), and status from payload
e) Finds WalletHistory by reference OR central_reference (lockForUpdate)
f) Idempotency check: if already 'completed' or 'successful' → return 200 immediately
g) If status is 'success'/'completed'/'charge.success' etc:
   → lockForUpdate() on Wallet
   → Decrypt balance, add amount, re-encrypt with Crypt::encrypt()
   → Update WalletHistory status = 'successful'
   → DB::commit()
h) If failed/cancelled → set status = 'failed', DB::commit()
Step 6B — Browser Callback (Fallback Path)
File: PaymentGatewaysController.php
Route: GET /paystack-callback (auth-protected, under User module middleware)


a) Extracts reference from ?external_reference= or ?reference= or ?trxref=
b) Finds WalletHistory by reference OR central_reference
c) If already 'completed'/'successful' → redirect with success (webhook already ran)
d) Queries Central Gateway: POST /api/payment/status with both references
e) If gateway confirms success → creditWallet() [uses lockForUpdate for idempotency]
f) If failed → mark 'failed'
g) If still pending → inform user "processing"
4. Configuration & Environment Variables
.env (actual values from project)
env

CENTRAL_PAYMENT_GATEWAY_URL=https://workspace.cybermindstech.com.ng/
CENTRAL_PAYMENT_GATEWAY_API_SECRET_KEY=<secret_key>
config/services.php
php

'central_gateway' => [
    'url'            => env('CENTRAL_PAYMENT_GATEWAY_URL', env('CYBERMINDS_PAYMENT_GATEWAY_URL')),
    'api_secret_key' => env('CENTRAL_PAYMENT_GATEWAY_API_SECRET_KEY',
                            env('CENTRAL_PAYMENT_GATEWAY_SECRET',
                            env('API_SECRET_KEY'))),
],
NOTE

The config reads from multiple fallback env keys for backward compatibility. The canonical keys are CENTRAL_PAYMENT_GATEWAY_URL and CENTRAL_PAYMENT_GATEWAY_API_SECRET_KEY.

5. Database Schema
Table: new_wallet_histories
Column	Type	Notes
id	bigint PK	Auto-increment
wallet_id	bigint FK	References wallets.id
type	enum	funding, payment, refund
amount	decimal(12,2)	Raw amount (NOT encrypted in history)
description	string nullable	e.g. "Wallet Top-Up via Central CyberMinds Gateway"
reference	string unique nullable	Local external reference (CM_XXXXXXXXXXXXXX)
central_reference	string nullable	Gateway reference (CM-PAY-...)
status	enum	pending, completed, failed, cancelled
channel	string nullable	e.g. Paystack
extra_data	json nullable	Stores access_code, central_reference, webhook_received_at
created_at/updated_at	timestamps	Standard
Table: wallets
Column	Type	Notes
id	bigint PK	
user_id	bigint FK	References users.id
balance	text	Encrypted with Crypt::encrypt()
IMPORTANT

Wallet balance is stored encrypted. Always use Crypt::decrypt($wallet->balance) to read and Crypt::encrypt($value) to write. Never store plain-text balance.

6. Security & Error-Handling Observations
Concern	Mechanism
API Key Authentication (outbound)	Three header aliases sent simultaneously: X-CyberMinds-API-Key, X-API-Key, X-CyberMinds-Key
Webhook Authentication (inbound)	hash_equals() comparison (constant-time, prevents timing attacks)
Idempotency	lockForUpdate() pessimistic DB lock; checks status IN ('completed','successful') before crediting
Duplicate payment prevention	reference column has a unique constraint; wallet credit is always inside a DB transaction
Encrypted wallet balance	Crypt::encrypt/decrypt wrapping every read/write
Error logging	All failures logged with Log::error() — API secret is never logged
Rollback on failure	DB::rollBack() in all catch blocks; the pending WalletHistory row is orphaned (not deleted) but status remains pending so it can be audited
CSRF	Webhook route (/api/payment/webhook) is in the api middleware group, which has no CSRF protection by default — correct for server-to-server
Callback race condition	Both the webhook path and callback path check the idempotency status before crediting
Input validation	Amount validated server-side twice: in showConfirmation() and again in initiatePaystackPayment()
WARNING

The callback route paystack.callback sits inside the authenticated user middleware group. If a user's session expires between redirect and return, they would be redirected to login. The wallet will still be credited eventually via webhook, but the user experience would be broken.

7. Replication Guide (for another feature or project)
What You Can Reuse Directly
Component	Reusability
PaymentWebhookController	100% reusable — only change what you do after crediting (e.g., mark invoice paid instead of funding wallet)
PaymentGatewaysController::creditWallet()	Reusable as-is for wallet funding; adapt for other payment types
config/services.php block	Copy as-is
.env variables	Copy as-is
WalletHistory model + migrations	Reusable for wallet features; adapt for different use cases
Components That Need Modification
Component	What Changes
Livewire component	Change $type payload from wallet_funding to your use-case (e.g., invoice_payment)
Webhook controller	Instead of crediting a wallet, mark an invoice/order as paid
Callback route	Point to your feature's relevant redirect destination
metadata in payload	Pass whatever IDs you need back (e.g., invoice_id, student_id)
8. Implementation Sequence for a New Feature

1. Add env vars (if not already present)
   CENTRAL_PAYMENT_GATEWAY_URL=...
   CENTRAL_PAYMENT_GATEWAY_API_SECRET_KEY=...
2. Verify config/services.php has 'central_gateway' block
3. Create DB migration for a "pending transactions" table
   - id, relevant_entity_id (e.g. invoice_id), amount, reference, 
     central_reference, status (pending/completed/failed), extra_data, timestamps
4. Create Eloquent model for that table
5. Create a Livewire component (or controller action) that:
   a. Validates amount
   b. Creates a local pending record
   c. POSTs to /api/payment/initialize with your payload
   d. Redirects to authorization_url
6. Register the callback route:
   Route::get('your-callback', [YourController::class, 'handleCallback'])->name('your.callback');
7. Create the callback controller:
   - Look up pending record
   - If already done → success redirect
   - Query /api/payment/status from gateway
   - If confirmed → apply business logic (mark paid, send receipt, etc.)
8. The webhook at POST /api/payment/webhook already exists — extend it or 
   create a second webhook endpoint for a new payment type:
   Route::post('payment/webhook/invoices', [InvoiceWebhookController::class, 'handle']);
9. Register the webhook URL in the Central Gateway admin panel
   so it knows where to POST for this payment type.
10. Test with a small amount end-to-end.
9. Testing Checklist
 CENTRAL_PAYMENT_GATEWAY_URL and CENTRAL_PAYMENT_GATEWAY_API_SECRET_KEY set correctly in .env
 php artisan config:clear run after changing .env
 POST /api/payment/initialize returns authorization_url successfully
 Redirect to Paystack checkout works
 GET /paystack-callback correctly resolves the external_reference from query string
 Callback correctly queries POST /api/payment/status from gateway
 Wallet (or target entity) is credited/updated after successful callback
 Webhook (POST /api/payment/webhook) rejects requests with wrong API key (401)
 Webhook correctly credits wallet on charge.success/payment.success events
 Idempotency: sending the same webhook payload twice does NOT double-credit
 Failed payment (failed/cancelled status) sets status to failed without crediting
 DB transaction rollback works if gateway is unreachable
 Logs show no sensitive data (API secret never logged)
 Duplicate reference prevention: reference column unique constraint enforced
 Encrypted wallet balance reads/writes correctly with Crypt::decrypt/encrypt
10. Implementation Plan (Phase 3 — Awaiting Approval)
IMPORTANT

No changes have been made. Describe the new feature you want to implement (e.g., "use the same Central Gateway for student invoice payments") and I will prepare a concrete, file-by-file implementation plan for your review.

The following decisions are needed before Phase 3:

Target feature: What will be paid for? (wallet funding again, invoice settlement, token purchase, other?)
Target project: Same project, or a new Laravel project?
Entity model: Which model/table needs to be updated after a successful payment?
Email source: Should the payment email come from GeneralSetting.school_email or from the authenticated user?
Webhook: Will a new webhook endpoint be needed, or will the existing /api/payment/webhook be extended?