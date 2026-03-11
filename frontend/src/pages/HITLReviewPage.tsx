import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChevronDown, ChevronRight } from "lucide-react";

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
    <div className="page-container" style={{ maxWidth: "1400px", width: "100%" }}>
      <div className="page-header">
        <div className="flex items-center gap-4">
          <Link to="/dashboard/invoice-prevet">
            <Button variant="ghost" size="sm">← Invoice Pre-vet</Button>
          </Link>
          <h1 className="page-title">HITL Review</h1>
        </div>
        <Button onClick={fetchQueue} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-1">Human-In-The-Loop Review</h2>
          <p className="page-subtitle">
            Invoices that require human review. Expand each to see full details and line items needing classification verification.
          </p>
        </div>

        {!loading && items.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total records</p>
                <p className="text-2xl font-bold mt-1">{items.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pending review</p>
                <p className="text-2xl font-bold mt-1">
                  {items.filter((i) => i.status === "pending_review").length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold mt-1">
                  {items.filter((i) => i.status === "approved").length}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>⚠ {error}</AlertDescription>
          </Alert>
        )}

        {!loading && items.length === 0 && !error && (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="font-medium">No invoices in the HITL queue.</p>
              <p className="text-sm text-muted-foreground mt-1">
                All pre-vetted demo invoices have confidence above the threshold, or the queue is empty.
              </p>
            </CardContent>
          </Card>
        )}

        {items.length > 0 && (
          <div className="space-y-4">
            {items.map(({ id, invoice, pre_vet, source_file, status }) => {
              const isExpanded = expandedId === invoice.invoice_id || expandedId === id;
              const hitlCount = pre_vet.line_items.filter((i) => i.requires_hitl).length;
              const isApproved = status === "approved";
              const canApprove = !!id && !isApproved;

              return (
                <Collapsible
                  key={id || invoice.invoice_id}
                  open={isExpanded}
                  onOpenChange={(open) => setExpandedId(open ? (id || invoice.invoice_id) : null)}
                >
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/40 transition-colors rounded-t-lg py-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {isApproved ? (
                                <Badge className="bg-green-600">Approved</Badge>
                              ) : (
                                <Badge variant="secondary">{hitlCount} HITL Items</Badge>
                              )}
                              <span className="font-semibold">{invoice.invoice_id}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1 truncate">
                              Source: {source_file || "uploaded invoice"}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {invoice.vendor.name} to {invoice.buyer.name} • {invoice.currency} {invoice.subtotal.toFixed(2)}
                            </p>
                          </div>
                          <div className="self-end lg:self-auto">
                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-4 border-t">
                        <div className="space-y-4">
                          <div className="p-4 rounded-lg bg-muted/50">
                            <h4 className="font-medium mb-3">Invoice details</h4>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                              <div>
                                <p className="text-xs font-medium uppercase text-muted-foreground">Date</p>
                                <p>{invoice.invoice_date}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium uppercase text-muted-foreground">Vendor</p>
                                <p>{invoice.vendor.name}, {invoice.vendor.country}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium uppercase text-muted-foreground">Buyer</p>
                                <p>{invoice.buyer.name}, {invoice.buyer.country}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium uppercase text-muted-foreground">Subtotal</p>
                                <p>{invoice.currency} {invoice.subtotal.toFixed(2)}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium uppercase text-muted-foreground">Total tariff</p>
                                <p>{invoice.currency} {pre_vet.total_tariff.toFixed(2)}</p>
                              </div>
                            </div>
                            {invoice.vendor.address && (
                              <div className="mt-3">
                                <p className="text-xs font-medium uppercase text-muted-foreground">Vendor address</p>
                                <p className="text-sm">{invoice.vendor.address}</p>
                              </div>
                            )}
                            {invoice.buyer.address && (
                              <div className="mt-2">
                                <p className="text-xs font-medium uppercase text-muted-foreground">Buyer address</p>
                                <p className="text-sm">{invoice.buyer.address}</p>
                              </div>
                            )}
                          </div>

                          {pre_vet.all_flags.length > 0 && (
                            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                              <strong>Flags:</strong>
                              <ul className="mt-2 list-disc pl-5 text-sm text-amber-800">
                                {pre_vet.all_flags.map((f, i) => (
                                  <li key={i}>⚠ {f}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {canApprove && !isApproved && (
                            <div>
                              <Button onClick={() => id && handleApprove(id)} disabled={approvingId === id} className="bg-green-600 hover:bg-green-700">
                                {approvingId === id ? "Approving…" : "✓ Approve"}
                              </Button>
                            </div>
                          )}

                          <div>
                            <h4 className="font-medium mb-3">Line items</h4>
                            <div className="overflow-x-auto rounded-md border">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>#</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Qty</TableHead>
                                    <TableHead>Unit</TableHead>
                                    <TableHead>Unit price</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Origin</TableHead>
                                    <TableHead>AHTN Code</TableHead>
                                    <TableHead>AHTN Description</TableHead>
                                    <TableHead>Rate</TableHead>
                                    <TableHead>Tariff</TableHead>
                                    <TableHead>Sim</TableHead>
                                    <TableHead>HITL</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {pre_vet.line_items.map((item) => (
                                    <TableRow key={item.item_id} className={item.requires_hitl ? "bg-amber-50/50" : ""}>
                                      <TableCell>{item.item_id}</TableCell>
                                      <TableCell>
                                        <span className="block max-w-[150px] truncate">{item.description}</span>
                                        {item.flags.length > 0 && (
                                          <ul className="mt-1 text-xs text-amber-700 list-disc pl-4">
                                            {item.flags.map((f, i) => (
                                              <li key={i}>⚠ {f}</li>
                                            ))}
                                          </ul>
                                        )}
                                      </TableCell>
                                      <TableCell>{item.quantity}</TableCell>
                                      <TableCell>{item.unit}</TableCell>
                                      <TableCell>{item.unit_price.toFixed(2)}</TableCell>
                                      <TableCell>{item.amount.toFixed(2)}</TableCell>
                                      <TableCell>{item.origin_country}</TableCell>
                                      <TableCell><code className="text-xs bg-muted px-1 rounded">{item.ahtn_code}</code></TableCell>
                                      <TableCell className="max-w-[120px] truncate" title={item.ahtn_description}>
                                        {item.ahtn_description && item.ahtn_description.length > 50 ? `${item.ahtn_description.slice(0, 50)}…` : item.ahtn_description || "—"}
                                      </TableCell>
                                      <TableCell>{item.tariff_rate}</TableCell>
                                      <TableCell>{item.tariff_amount.toFixed(2)}</TableCell>
                                      <TableCell>{(item.similarity * 100).toFixed(0)}%</TableCell>
                                      <TableCell>{item.requires_hitl ? <Badge variant="destructive" className="text-xs">Yes</Badge> : "—"}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
