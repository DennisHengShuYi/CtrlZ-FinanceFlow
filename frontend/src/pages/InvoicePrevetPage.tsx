import { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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

interface SavedInvoiceOption {
  id: string;
  source_file: string;
  invoice: unknown;
  created_at?: string;
}

export default function InvoicePrevetPage() {
  const [file, setFile] = useState<File | null>(null);
  const [sourceType, setSourceType] = useState<"upload" | "supabase">("upload");
  const [savedInvoices, setSavedInvoices] = useState<SavedInvoiceOption[]>([]);
  const [selectedSavedInvoiceId, setSelectedSavedInvoiceId] = useState<string>("");
  const [loadingSavedInvoices, setLoadingSavedInvoices] = useState(false);
  const [result, setResult] = useState<PreVetResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      if (!f.name.endsWith(".json")) {
        setError("Please upload a JSON file");
        setFile(null);
        return;
      }
      setFile(f);
      setSelectedSavedInvoiceId("");
      setResult(null);
      setError(null);
    }
  }, []);

  const fetchSavedInvoices = useCallback(async () => {
    setLoadingSavedInvoices(true);
    try {
      const res = await fetch(`${API_BASE}/api/invoice/hitl-queue`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || "Failed to load saved invoices");
      }
      const data = await res.json();
      const options = (data.items || []).map((item: {
        id?: string;
        source_file?: string;
        invoice?: unknown;
        created_at?: string;
      }) => ({
        id: item.id || `${item.source_file || "invoice"}-${Math.random()}`,
        source_file: item.source_file || "Supabase invoice JSON",
        invoice: item.invoice || {},
        created_at: item.created_at,
      }));
      setSavedInvoices(options);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load saved invoices");
    } finally {
      setLoadingSavedInvoices(false);
    }
  }, []);

  useEffect(() => {
    if (sourceType === "supabase" && savedInvoices.length === 0 && !loadingSavedInvoices) {
      fetchSavedInvoices();
    }
  }, [fetchSavedInvoices, loadingSavedInvoices, savedInvoices.length, sourceType]);

  const handleSubmit = useCallback(async () => {
    if (sourceType === "upload" && !file) {
      setError("Please select a JSON file first");
      return;
    }
    if (sourceType === "supabase" && !selectedSavedInvoiceId) {
      setError("Please choose a saved JSON from Supabase first");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    try {
      let invoice: unknown;
      let sourceFile = "";
      if (sourceType === "upload") {
        const text = await file!.text();
        invoice = JSON.parse(text);
        sourceFile = file?.name || "";
      } else {
        const selected = savedInvoices.find((s) => s.id === selectedSavedInvoiceId);
        if (!selected) {
          throw new Error("Selected saved JSON was not found");
        }
        invoice = selected.invoice;
        sourceFile = selected.source_file;
      }

      const url = new URL(`${API_BASE}/api/invoice/pre-vet`);
      if (sourceFile) url.searchParams.set("source_file", sourceFile);
      const res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoice),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        const detail = err.detail;
        let message: string;
        if (Array.isArray(detail) && detail.length > 0) {
          message = detail
            .map((d: { loc?: unknown[]; msg?: string }) => {
              const loc = Array.isArray(d.loc) ? d.loc.filter((x) => x !== "body").join(".") : "";
              return loc ? `${loc}: ${d.msg ?? "validation error"}` : (d.msg ?? "validation error");
            })
            .join("; ");
        } else {
          message = typeof detail === "string" ? detail : `Request failed: ${res.status}`;
        }
        throw new Error(message);
      }
      const data: PreVetResult = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [file, savedInvoices, selectedSavedInvoiceId, sourceType]);

  const handleReset = useCallback(() => {
    setFile(null);
    setSelectedSavedInvoiceId("");
    setResult(null);
    setError(null);
  }, []);

  return (
    <div className="page-container" style={{ maxWidth: "1400px", width: "100%" }}>
      <div className="page-header">
        <div className="flex items-center gap-4">
          <h1 className="page-title">Invoice Pre-vet</h1>
          <Link to="/dashboard/hitl-review">
            <Button variant="outline" size="sm">HITL Review →</Button>
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-1">Invoice Source</h2>
          <p className="page-subtitle">
            Choose a local JSON file or select a previously saved JSON from Supabase. The system will classify line items against AHTN, calculate tariffs, and flag items for human review.
          </p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="text-base font-semibold">Select Input Method</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={sourceType === "upload" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSourceType("upload");
                  setError(null);
                }}
              >
                Upload JSON File
              </Button>
              <Button
                variant={sourceType === "supabase" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSourceType("supabase");
                  setFile(null);
                  setError(null);
                  fetchSavedInvoices();
                }}
              >
                Use Saved OCR JSON
              </Button>
            </div>

            {sourceType === "upload" ? (
              <div className="rounded-lg border border-dashed p-4">
                <Label htmlFor="invoice-file" className="text-sm">Invoice JSON File</Label>
                <Input
                  id="invoice-file"
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="mt-2 cursor-pointer"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {file ? `Selected: ${file.name}` : "Upload a valid invoice JSON file."}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border p-4 space-y-3">
                <Label htmlFor="saved-json-select" className="text-sm">Saved OCR/Supabase JSON</Label>
                <div className="flex gap-2 items-center">
                  <select
                    id="saved-json-select"
                    value={selectedSavedInvoiceId}
                    onChange={(e) => {
                      setSelectedSavedInvoiceId(e.target.value);
                      setResult(null);
                      setError(null);
                    }}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    disabled={loadingSavedInvoices}
                  >
                    <option value="">
                      {loadingSavedInvoices ? "Loading saved JSON..." : "Choose saved JSON from Supabase"}
                    </option>
                    {savedInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.source_file}
                        {inv.created_at ? ` (${new Date(inv.created_at).toLocaleString()})` : ""}
                      </option>
                    ))}
                  </select>
                  <Button variant="outline" onClick={fetchSavedInvoices} disabled={loadingSavedInvoices}>
                    {loadingSavedInvoices ? "Refreshing…" : "Refresh"}
                  </Button>
                </div>
                {!loadingSavedInvoices && savedInvoices.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No saved JSON found yet in Supabase.
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button
                onClick={handleSubmit}
                disabled={
                  loading ||
                  (sourceType === "upload" && !file) ||
                  (sourceType === "supabase" && !selectedSavedInvoiceId)
                }
              >
                {loading ? "Processing…" : "Pre-vet Invoice"}
              </Button>
              {(file || selectedSavedInvoiceId || result) && (
                <Button variant="outline" onClick={handleReset}>Reset</Button>
              )}
            </div>

            {error && (
              <Alert variant="destructive" className="mt-4">
                <AlertDescription>⚠ {error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
                <span>Invoice: <strong className="text-foreground">{result.invoice_id}</strong></span>
                <span>Total tariff: <strong className="text-foreground">{result.total_tariff.toFixed(2)}</strong></span>
                <span>
                  HITL required:{" "}
                  <Badge variant={result.any_requires_hitl ? "destructive" : "secondary"} className={result.any_requires_hitl ? "bg-amber-100 text-amber-800" : ""}>
                    {result.any_requires_hitl ? "Yes" : "No"}
                  </Badge>
                </span>
              </div>
              {result.all_flags.length > 0 && (
                <div className="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm">
                  <strong>Flags:</strong>
                  <ul className="mt-2 list-disc pl-5 text-amber-800">
                    {result.all_flags.map((f, i) => (
                      <li key={i}>⚠ {f}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <h4 className="font-medium mb-4">Line items</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>AHTN Code</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Tariff</TableHead>
                    <TableHead>Sim</TableHead>
                    <TableHead>HITL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.line_items.map((item) => (
                    <TableRow key={item.item_id} className={item.requires_hitl ? "bg-amber-50/50" : ""}>
                      <TableCell>{item.item_id}</TableCell>
                      <TableCell>
                        <span className="block max-w-[200px] truncate">{item.description}</span>
                        {item.flags.length > 0 && (
                          <ul className="mt-1 text-xs text-amber-700 list-disc pl-4">
                            {item.flags.map((f, i) => (
                              <li key={i}>⚠ {f}</li>
                            ))}
                          </ul>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{item.ahtn_code}</code>
                        {item.ahtn_description && (
                          <span className="block text-xs text-muted-foreground mt-1 max-w-[180px] truncate">
                            {item.ahtn_description.length > 40 ? `${item.ahtn_description.slice(0, 40)}…` : item.ahtn_description}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{item.tariff_rate}</TableCell>
                      <TableCell>{item.tariff_amount.toFixed(2)}</TableCell>
                      <TableCell>{(item.similarity * 100).toFixed(0)}%</TableCell>
                      <TableCell>{item.requires_hitl ? <Badge variant="destructive" className="text-xs">Yes</Badge> : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
