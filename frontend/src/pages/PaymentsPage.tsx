import { useState, useEffect } from "react";
import { useApiFetch } from "../hooks/useApiFetch";
import { CreditCard, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface Payment {
  id: string;
  client_id: string;
  client_name?: string;
  amount: number;
  date: string;
  method: string | null;
  notes: string | null;
  currency?: string;
  exchange_rate?: string | number;
  created_at: string;
}

interface Client {
  id: string;
  name: string;
}

export default function PaymentsPage() {
  const apiFetch = useApiFetch();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [baseCurrency, setBaseCurrency] = useState("MYR");
  const [form, setForm] = useState({
    client_id: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    method: "",
    notes: "",
    currency: "MYR",
    exchange_rate: 1.0,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [payRes, cliRes, compRes] = await Promise.all([
        apiFetch("/api/payments/").catch(() => ({ payments: [] })),
        apiFetch("/api/clients/").catch(() => ({ clients: [] })),
        apiFetch("/api/companies/me").catch(() => ({ company: null })),
      ]);
      setPayments(payRes?.payments || []);
      setClients(cliRes?.clients || []);
      if (compRes?.company?.base_currency) {
        setBaseCurrency(compRes.company.base_currency);
      }
    } catch (err: any) {
      alert(err.message || "Failed to load payments data");
    }
    setLoading(false);
  }

  useEffect(() => {
    let active = true;
    async function updateRate() {
      if (form.currency === baseCurrency) {
        setForm(f => ({ ...f, exchange_rate: 1.0 }));
        return;
      }
      try {
        const data = await apiFetch(`/api/currency/rate?from=${form.currency}&to=${baseCurrency}`);
        if (active && data.rate) {
          setForm(f => ({ ...f, exchange_rate: data.rate }));
        }
      } catch (e) {
        // ignore
      }
    }
    updateRate();
    return () => { active = false; };
  }, [form.currency, baseCurrency]);

  const [isCreating, setIsCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setIsCreating(true);
    try {
      await apiFetch("/api/payments/", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
        }),
      });
      setShowModal(false);
      setForm({
        client_id: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        method: "",
        notes: "",
        currency: "MYR",
        exchange_rate: 1.0,
      });
      loadData();
    } catch (err: Error | any) {
      alert(err.message);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this payment?")) return;
    setDeletingId(id);
    try {
      await apiFetch(`/api/payments/${id}`, { method: "DELETE" });
      setPayments(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
      alert(err.message || "Failed to delete payment.");
    } finally {
      setDeletingId(null);
    }
  }

  const totalPaid = payments.reduce(
    (sum, p) => sum + parseFloat(String(p.amount || 0)) * parseFloat(String(p.exchange_rate || 1)),
    0,
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payments</h1>
          <p className="page-subtitle">Track all received payments.</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus size={16} />
          Record Payment
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Payments</p>
            <p className="text-2xl font-bold mt-1">{payments.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Collected (Est. Base)</p>
            <p className="text-2xl font-bold mt-1">{new Intl.NumberFormat("en-US", { style: "currency", currency: baseCurrency }).format(totalPaid)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <p className="text-sm text-muted-foreground">Loading payments…</p>
            </div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <CreditCard size={40} strokeWidth={1} className="text-muted-foreground" />
              <p className="font-medium">No payments recorded</p>
              <span className="text-sm text-muted-foreground">Record your first payment to start tracking.</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.client_name || "—"}</TableCell>
                    <TableCell className="font-medium tabular-nums text-green-600">
                      {new Intl.NumberFormat("en-US", { style: "currency", currency: p.currency || "USD" }).format(parseFloat(String(p.amount)))}
                    </TableCell>
                    <TableCell>{p.date}</TableCell>
                    <TableCell>{p.method || "—"}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{p.notes || "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Delete" disabled={deletingId === p.id} onClick={() => handleDelete(p.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>Add a new payment record.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client</Label>
                <select required className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
                  <option value="">Select client…</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" step="0.01" min={0} required placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Method</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                  <option value="">Select method…</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="card">Card</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="MYR">MYR (RM)</option>
                  <option value="SGD">SGD (S$)</option>
                  <option value="IDR">IDR (Rp)</option>
                  <option value="PHP">PHP (₱)</option>
                  <option value="THB">THB (฿)</option>
                  <option value="VND">VND (₫)</option>
                  <option value="AED">AED</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Exchange Rate</Label>
                <Input type="number" step="0.000001" min={0} required value={form.exchange_rate} onChange={(e) => setForm({ ...form, exchange_rate: parseFloat(e.target.value) || 1.0 })} />
                {form.currency !== baseCurrency && <p className="text-xs text-muted-foreground">Est. base: {new Intl.NumberFormat("en-US", { style: "currency", currency: baseCurrency }).format((parseFloat(form.amount) || 0) * (form.exchange_rate as number))}</p>}
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Notes</Label>
                <Textarea placeholder="Optional notes…" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" disabled={isCreating}>{isCreating ? "Recording…" : "Record Payment"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
