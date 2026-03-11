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
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  FileText,
  RefreshCw,
  Undo2,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

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
      if (list.length > 0) {
        const firstPending = list.find((i: HITLQueueItem) => i.status === "pending_review");
        if (firstPending) {
          setExpandedId((prev) => prev || firstPending.invoice?.invoice_id || firstPending.id);
        } else {
          setExpandedId(null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load HITL queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

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
        setItems((prev) =>
          prev.map((i) => (i.id === recordId ? { ...i, status: "approved" } : i))
        );
        setExpandedId(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Approve failed");
      } finally {
        setApprovingId(null);
      }
    },
    [getToken]
  );

  const totalCount = items.length;
  const pendingCount = items.filter((i) => i.status === "pending_review").length;
  const approvedCount = items.filter((i) => i.status === "approved").length;

  return (
    <div className="page-container" style={{ maxWidth: "1400px", width: "100%" }}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="page-header items-center mb-10">
        <div className="flex items-center gap-4">
          <Link to="/dashboard/invoice-prevet">
            <Button variant="ghost" size="sm" className="hover:bg-primary/5 gap-2">
              <Undo2 className="w-4 h-4" /> Back to Pre-vet
            </Button>
          </Link>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="page-title leading-tight">HITL Review Center</h1>
              <p className="page-subtitle">Human-in-the-loop invoice classification</p>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={fetchQueue}
          disabled={loading}
          className="premium-card shadow-sm active:scale-95 gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Syncing..." : "Sync Queue"}
        </Button>
      </div>

      <div className="space-y-10">
        {/* ── Stats Row ───────────────────────────────────────────── */}
        {!loading && items.length > 0 && (
          <div className="grid grid-cols-3 gap-8">
            {[
              { label: "Total Records", value: totalCount, icon: <FileText size={24} />, color: "text-indigo-600", iconBg: "bg-indigo-50 text-indigo-500", border: "border-l-indigo-400", bg: "bg-indigo-50/40" },
              { label: "Pending Review", value: pendingCount, icon: <Clock size={24} />, color: "text-amber-600", iconBg: "bg-amber-50 text-amber-500", border: "border-l-amber-400", bg: "bg-amber-50/40" },
              { label: "Approved", value: approvedCount, icon: <CheckCircle2 size={24} />, color: "text-green-600", iconBg: "bg-green-50 text-green-500", border: "border-l-green-400", bg: "bg-green-50/40" },
            ].map(({ label, value, icon, color, iconBg, border, bg }) => (
              <div
                key={label}
                className={`${bg} rounded-2xl border border-border border-l-4 shadow-sm min-h-[150px] flex flex-col p-8 transition-all hover:shadow-md ${border}`}
              >
                <div className="flex justify-between items-start mb-auto">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80">{label}</p>
                  <div className={`p-2.5 rounded-xl ${iconBg} ring-4 ring-white`}>{icon}</div>
                </div>
                <div className="mt-4">
                  <p className={`text-3xl font-black tabular-nums tracking-tight ${color}`}>{value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────────── */}
        {error && (
          <Alert variant="destructive" className="bg-destructive/5 border-destructive/25">
            <AlertDescription className="flex items-center gap-2 text-sm">
              <AlertCircle size={14} /> {error}
            </AlertDescription>
          </Alert>
        )}

        {/* ── Empty State ─────────────────────────────────────────── */}
        {!loading && items.length === 0 && !error && (
          <Card className="border-dashed border-2 border-muted-foreground/20">
            <CardContent className="py-20 flex flex-col items-center text-center gap-3">
              <div className="w-16 h-16 rounded-3xl bg-muted/30 flex items-center justify-center mb-2">
                <CheckCircle2 size={32} className="text-muted-foreground/30" />
              </div>
              <p className="text-base font-semibold">Queue is Empty</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                All invoices are classified with high confidence, or no invoices have been submitted for review yet.
              </p>
              <Link to="/dashboard/invoice-prevet" className="mt-2">
                <Button variant="outline" size="sm" className="gap-2">
                  Go to Pre-vet <ArrowRight size={14} />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* ── Queue Items ─────────────────────────────────────────── */}
        {items.length > 0 && (
          <div className="flex flex-col gap-10 mt-10">
            {items.map(({ id, invoice, pre_vet, source_file, status }) => {
              const isExpanded = expandedId === invoice.invoice_id || expandedId === id;
              const hitlItems = pre_vet.line_items.filter((i) => i.requires_hitl);
              const hitlCount = hitlItems.length;
              const isApproved = status === "approved";
              const canApprove = !!id && !isApproved;

              return (
                <Collapsible
                  key={id || invoice.invoice_id}
                  open={isExpanded}
                  onOpenChange={(open) => setExpandedId(open ? (id || invoice.invoice_id) : null)}
                >
                  <Card
                    className={`premium-card transition-all duration-200 ${
                      isApproved
                        ? "opacity-70 border-green-200 bg-green-50/10"
                        : isExpanded
                        ? "border-primary/50 shadow-xl ring-4 ring-primary/5"
                        : "border-border shadow-sm hover:border-muted-foreground/30 hover:shadow-md"
                    }`}
                  >
                    {/* ── Collapsible Trigger / Card Header ─────── */}
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer py-7 px-10 select-none">
                        <div className="flex items-center justify-between w-full gap-4">
                          {/* Left: Icon + Info */}
                          <div className="flex items-center gap-4 min-w-0">
                            <div
                              className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${
                                isApproved ? "bg-green-100 text-green-600" : "bg-primary/8 text-primary"
                              }`}
                            >
                              <FileText size={20} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <span className="text-sm font-bold tracking-tight">#{invoice.invoice_id}</span>
                                {isApproved ? (
                                  <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] px-2 py-0.5 gap-1">
                                    <CheckCircle2 size={10} /> Approved
                                  </Badge>
                                ) : (
                                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] px-2 py-0.5 gap-1">
                                    <Clock size={10} /> {hitlCount} Flagged
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                                <span className="truncate max-w-[120px]">{invoice.vendor.name}</span>
                                <ArrowRight size={9} className="shrink-0 opacity-40" />
                                <span className="truncate max-w-[120px] font-semibold text-foreground/70">{invoice.buyer.name}</span>
                                <span className="opacity-30 mx-0.5">•</span>
                                <span className="font-bold text-foreground/60 tabular-nums">{invoice.currency} {invoice.subtotal.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Date + Chevron */}
                          <div className="flex items-center gap-4 shrink-0 border-l pl-4 text-muted-foreground">
                            <div className="hidden sm:flex flex-col items-end">
                              <span className="text-[9px] uppercase font-bold tracking-widest opacity-40">Date</span>
                              <span className="text-xs font-semibold">{invoice.invoice_date}</span>
                            </div>
                            {isExpanded
                              ? <ChevronDown size={18} className="text-primary" />
                              : <ChevronRight size={18} />
                            }
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>

                    {/* ── Expanded Content ───────────────────────── */}
                    <CollapsibleContent>
                      <CardContent className="border-t border-border/70 p-12 space-y-12">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-14">

                          {/* Sidebar: Details + Approve */}
                          <div className="lg:col-span-4 space-y-6">
                            {/* Details panel */}
                            <div className="rounded-2xl bg-muted/20 border p-10 space-y-8">
                              <div>
                                <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 mb-6">
                                  <FileText size={12} /> Invoice Details
                                </h4>
                              </div>
                              <div className="space-y-6">
                                <div className="space-y-2">
                                  <p className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-widest">Source File</p>
                                  <p className="font-semibold italic text-xs leading-relaxed break-all text-foreground/80" title={source_file}>
                                    {source_file?.split("/").pop()}
                                  </p>
                                </div>
                                <div className="space-y-3 pt-6 border-t border-border/50">
                                  <p className="text-[10px] uppercase font-bold text-muted-foreground/60 tracking-widest">Pricing & Currency</p>
                                  <div className="flex items-center gap-3 mt-2">
                                    <Badge variant="secondary" className="text-xs px-3 py-1 font-bold">{invoice.currency}</Badge>
                                  </div>
                                </div>
                                <div className="space-y-4 pt-6 border-t border-border/50">
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-xs font-semibold text-muted-foreground">Total Tariff</span>
                                    <span className="font-bold text-primary tabular-nums">RM {pre_vet.total_tariff.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="text-xs font-semibold text-muted-foreground">Subtotal</span>
                                    <span className="font-bold tabular-nums">{invoice.currency} {invoice.subtotal.toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Approve Button */}
                            {canApprove && (
                              <div className="mt-2">
                                <Button
                                  onClick={() => id && handleApprove(id)}
                                  disabled={approvingId === id}
                                  className="w-full h-14 bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg shadow-green-500/20 gap-2 text-base rounded-2xl"
                                >
                                  {approvingId === id ? (
                                    <><RefreshCw size={16} className="animate-spin" /> Processing...</>
                                  ) : (
                                    <><CheckCircle2 size={16} /> Final Approval</>
                                  )}
                                </Button>
                              </div>
                            )}

                            {isApproved && (
                              <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs font-semibold">
                                <CheckCircle2 size={14} /> Invoice approved
                              </div>
                            )}

                            {/* Flags */}
                            {pre_vet.all_flags.length > 0 && (
                              <div className="mt-4 rounded-2xl bg-amber-50/60 border border-amber-200 p-7 space-y-4">
                                <p className="text-xs font-bold uppercase tracking-widest text-amber-800 flex items-center gap-2">
                                  <AlertCircle size={12} /> Active Flags
                                </p>
                                <ul className="space-y-3">
                                  {pre_vet.all_flags.map((f, i) => (
                                    <li key={i} className="flex gap-2.5 text-xs text-amber-800 font-medium leading-relaxed">
                                      <span className="text-amber-400 shrink-0 mt-0.5">•</span>{f}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          {/* Main: Classification Table */}
                          <div className="lg:col-span-8 space-y-5">
                            <div className="flex items-center justify-between">
                              <h4 className="font-bold flex items-center gap-3">
                                Classification Checklist
                                <Badge variant="secondary" className="bg-muted text-[10px] font-bold px-2.5 py-1">
                                  {pre_vet.line_items.length} ITEMS
                                </Badge>
                                {hitlCount > 0 && (
                                  <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] font-bold px-2.5 py-1">
                                    {hitlCount} NEED REVIEW
                                  </Badge>
                                )}
                              </h4>
                            </div>

                            <div className="rounded-3xl border border-border/50 overflow-hidden shadow-sm bg-white">
                              <div className="overflow-x-auto">
                                <Table className="table-fixed w-full">
                                  <TableHeader className="bg-muted/30">
                                    <TableRow className="hover:bg-transparent border-b border-border/50">
                                      <TableHead className="w-[6%] pl-8 py-6 text-[10px] uppercase font-black tracking-widest text-muted-foreground/70">ID</TableHead>
                                      <TableHead className="w-[35%] px-6 py-6 text-[10px] uppercase font-black tracking-widest text-muted-foreground/70">Item Description</TableHead>
                                      <TableHead className="w-[12%] px-6 py-6 text-[10px] uppercase font-black tracking-widest text-muted-foreground/70">Qty / Unit</TableHead>
                                      <TableHead className="w-[22%] px-6 py-6 text-[10px] uppercase font-black tracking-widest text-muted-foreground/70">AHTN Classification</TableHead>
                                      <TableHead className="w-[10%] text-right px-6 py-6 text-[10px] uppercase font-black tracking-widest text-muted-foreground/70">Rate</TableHead>
                                      <TableHead className="w-[10%] text-right px-8 py-6 text-[10px] uppercase font-black tracking-widest text-muted-foreground/70">Duty</TableHead>
                                      <TableHead className="w-[5%] text-center px-4 py-6 text-[10px] uppercase font-black tracking-widest text-muted-foreground/70"></TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {pre_vet.line_items.map((item) => (
                                      <TableRow
                                        key={item.item_id}
                                        className={`group transition-colors border-b border-border/30 last:border-0 ${
                                          item.requires_hitl ? "bg-amber-50/30 hover:bg-amber-50/50" : "hover:bg-muted/5"
                                        }`}
                                      >
                                        <TableCell className="pl-8 pr-4 font-mono text-[10px] text-muted-foreground/50 font-black align-middle">{item.item_id}</TableCell>
                                        <TableCell className="px-6 py-6">
                                          <div className="space-y-2">
                                            <span className="font-bold text-sm text-foreground/90 block leading-snug">{item.description}</span>
                                            {item.flags.length > 0 && (
                                              <div className="flex flex-wrap gap-2">
                                                {item.flags.map((f, i) => (
                                                  <span key={i} className="text-[8px] px-2 py-0.5 bg-background border border-amber-200 text-amber-700 rounded-md font-black uppercase tracking-tighter">
                                                    {f}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        </TableCell>
                                        <TableCell className="px-6 py-6 text-xs font-bold tabular-nums text-muted-foreground align-middle">
                                          {item.quantity} <span className="text-[10px] opacity-60 uppercase">{item.unit}</span>
                                        </TableCell>
                                        <TableCell className="px-6 py-6 align-middle">
                                          <div className="space-y-2">
                                            <code className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-md border border-primary/10">{item.ahtn_code}</code>
                                            <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2" title={item.ahtn_description}>{item.ahtn_description}</p>
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-right px-6 py-6 text-xs font-black tabular-nums align-middle text-muted-foreground">{item.tariff_rate}</TableCell>
                                        <TableCell className="text-right px-8 py-6 font-black tabular-nums text-sm align-middle text-foreground">
                                          {item.tariff_amount.toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-center px-4 py-6 align-middle">
                                          {item.requires_hitl ? (
                                            <Badge className="bg-amber-500 text-white border-0 text-[10px] font-black h-6 w-10 flex justify-center p-0 rounded-md shadow-sm">FIX</Badge>
                                          ) : (
                                            <div className="bg-green-100 text-green-600 rounded-full h-6 w-6 flex items-center justify-center mx-auto border border-green-200/50">
                                              <CheckCircle2 size={12} strokeWidth={3} />
                                            </div>
                                          )}
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
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
