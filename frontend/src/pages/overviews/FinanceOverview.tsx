import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useApiFetch } from "../../hooks/useApiFetch";
import {
  FileText,
  Users,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Scan,
  Wallet,
  Landmark,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
  delay?: number;
}

function StatCard({
  icon: Icon,
  label,
  value,
  change,
  positive = true,
  delay = 0,
}: StatCardProps) {
  return (
    <Card
      className="transition-all hover:shadow-md hover:border-border/80"
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-6 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
          <Icon size={18} strokeWidth={1.5} className="text-muted-foreground" />
        </div>
        {change && (
          <span className={`flex items-center gap-0.5 text-xs font-medium ${positive ? "text-green-600" : "text-red-600"}`}>
            {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {change}
          </span>
        )}
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-0">
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mt-2">{label}</p>
      </CardContent>
    </Card>
  );
}

function AlertCard({
  title,
  items,
  isSupplier = false,
  baseCurrency = "MYR",
}: {
  title: string;
  items: any[];
  isSupplier?: boolean;
  baseCurrency?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="p-4 rounded-lg border border-dashed bg-muted/30 text-sm text-muted-foreground">
        No pending items for {title.toLowerCase()}.
      </div>
    );
  }

  const total = items.reduce(
    (sum, item) => sum + (parseFloat(item.total_amount || 0) * (parseFloat(item.exchange_rate) || 1)),
    0,
  );

  return (
    <Card>
      <CardHeader className="pb-4 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className={`h-5 w-5 ${isSupplier ? "text-amber-500" : "text-red-500"}`} />
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <span className="font-semibold">
            {new Intl.NumberFormat("en-US", { style: "currency", currency: baseCurrency || "MYR" }).format(total)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4">
        {items.slice(0, 3).map((inv: any) => (
          <div key={inv.id} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground truncate mr-2">
              {inv.clients?.name || "Unknown"} - {inv.invoice_number}
            </span>
            <div className="flex flex-col items-end">
              <span className="font-medium">
                {new Intl.NumberFormat("en-US", { style: "currency", currency: inv.currency || "MYR" }).format(parseFloat(inv.total_amount))}
              </span>
              {inv.currency && inv.currency !== baseCurrency && (
                <span className="text-xs text-muted-foreground">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: baseCurrency || "MYR" }).format(parseFloat(inv.total_amount) * parseFloat(inv.exchange_rate || 1))}
                </span>
              )}
            </div>
          </div>
        ))}
        {items.length > 3 && (
          <div className="text-sm text-muted-foreground pt-2 border-t">
            + {items.length - 3} more
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuickActions() {
  const actions = [
    { label: "New Invoice", icon: FileText, href: "/dashboard/invoices" },
    { label: "Add Client", icon: Users, href: "/dashboard/clients" },
    { label: "Record Payment", icon: CreditCard, href: "/dashboard/payments" },
    { label: "Scan Receipt", icon: Scan, href: "/dashboard/scan-receipt" },
  ];

  return (
    <Card>
      <CardHeader className="pb-4 pt-6 px-6">
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        <div className="grid grid-cols-2 gap-4">
          {actions.map((a) => (
            <Link
              key={a.label}
              to={a.href}
              className="group flex flex-col items-center justify-center gap-3 rounded-lg border border-input bg-background p-5 text-center shadow-sm transition-all hover:bg-accent hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted group-hover:bg-muted/80">
                <a.icon size={18} className="text-muted-foreground" />
              </div>
              <span className="text-xs font-semibold">{a.label}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function FinanceOverview() {
    const { user } = useUser();
    const apiFetch = useApiFetch();

    const [summary, setSummary] = useState({
        cash_on_hand: 0,
        total_assets: 0,
        available_for_expenses: 0,
        base_currency: "MYR",
        client_pending: [],
        supplier_pending: [],
    });

    const [analysis, setAnalysis] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const displayName =
        user?.firstName ??
        user?.emailAddresses[0]?.emailAddress?.split("@")[0] ??
        "there";

    const hour = new Date().getHours();
    const greeting =
        hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

    useEffect(() => {
        async function load() {
            try {
                // Sanitize storedLoan - remove commas/RM prefix just in case
                const rawStored = localStorage.getItem('fintech_proposed_loan') || '25000';
                const sanitizedLoan = rawStored.replace(/[^\d.]/g, '') || '25000';

                const ts = Date.now();
                const [sumRes, anaRes] = await Promise.all([
                    apiFetch("/api/companies/financial-summary"),
                    apiFetch(`/api/analysis?t=${ts}&proposed_loan=${parseFloat(sanitizedLoan)}`)
                ]);

                if (sumRes && typeof sumRes.cash_on_hand !== "undefined") {
                    setSummary(sumRes);
                }
                if (anaRes && typeof anaRes.loanReadinessScore !== 'undefined') {
                    setAnalysis(anaRes);
                }
            } catch (err) {
                console.error("Failed to load dashboard data", err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [apiFetch]);

    if (loading) {
        return <div className="p-8">Loading dashboard...</div>;
    }

    const totalReceivable = summary.client_pending.reduce(
        (sum, item: any) => sum + (parseFloat(item.total_amount || 0) * (parseFloat(item.exchange_rate) || 1)),
        0,
    );
    const totalPayable = summary.supplier_pending.reduce(
        (sum, item: any) => sum + (parseFloat(item.total_amount || 0) * (parseFloat(item.exchange_rate) || 1)),
        0,
    );

    const totalVolume = summary.cash_on_hand + totalReceivable + totalPayable;
    const cashPercent =
        totalVolume === 0 ? 0 : (summary.cash_on_hand / totalVolume) * 100;
    const receivablePercent =
        totalVolume === 0 ? 0 : (totalReceivable / totalVolume) * 100;
    const payablePercent =
        totalVolume === 0 ? 0 : (totalPayable / totalVolume) * 100;

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">
                        {greeting}, {displayName} 👋
                    </h1>
                    <p className="text-muted-foreground">
                        Here's what's happening with your finances today.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-10">
                <StatCard
                    icon={Wallet}
                    label="Cash on Hand"
                    value={new Intl.NumberFormat("en-US", { style: "currency", currency: summary.base_currency }).format(summary.cash_on_hand)}
                    positive
                    delay={0}
                />
                <StatCard
                    icon={TrendingUp}
                    label="Annual Revenue (TTM)"
                    value={new Intl.NumberFormat("en-US", { style: "currency", currency: summary.base_currency, maximumFractionDigits: 0 }).format(analysis?.totalRevenue || 0)}
                    positive={analysis?.currentMonthRevenue > (analysis?.prevMonthRevenue || 0)}
                    change={analysis?.totalRevenue > 0 ? `${((analysis.currentMonthRevenue - analysis.prevMonthRevenue) / Math.max(1, analysis.prevMonthRevenue) * 100).toFixed(1)}%` : undefined}
                    delay={80}
                />
                <StatCard
                    icon={Landmark}
                    label="Total Assets"
                    value={new Intl.NumberFormat("en-US", { style: "currency", currency: summary.base_currency }).format(summary.total_assets)}
                    positive
                    delay={160}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 mb-10 items-start">
                {/* Main Content Pane */}
                <div className="lg:col-span-8 space-y-8 lg:space-y-10">
                    <Card className="overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 pt-6 px-6">
                            <CardTitle>Financial Flow</CardTitle>
                            {analysis?.totalRevenue >= 500000 && (
                                <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">
                                    SSM Registration Required (&gt; RM 500k)
                                </Badge>
                            )}
                        </CardHeader>
                        <CardContent className="px-6 pb-6 pt-0">
                            <div className="space-y-5">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                        <div className="h-3 w-3 rounded-full bg-primary"></div>
                                        Cash on Hand
                                    </span>
                                    <span className="font-medium">
                                        {new Intl.NumberFormat("en-US", { style: "currency", currency: summary.base_currency }).format(summary.cash_on_hand)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                        <div className="h-3 w-3 rounded-full bg-muted-foreground/40"></div>
                                        Expected Revenue
                                    </span>
                                    <span className="font-medium">
                                        {new Intl.NumberFormat("en-US", { style: "currency", currency: summary.base_currency }).format(totalReceivable)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                        <div className="h-3 w-3 rounded-full bg-destructive/60"></div>
                                        Upcoming Bills
                                    </span>
                                    <span className="font-medium">
                                        {new Intl.NumberFormat("en-US", { style: "currency", currency: summary.base_currency }).format(totalPayable)}
                                    </span>
                                </div>

                                {/* Progress Bar */}
                                <div className="h-5 w-full flex rounded-full overflow-hidden mt-8 bg-muted">
                                    {cashPercent > 0 && (
                                        <div
                                            style={{ width: `${cashPercent}%` }}
                                            className="bg-primary transition-all duration-500"
                                            title={`Cash: ${cashPercent.toFixed(1)}%`}
                                        ></div>
                                    )}
                                    {receivablePercent > 0 && (
                                        <div
                                            style={{ width: `${receivablePercent}%` }}
                                            className="bg-muted-foreground/40 transition-all duration-500"
                                            title={`Receivables: ${receivablePercent.toFixed(1)}%`}
                                        ></div>
                                    )}
                                    {payablePercent > 0 && (
                                        <div
                                            style={{ width: `${payablePercent}%` }}
                                            className="bg-destructive/60 transition-all duration-500"
                                            title={`Payables: ${payablePercent.toFixed(1)}%`}
                                        ></div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
                        <Card className="flex-1 min-w-0">
                            <CardHeader className="pb-4 pt-6 px-6">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-medium">Active E-Invoices (Customer)</CardTitle>
                                    <Badge variant="secondary" className="text-[10px]">Issuing</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="px-6 pb-6">
                                <AlertCard
                                    title="Customer Receivables"
                                    items={summary.client_pending.filter((inv: any) => inv.type === "issuing")}
                                    baseCurrency={summary.base_currency}
                                />
                            </CardContent>
                        </Card>
                        <Card className="flex-1 min-w-0">
                            <CardHeader className="pb-4 pt-6 px-6">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-medium">Supplier Bills</CardTitle>
                                    <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">Receiving</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="px-6 pb-6">
                                <AlertCard
                                    title="Upcoming Bills"
                                    items={summary.supplier_pending}
                                    isSupplier={true}
                                    baseCurrency={summary.base_currency}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Sidebar Pane */}
                <div className="lg:col-span-4 space-y-6 sticky top-8">
                    <QuickActions />
                </div>
            </div>
        </div>
    );
}
