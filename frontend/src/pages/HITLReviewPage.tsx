import { useState, useCallback, useEffect } from "react";
import { UserButton, useAuth } from "@clerk/clerk-react";
import { Link } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface PreVetLineItem {
  item_id: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
  origin_country: string;
  ahtn_code: string;
  ahtn_description: string;
  tariff_rate: string;
  tariff_amount: number;
  similarity: number;
  requires_hitl: boolean;
  flags: string[];
}

interface PreVetResult {
  invoice_id: string;
  line_items: PreVetLineItem[];
  total_tariff: number;
  any_requires_hitl: boolean;
  all_flags: string[];
}

interface Invoice {
  invoice_id: string;
  invoice_date: string;
  vendor: { name: string; address: string; country: string };
  buyer: { name: string; address: string; country: string };
  line_items: Array<{
    item_id: number;
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    amount: number;
    origin_country: string;
  }>;
  subtotal: number;
  currency: string;
  notes?: string;
}

interface HITLQueueItem {
  id: string | null;
  source_file: string;
  invoice: Invoice;
  pre_vet: PreVetResult;
  status: string;
}

export default function HITLReviewPage() {
  const { getToken } = useAuth();
  const [items, setItems] = useState<HITLQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/invoice/hitl-queue`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `Request failed: ${res.status}`);
      }
      const data = await res.json();
      const list = data.items || [];
      setItems(list);
      // Expand first pending item only; approved items stay collapsed
      if (list.length > 0) {
        const firstPending = list.find((i: HITLQueueItem) => i.status === "pending_review");
        if (firstPending) {
          setExpandedId((prev) => prev || firstPending.invoice?.invoice_id || firstPending.id);
        } else {
          setExpandedId(null); // All approved: collapse all
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load HITL queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const toggleExpand = (invoiceId: string) => {
    setExpandedId((prev) => (prev === invoiceId ? null : invoiceId));
  };

  const handleApprove = useCallback(
    async (recordId: string) => {
      if (!recordId) return;
      setApprovingId(recordId);
      try {
        const token = await getToken();
        const res = await fetch(`${API_BASE}/api/invoice/${recordId}/approve`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: res.statusText }));
          throw new Error(err.detail || "Approve failed");
        }
        // Update status locally instead of removing; collapse approved items
        setItems((prev) =>
          prev.map((i) =>
            i.id === recordId ? { ...i, status: "approved" } : i
          )
        );
        setExpandedId(null); // Collapse after approve
      } catch (err) {
        setError(err instanceof Error ? err.message : "Approve failed");
      } finally {
        setApprovingId(null);
      }
    },
    [getToken]
  );

  return (
    <div className="hitl-review-page">
      <header className="dashboard-header">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link to="/invoice-prevet" className="text-sm text-muted-foreground hover:text-foreground">
            ← Invoice Pre-vet
          </Link>
          <span style={{ color: "oklch(0.8 0 0)" }}>/</span>
          <h1>HITL Review</h1>
        </div>
        <div className="header-actions">
          <button
            onClick={fetchQueue}
            disabled={loading}
            className="hitl-refresh-btn"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <main className="dashboard-main">
        <div>
          <h2 className="dashboard-section-title">Human-In-The-Loop Review</h2>
          <p className="dashboard-section-subtitle">
            Invoices that require human review. Expand each to see full details and line items needing classification verification.
          </p>
        </div>

        {error && (
          <div className="prevet-error">
            ⚠ {error}
          </div>
        )}

        {!loading && items.length === 0 && !error && (
          <div className="hitl-empty">
            <p>No invoices in the HITL queue.</p>
            <p className="hitl-empty-hint">
              All pre-vetted demo invoices have confidence above the threshold, or the queue is empty.
            </p>
          </div>
        )}

        {items.length > 0 && (
          <div className="hitl-queue">
            {items.map(({ id, invoice, pre_vet, source_file, status }) => {
              const isExpanded = expandedId === invoice.invoice_id || expandedId === id;
              const hitlCount = pre_vet.line_items.filter((i) => i.requires_hitl).length;
              const isApproved = status === "approved";
              const canApprove = !!id && !isApproved;

              return (
                <div key={id || invoice.invoice_id} className="hitl-card">
                  <button
                    type="button"
                    className="hitl-card-header"
                    onClick={() => toggleExpand(id || invoice.invoice_id)}
                  >
                    <div className="hitl-card-title">
                      {isApproved ? (
                        <span className="hitl-badge hitl-badge-approved">Approved</span>
                      ) : (
                        <span className="hitl-badge">{hitlCount} HITL</span>
                      )}
                      <strong>{invoice.invoice_id}</strong>
                      <span className="hitl-source">{source_file}</span>
                    </div>
                    <div className="hitl-card-meta">
                      {invoice.vendor.name} → {invoice.buyer.name} · {invoice.currency} {invoice.subtotal.toFixed(2)}
                    </div>
                    <span className="hitl-expand-icon">{isExpanded ? "▼" : "▶"}</span>
                  </button>

                  {isExpanded && (
                    <div className="hitl-card-body">
                      {/* Invoice details */}
                      <div className="hitl-invoice-details">
                        <h4>Invoice details</h4>
                        <div className="hitl-detail-grid">
                          <div>
                            <span className="hitl-label">Date</span>
                            <span>{invoice.invoice_date}</span>
                          </div>
                          <div>
                            <span className="hitl-label">Vendor</span>
                            <span>{invoice.vendor.name}, {invoice.vendor.country}</span>
                          </div>
                          <div>
                            <span className="hitl-label">Buyer</span>
                            <span>{invoice.buyer.name}, {invoice.buyer.country}</span>
                          </div>
                          <div>
                            <span className="hitl-label">Subtotal</span>
                            <span>{invoice.currency} {invoice.subtotal.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="hitl-label">Total tariff</span>
                            <span>{invoice.currency} {pre_vet.total_tariff.toFixed(2)}</span>
                          </div>
                        </div>
                        {invoice.vendor.address && (
                          <div className="hitl-address">
                            <span className="hitl-label">Vendor address</span>
                            <span>{invoice.vendor.address}</span>
                          </div>
                        )}
                        {invoice.buyer.address && (
                          <div className="hitl-address">
                            <span className="hitl-label">Buyer address</span>
                            <span>{invoice.buyer.address}</span>
                          </div>
                        )}
                      </div>

                      {pre_vet.all_flags.length > 0 && (
                        <div className="hitl-flags">
                          <strong>Flags:</strong>
                          <ul>
                            {pre_vet.all_flags.map((f, i) => (
                              <li key={i}>⚠ {f}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {canApprove && !isApproved && (
                        <div className="hitl-approve-section">
                          <button
                            type="button"
                            className="hitl-approve-btn"
                            onClick={() => id && handleApprove(id)}
                            disabled={approvingId === id}
                          >
                            {approvingId === id ? "Approving…" : "✓ Approve"}
                          </button>
                        </div>
                      )}

                      {/* Line items table */}
                      <div className="hitl-line-items">
                        <h4>Line items</h4>
                        <table className="prevet-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Description</th>
                              <th>Qty</th>
                              <th>Unit</th>
                              <th>Unit price</th>
                              <th>Amount</th>
                              <th>Origin</th>
                              <th>AHTN Code</th>
                              <th>AHTN Description</th>
                              <th>Rate</th>
                              <th>Tariff</th>
                              <th>Sim</th>
                              <th>HITL</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pre_vet.line_items.map((item) => (
                              <tr key={item.item_id} className={item.requires_hitl ? "requires-hitl" : ""}>
                                <td>{item.item_id}</td>
                                <td>
                                  <span className="desc-text">{item.description}</span>
                                  {item.flags.length > 0 && (
                                    <ul className="item-flags">
                                      {item.flags.map((f, i) => (
                                        <li key={i}>⚠ {f}</li>
                                      ))}
                                    </ul>
                                  )}
                                </td>
                                <td>{item.quantity}</td>
                                <td>{item.unit}</td>
                                <td>{item.unit_price.toFixed(2)}</td>
                                <td>{item.amount.toFixed(2)}</td>
                                <td>{item.origin_country}</td>
                                <td><code>{item.ahtn_code}</code></td>
                                <td>
                                  <span className="ahtn-desc" title={item.ahtn_description}>
                                    {item.ahtn_description && item.ahtn_description.length > 50
                                      ? `${item.ahtn_description.slice(0, 50)}…`
                                      : item.ahtn_description || "—"}
                                  </span>
                                </td>
                                <td>{item.tariff_rate}</td>
                                <td>{item.tariff_amount.toFixed(2)}</td>
                                <td>{(item.similarity * 100).toFixed(0)}%</td>
                                <td>
                                  <span className={item.requires_hitl ? "hitl-yes" : ""}>
                                    {item.requires_hitl ? "Yes" : "—"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
