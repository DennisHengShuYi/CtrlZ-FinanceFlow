import React, { useState } from 'react';
import { motion } from 'framer-motion';
import ProgressBar from './ProgressBar';
import { Activity, CheckCircle2 } from 'lucide-react';

const PYTHON_API_BASE = 'http://127.0.0.1:8000/api';

interface EInvoiceProps {
    proposedLoan: number;
    setProposedLoan: (val: number) => void;
}

const EInvoiceAnalysis = ({ proposedLoan, setProposedLoan }: EInvoiceProps) => {
    const [revenueData, setRevenueData] = useState<any[]>([]);
    const [analysis, setAnalysis] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [localInput, setLocalInput] = useState(proposedLoan.toString());

    React.useEffect(() => {
        const fetchAnalysis = async () => {
            setLoading(true);
            setError(null);
            try {
                const ts = Date.now();
                const [revRes, anaRes] = await Promise.all([
                    fetch(`${PYTHON_API_BASE}/revenue?t=${ts}`),
                    fetch(`${PYTHON_API_BASE}/analysis?t=${ts}&proposed_loan=${proposedLoan}`)
                ]);
                if (!revRes.ok || !anaRes.ok) throw new Error('API returned an error');
                const rev = await revRes.json();
                const ana = await anaRes.json();
                setRevenueData(rev);
                setAnalysis(ana);
            } catch (err: any) {
                setError('Could not load analysis data. Is the backend running?');
            } finally {
                setLoading(false);
            }
        };
        fetchAnalysis();
    }, [proposedLoan]);

    if (loading) return (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'oklch(0.44 0 0)', fontSize: '0.875rem' }}>
            Analysis engine loading...
        </div>
    );

    if (error) return (
        <div className="fintech-card" style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{error}</p>
            <p style={{ color: 'oklch(0.44 0 0)', fontSize: '0.75rem' }}>Check that the backend server is running on port 8000.</p>
        </div>
    );

    if (!analysis) return null;

    const handleLoanSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setProposedLoan(parseFloat(localInput) || 25000);
    };

    const last6Months = revenueData.slice(-6);
    const maxRevenue = last6Months.length > 0 ? Math.max(...last6Months.map((m: any) => m.revenue), 1) : 1;

    return (
        <div className="fintech-card">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 650, letterSpacing: '-0.02em', color: '#000', margin: 0 }}>
                        Loan Readiness Analytics
                    </h2>
                    <p style={{ marginTop: '0.25rem', fontSize: '0.8125rem', color: 'oklch(0.44 0 0)' }}>
                        Real-time sentiment from Supabase data engine
                    </p>
                </div>
                <span className="fintech-badge fintech-badge-success">
                    <span className="fintech-pulse-dot" />
                    Engine Live
                </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) 2fr', gap: '2.5rem' }}>
                {/* Left: Factors */}
                <div>
                    {/* Loan simulation input */}
                    <div style={{ marginBottom: '1.75rem', padding: '1rem', background: '#fafafa', borderRadius: '8px', border: '1px solid oklch(0.92 0 0)' }}>
                        <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.44 0 0)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                            Simulate Monthly Repayment
                        </label>
                        <form onSubmit={handleLoanSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
                            <div style={{ position: 'relative', flex: 1 }}>
                                <span style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'oklch(0.44 0 0)' }}>RM</span>
                                <input
                                    type="number"
                                    value={localInput}
                                    onChange={(e) => setLocalInput(e.target.value)}
                                    style={{ width: '100%', background: '#fff', border: '1px solid oklch(0.92 0 0)', borderRadius: '6px', padding: '0.5rem 0.6rem 0.5rem 2.2rem', fontSize: '0.875rem', color: '#000', boxSizing: 'border-box' }}
                                />
                            </div>
                            <button className="fintech-btn fintech-btn-primary" type="submit" style={{ padding: '0 0.875rem' }}>
                                Recalculate
                            </button>
                        </form>
                    </div>

                    <h3 style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.44 0 0)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                        Readiness Factors
                    </h3>
                    <ProgressBar label="Revenue Consistency (15%)" value={analysis.revenueConsistency} max={100} suffix="%" />
                    <ProgressBar label="Collection Efficiency (10%)" value={analysis.collectionEfficiency} max={100} suffix="%" />
                    <ProgressBar label={`Cash Flow Coverage (30%) — RM ${(analysis.proposedLoanValue || proposedLoan).toLocaleString()}`} value={analysis.cashflowScore} max={100} suffix="%" />
                    <ProgressBar label="Debt-to-Income (20%)" value={analysis.dtiScore} max={100} suffix="%" />
                    <ProgressBar label="Asset Strength (15%)" value={analysis.assetScore} max={100} suffix="%" />
                    <ProgressBar label="Compliance Health (10%)" value={analysis.complianceScore} max={100} suffix="%" />

                    {/* Auto-registration sync */}
                    <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#fafafa', borderRadius: '8px', border: '1px solid oklch(0.92 0 0)' }}>
                        <div style={{ fontSize: '0.6875rem', color: 'oklch(0.44 0 0)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                            Auto-Registration Sync
                        </div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {analysis.totalRevenue >= 500000 ? (
                                <>
                                    <CheckCircle2 size={14} color="#16a349" />
                                    Milestone Reached (Prefill Active)
                                </>
                            ) : (
                                <>
                                    <Activity size={14} style={{ opacity: 0.5 }} />
                                    Monitoring Milestone (RM 500k)
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Revenue chart */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.44 0 0)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                            Revenue Momentum <span style={{ fontWeight: 400, textTransform: 'none' }}>(Last 6 Months)</span>
                        </h3>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#000' }}>
                            Σ RM {last6Months.reduce((s: number, m: any) => s + m.revenue, 0).toLocaleString()}
                        </span>
                    </div>

                    <div className="fintech-chart">
                        {last6Months.map((m: any, idx: number) => (
                            <motion.div
                                key={idx}
                                initial={{ height: 0 }}
                                animate={{ height: `${(m.revenue / maxRevenue) * 100}%` }}
                                className="fintech-bar"
                                title={`${m.month}: RM ${m.revenue.toLocaleString()}`}
                            />
                        ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem' }}>
                        <span style={{ fontSize: '0.6875rem', color: 'oklch(0.44 0 0)' }}>{last6Months[0]?.month}</span>
                        <span style={{ fontSize: '0.6875rem', color: '#000', fontWeight: 600 }}>{last6Months[last6Months.length - 1]?.month}</span>
                    </div>

                    {/* Summary metric row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginTop: '2rem' }}>
                        {[
                            { label: 'Loan Score', value: `${analysis.loanReadinessScore?.toFixed(1)}%` },
                            { label: 'Annual Revenue', value: `RM ${(analysis.totalRevenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
                        ].map((item) => (
                            <div key={item.label} style={{ padding: '0.875rem', background: '#fafafa', borderRadius: '8px', border: '1px solid oklch(0.92 0 0)', textAlign: 'center' }}>
                                <div style={{ fontSize: '0.6rem', color: 'oklch(0.44 0 0)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{item.label}</div>
                                <div style={{ fontSize: '1.125rem', fontWeight: 700, letterSpacing: '-0.02em', marginTop: '0.25rem' }}>{item.value}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EInvoiceAnalysis;
