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
        <div
            className="overview-stat-card"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="stat-card-header">
                <span className="stat-icon-wrapper">
                    <Icon size={18} strokeWidth={1.5} />
                </span>
                {change && (
                    <span className={`stat-trend ${positive ? "positive" : "negative"}`}>
                        {positive ? (
                            <ArrowUpRight size={14} />
                        ) : (
                            <ArrowDownRight size={14} />
                        )}
                        {change}
                    </span>
                )}
            </div>
            <div className="stat-card-body mt-4">
                <span className="stat-value text-4xl md:text-5xl font-bold tracking-tighter text-gray-900 drop-shadow-sm block mb-1">
                    {value}
                </span>
                <span className="stat-label text-base font-medium text-gray-500 uppercase tracking-widest">
                    {label}
                </span>
            </div>
        </div>
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
            <div className="p-4 custom-bg custom-border rounded-lg text-sm text-gray-500">
                No pending items for {title.toLowerCase()}.
            </div>
        );
    }

    const total = items.reduce(
        (sum, item) => sum + (parseFloat(item.total_amount || 0) * (parseFloat(item.exchange_rate) || 1)),
        0,
    );

    return (
        <div className="p-4 bg-white border border-[oklch(0.92_0_0)] rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <AlertCircle
                        className={`w-5 h-5 ${isSupplier ? "text-amber-500" : "text-red-500"}`}
                    />
                    <h3 className="font-medium text-gray-900">{title}</h3>
                </div>
                <span className="font-semibold text-gray-900">
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: baseCurrency || "MYR" }).format(total)}
                </span>
            </div>
            <div className="space-y-3">
                {items.slice(0, 3).map((inv: any) => (
                    <div
                        key={inv.id}
                        className="flex items-center justify-between text-sm"
                    >
                        <span className="text-gray-600 truncate mr-2">
                            {inv.clients?.name || "Unknown"} - {inv.invoice_number}
                        </span>
                        <div className="flex flex-col items-end">
                            <span className="font-medium">
                                {new Intl.NumberFormat("en-US", { style: "currency", currency: inv.currency || "MYR" }).format(parseFloat(inv.total_amount))}
                            </span>
                            {(inv.currency && inv.currency !== baseCurrency) && (
                                <span className="text-[10px] text-gray-400">
                                    {new Intl.NumberFormat("en-US", { style: "currency", currency: baseCurrency || "MYR" }).format(parseFloat(inv.total_amount) * parseFloat(inv.exchange_rate || 1))}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
                {items.length > 3 && (
                    <div className="text-sm text-gray-500 pt-2 border-t">
                        + {items.length - 3} more
                    </div>
                )}
            </div>
        </div>
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
        <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4 px-1">
                Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-3">
                {actions.map((a) => (
                    <Link
                        key={a.label}
                        to={a.href}
                        className="group flex flex-col items-center justify-center gap-3 p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 hover:-translate-y-0.5 transition-all text-gray-700"
                    >
                        <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                            <a.icon size={18} className="text-gray-600 group-hover:text-blue-600 transition-colors" />
                        </div>
                        <span className="text-xs font-semibold text-center">{a.label}</span>
                    </Link>
                ))}
            </div>
        </div>
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
        <div className="page-container animate-in fade-in duration-500">
            <div className="page-header">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight mb-2 text-gray-900">
                        {greeting}, {displayName} 👋
                    </h1>
                    <p className="text-base text-gray-500">
                        Here's what's happening with your finances today.
                    </p>
                </div>
            </div>

            <div className="overview-stats-grid grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8 items-start">
                {/* Main Content Pane */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="bg-white ring-1 ring-gray-900/5 shadow-sm rounded-xl p-6">
                        <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
                            <h3 className="text-base font-semibold text-gray-900">
                                Financial Flow
                            </h3>
                            {analysis?.totalRevenue >= 500000 && (
                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
                                    SSM Registration Required ({">"} RM 500k)
                                </span>
                            )}
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500 flex items-center gap-2">
                                    <div className="w-3 h-3 bg-black rounded-full"></div>
                                    Cash on Hand
                                </span>
                                <span className="font-medium text-gray-900">
                                    {new Intl.NumberFormat("en-US", { style: "currency", currency: summary.base_currency }).format(summary.cash_on_hand)}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500 flex items-center gap-2">
                                    <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                                    Expected Revenue
                                </span>
                                <span className="font-medium text-gray-900">
                                    {new Intl.NumberFormat("en-US", { style: "currency", currency: summary.base_currency }).format(totalReceivable)}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500 flex items-center gap-2">
                                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                                    Upcoming Bills
                                </span>
                                <span className="font-medium text-gray-900">
                                    {new Intl.NumberFormat("en-US", { style: "currency", currency: summary.base_currency }).format(totalPayable)}
                                </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="h-5 w-full flex rounded-full overflow-hidden mt-6 bg-gray-100">
                                {cashPercent > 0 && (
                                    <div
                                        style={{ width: `${cashPercent}%` }}
                                        className="bg-black transition-all duration-500"
                                        title={`Cash: ${cashPercent.toFixed(1)}%`}
                                    ></div>
                                )}
                                {receivablePercent > 0 && (
                                    <div
                                        style={{ width: `${receivablePercent}%` }}
                                        className="bg-gray-300 transition-all duration-500"
                                        title={`Receivables: ${receivablePercent.toFixed(1)}%`}
                                    ></div>
                                )}
                                {payablePercent > 0 && (
                                    <div
                                        style={{ width: `${payablePercent}%` }}
                                        className="bg-red-400 transition-all duration-500"
                                        title={`Payables: ${payablePercent.toFixed(1)}%`}
                                    ></div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-6">
                        <div className="flex-1 bg-white ring-1 ring-gray-900/5 shadow-sm rounded-xl overflow-hidden">
                            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/50">
                                <h3 className="font-medium text-sm flex items-center justify-between">
                                    Active E-Invoices (Customer)
                                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-semibold tracking-wide uppercase">Issuing</span>
                                </h3>
                            </div>
                            <div className="p-4">
                                <AlertCard
                                    title="Customer Receivables"
                                    items={summary.client_pending.filter((inv: any) => inv.type === "issuing")}
                                    baseCurrency={summary.base_currency}
                                />
                            </div>
                        </div>
                        <div className="flex-1 bg-white ring-1 ring-gray-900/5 shadow-sm rounded-xl overflow-hidden">
                            <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/50">
                                <h3 className="font-medium text-sm flex items-center justify-between">
                                    Supplier Bills
                                    <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-semibold tracking-wide uppercase">Receiving</span>
                                </h3>
                            </div>
                            <div className="p-4">
                                <AlertCard
                                    title="Upcoming Bills"
                                    items={summary.supplier_pending}
                                    isSupplier={true}
                                    baseCurrency={summary.base_currency}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Pane */}
                <div className="lg:col-span-4 space-y-6 sticky top-6">
                    <QuickActions />
                </div>
            </div>
        </div>
    );
}
