# Implementation Plan: AI Receipt Scanning & Payment Verification

## 1. Overview
Automate the process of verifying client payments by scanning transaction receipts (bank transfers, screenshots, etc.) using OCR/AI. The system will match the receipt against existing invoices, update financial records, and automatically issue a formal receipt to the client. Additionally, the finance dashboard will be enhanced to provide real-time insights into cashflow, assets, and pending transactions.

## 2. User Workflow
1. **Upload**: User (or client via WhatsApp/Portal) uploads an image/PDF of a transaction receipt.
2. **Scan (OCR)**: Gemini 2.0 Flash extracts key data: Date, Amount, Reference Number, Client Name.
3. **Match**: System searches for an `unpaid` or `partially_paid` invoice that matches the extracted criteria.
4. **Verify**: User confirms the match (or system auto-verifies if confidence is high).
5. **Action**:
   - Update `invoices.status` to `paid`.
   - Create a record in `payments` table.
   - Generate a Receipt PDF (via `pdf_service.py`).
   - (Optional) Send the receipt via WhatsApp/Email.
6. **Dashboard Review**: User checks the updated Finance Dashboard to see current cash on hand, available balance for expenses, and alerts for pending transactions.

## 3. Design & Aesthetic (Vercel Style)
All new components must adhere to the existing Vercel-inspired design system defined in `index.css`.
- **Typography**: Use `Geist` (Sans/Mono) for all text.
- **Color Palette**: Stick to the OKLCH-based Vercel Light Theme (Pure white backgrounds, high-contrast black text, subtle gray borders `oklch(0.92 0 0)`).
- **Components**: 
  - Reuse `.overview-stat-card` for financial metrics.
  - Reuse `.activity-item` for the transaction log.
  - Buttons must use `.btn-primary` (black/white) and `.btn-secondary` (white/gray).
- **Animations**: Implement `.fadeInUp` transitions for all new UI elements and modals.
- **Layout**: Maintain generous whitespace (24px - 32px padding) and a clean "Dashboard" feel with subtle cards and zero heavy shadows.

## 4. Backend Implementation (Python/FastAPI)

### 4.1. AI Service Extension (`app/ai_service.py`)
- Add `extract_receipt_data(image_bytes: bytes)` function.
- Use Gemini 2.0 Flash's multimodal capabilities to read the image directly.
- **Prompt Requirements**:
  - Extract: `transaction_date`, `amount`, `reference_number`, `sender_name`, `bank_name`.
  - Return JSON format.

### 4.2. Models & Validation (`app/models.py`)
- Define `ReceiptExtractionResult` Pydantic model.
- Define `PaymentVerificationRequest` (linking receipt to invoice).
- Define `FinancialSummaryOut` for dashboard data.

### 4.3. Business Logic (`app/invoice_service.py`)
- Add `match_receipt_to_invoice(extracted_data)`:
  - Query `invoices` where `total_amount` matches or `invoice_number` matches the `reference_number`.
  - Check for `unpaid` status.
- Add `process_payment_verification(invoice_id, payment_data)`:
  - Transaction-safe update: Update Invoice + Create Payment.
- Add `get_financial_summary(company_id)`:
  - **Cash on Hand**: Sum of all `payments` received from customers minus payments made to suppliers.
  - **Total Assets**: Cash on Hand + Sum of `unpaid` customer invoices (Accounts Receivable).
  - **Pending Transactions**:
    - `client_pending`: List of `unpaid` invoices for `type='customer'`.
    - `supplier_pending`: List of `unpaid` invoices for `type='supplier'`.
  - **Available for Expenses**: Cash on Hand minus `supplier_pending` total.

### 4.4. PDF Service Extension (`app/pdf_service.py`)
- Add `generate_receipt_pdf(payment, invoice, company)`:
  - Create a "Payment Receipt" template (distinct from "Invoice").

### 4.5. New API Routes (`app/routes/payments.py` & `app/routes/companies.py`)
- `POST /payments/scan-receipt`: Receives file, returns extracted data + suggested matches.
- `POST /payments/verify`: Confirms the payment and triggers actions.
- `GET /companies/financial-summary`: Returns the `FinancialSummaryOut` data for the dashboard.

## 5. Frontend Implementation (React/TypeScript)

### 5.1. Receipt Upload Component
- New page `pages/ReceiptScanPage.tsx`.
- Drag-and-drop file upload for receipt images.
- Loading state with "AI is scanning your receipt..." animation.

### 5.2. Verification UI
- Split screen: Left (Extracted Data), Right (Matching Invoice Details).
- "Match Found" alert if the system identifies a high-probability invoice.
- "Confirm & Process" button.

### 5.3. Enhanced Finance Dashboard (`pages/OverviewPage.tsx`)
- **Top Stats Bar**:
  - "Cash on Hand" (Current liquid balance).
  - "Available for Expenses" (Cash - Pending Supplier Bills).
  - "Total Assets" (Cash + Accounts Receivable).
- **Alerts Section**:
  - `AlertCard` for "Pending Client Payments" (Red dot if overdue).
  - `AlertCard` for "Pending Supplier Bills" (Needs attention).
- **Visualization**: Simple bar chart showing "Revenue vs Expenses" for the current month.

## 6. Database Considerations
- Ensure `clients.type` is correctly populated for all entries (`customer` or `supplier`).
- Consider adding a `due_date` to `invoices` table for better "Alert" logic.

## 7. Milestones
1. **Phase 1**: Receipt OCR logic with Gemini.
2. **Phase 2**: Matching algorithm & backend verification endpoint.
3. **Phase 3**: Financial summary logic (Backend) & Dashboard UI (Frontend).
4. **Phase 4**: Automated Receipt PDF generation and "issue" flow.
