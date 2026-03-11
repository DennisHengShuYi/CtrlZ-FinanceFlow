import { useState, useEffect } from "react";
import { useApiFetch } from "../hooks/useApiFetch";
import { Save, Building2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
  const apiFetch = useApiFetch();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: "",
    address: "",
    business_reg: "",
    logo_url: "",
    base_currency: "MYR",
  });
  const [hasCompany, setHasCompany] = useState(false);

  useEffect(() => {
    loadCompany();
  }, []);

  async function loadCompany() {
    setLoading(true);
    try {
      const res = await apiFetch("/api/companies/me");
      if (res?.company) {
        setForm({
          name: res.company.name || "",
          address: res.company.address || "",
          business_reg: res.company.business_reg || "",
          logo_url: res.company.logo_url || "",
          base_currency: res.company.base_currency || "MYR",
        });
        setHasCompany(true);
      }
    } catch (err: any) {
      alert(err.message || "Failed to load company settings.");
    }
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      if (hasCompany) {
        await apiFetch("/api/companies/me", {
          method: "PUT",
          body: JSON.stringify(form),
        });
      } else {
        await apiFetch("/api/companies/", {
          method: "POST",
          body: JSON.stringify(form),
        });
        setHasCompany(true);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: Error | any) {
      alert(err.message);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <p className="text-sm text-muted-foreground">Loading settings…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">
            Configure your company profile. This info appears on your invoices.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Building2 size={20} strokeWidth={1.5} className="text-muted-foreground" />
          <CardTitle>Company Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="name">Company Name</Label>
                <Input id="name" required placeholder="Your Company Sdn Bhd" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" rows={3} placeholder="123 Main Street, Kuala Lumpur, Malaysia" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg">Business Registration No.</Label>
                <Input id="reg" placeholder="202301012345" value={form.business_reg} onChange={(e) => setForm({ ...form, business_reg: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo">Logo URL</Label>
                <Input id="logo" placeholder="https://example.com/logo.png" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })} />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="currency">Company Base Currency</Label>
                <select id="currency" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm" value={form.base_currency} onChange={(e) => setForm({ ...form, base_currency: e.target.value })}>
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
                <p className="text-xs text-muted-foreground">This defines how the dashboard calculates your total net values.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-4 pt-4 border-t">
              {saved && (
                <span className="flex items-center gap-2 text-sm font-medium text-green-600">
                  <CheckCircle size={14} />
                  Saved successfully
                </span>
              )}
              <Button type="submit" disabled={saving}>
                <Save size={16} />
                {saving ? "Saving…" : hasCompany ? "Save Changes" : "Create Company"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
