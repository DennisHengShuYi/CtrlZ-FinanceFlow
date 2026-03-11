import { useState, useEffect } from "react";
import { useApiFetch } from "../hooks/useApiFetch";
import { Users, UserPlus, Trash2, Edit3 } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Client {
  id: string;
  company_id: string;
  name: string;
  phone_number: string | null;
  contact_info: string | null;
  business_reg: string | null;
  person_in_charge: string | null;
  type: string | null;
  country: string | null;
  address: string | null;
  created_at: string;
}

const COUNTRY_CURRENCY: Record<string, string> = {
  MY: "MYR", SG: "SGD", ID: "IDR", PH: "PHP", TH: "THB", VN: "VND",
  US: "USD", GB: "GBP", AU: "AUD", JP: "JPY", KR: "KRW", CN: "CNY",
  IN: "INR", AE: "AED", SA: "SAR", BN: "BND", KH: "KHR", LA: "LAK", MM: "MMK",
};

const COUNTRY_OPTIONS = [
  { code: "", label: "— Not set —" },
  { code: "MY", label: "🇲🇾 Malaysia (MYR)" },
  { code: "SG", label: "🇸🇬 Singapore (SGD)" },
  { code: "ID", label: "🇮🇩 Indonesia (IDR)" },
  { code: "PH", label: "🇵🇭 Philippines (PHP)" },
  { code: "TH", label: "🇹🇭 Thailand (THB)" },
  { code: "VN", label: "🇻🇳 Vietnam (VND)" },
  { code: "US", label: "🇺🇸 United States (USD)" },
  { code: "GB", label: "🇬🇧 United Kingdom (GBP)" },
  { code: "AU", label: "🇦🇺 Australia (AUD)" },
  { code: "JP", label: "🇯🇵 Japan (JPY)" },
  { code: "KR", label: "🇰🇷 South Korea (KRW)" },
  { code: "CN", label: "🇨🇳 China (CNY)" },
  { code: "IN", label: "🇮🇳 India (INR)" },
  { code: "AE", label: "🇦🇪 UAE (AED)" },
  { code: "SA", label: "🇸🇦 Saudi Arabia (SAR)" },
  { code: "BN", label: "🇧🇳 Brunei (BND)" },
];

const EMPTY_FORM = {
  name: "",
  phone_number: "",
  contact_info: "",
  business_reg: "",
  person_in_charge: "",
  type: "customer" as string,
  country: "",
  address: "",
};

export default function ClientsPage() {
  const apiFetch = useApiFetch();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    setLoading(true);
    try {
      const res = await apiFetch("/api/clients/");
      setClients(res?.clients || []);
    } catch (err: any) {
      alert(err.message || "Failed to load clients.");
    }
    setLoading(false);
  }

  function openCreate() {
    setEditId(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  }

  function openEdit(c: Client) {
    setEditId(c.id);
    setForm({
      name: c.name,
      phone_number: c.phone_number || "",
      contact_info: c.contact_info || "",
      business_reg: c.business_reg || "",
      person_in_charge: c.person_in_charge || "",
      type: c.type || "customer",
      country: c.country || "",
      address: c.address || "",
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editId) {
        await apiFetch(`/api/clients/${editId}`, {
          method: "PUT",
          body: JSON.stringify(form),
        });
      } else {
        await apiFetch("/api/clients/", {
          method: "POST",
          body: JSON.stringify(form),
        });
      }
      setShowModal(false);
      loadClients();
    } catch (err: Error | any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this client and all their invoices?")) return;
    setDeletingId(id);
    try {
      await apiFetch(`/api/clients/${id}`, { method: "DELETE" });
      setClients(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Clients</h1>
          <p className="page-subtitle">Manage your customers and suppliers.</p>
        </div>
        <Button onClick={openCreate}>
          <UserPlus size={16} />
          Add Client
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <p className="text-sm text-muted-foreground">Loading clients…</p>
            </div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <Users size={40} strokeWidth={1} className="text-muted-foreground" />
              <p className="font-medium">No clients yet</p>
              <span className="text-sm text-muted-foreground">Add your first client to start creating invoices.</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Country / Currency</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Person in Charge</TableHead>
                  <TableHead>Reg. No.</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>
                      <Badge variant={c.type === "supplier" ? "secondary" : "outline"} className="text-xs">
                        {c.type || "customer"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {c.country ? (
                        <span className="text-sm">
                          <span className="font-medium">{c.country}</span>
                          <span className="text-muted-foreground ml-1">({COUNTRY_CURRENCY[c.country] || "MYR"})</span>
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>{c.phone_number || "—"}</TableCell>
                    <TableCell className="max-w-[120px] truncate">{c.contact_info || "—"}</TableCell>
                    <TableCell>{c.person_in_charge || "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{c.business_reg || "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" onClick={() => openEdit(c)}>
                          <Edit3 size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Delete" disabled={deletingId === c.id} onClick={() => handleDelete(c.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Client" : "Add Client"}</DialogTitle>
            <DialogDescription>Manage client details for invoicing.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="name">Client Name</Label>
                <Input id="name" required placeholder="ABC Corporation" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <select id="type" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="customer">Customer</option>
                  <option value="supplier">Supplier</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" placeholder="+60123456789" value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <select id="country" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
                  {COUNTRY_OPTIONS.map((opt) => (
                    <option key={opt.code} value={opt.code}>{opt.label}</option>
                  ))}
                </select>
                {form.country && <span className="text-xs text-muted-foreground">Auto-currency: {COUNTRY_CURRENCY[form.country] || "MYR"}</span>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">Email / Contact Info</Label>
                <Input id="contact" placeholder="email@example.com" value={form.contact_info} onChange={(e) => setForm({ ...form, contact_info: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pic">Person in Charge</Label>
                <Input id="pic" placeholder="John Doe" value={form.person_in_charge} onChange={(e) => setForm({ ...form, person_in_charge: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg">Business Registration</Label>
                <Input id="reg" placeholder="REG-12345" value={form.business_reg} onChange={(e) => setForm({ ...form, business_reg: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" placeholder="123 Main Street, City, State" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : editId ? "Save Changes" : "Add Client"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
