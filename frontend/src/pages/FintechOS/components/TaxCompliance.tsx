import React, { useState } from 'react';
import { useUser } from '@clerk/clerk-react';

const PYTHON_API_BASE = 'http://127.0.0.1:8000/api';

const TaxCompliance = () => {
    const { user } = useUser();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAnnualSubmitted, setIsAnnualSubmitted] = useState(false);
    const [isMonthlySubmitted, setIsMonthlySubmitted] = useState(false);
    const [isSSMSubmitted, setIsSSMSubmitted] = useState(false);
    const [isReviewingSSM, setIsReviewingSSM] = useState(false);
    const [companyName, setCompanyName] = useState('Ctrl-Z SDN BHD');
    const [ssmReviewData, setSsmReviewData] = useState<any>(null);

    React.useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            const email = user?.primaryEmailAddress?.emailAddress || '';
            const ts = Date.now();
            try {
                const [complianceRes, companyRes] = await Promise.all([
                    fetch(`${PYTHON_API_BASE}/compliance?t=${ts}&email=${encodeURIComponent(email)}`),
                    fetch(`${PYTHON_API_BASE}/company?t=${ts}&email=${encodeURIComponent(email)}`)
                ]);
                if (!complianceRes.ok || !companyRes.ok) throw new Error('API error');
                const [compData, company] = await Promise.all([complianceRes.json(), companyRes.json()]);
                setData(compData);
                setCompanyName(company.name || 'Ctrl-Z SDN BHD');
            } catch (err: any) {
                setError('Could not load compliance data. Is the backend running?');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    const handleAnnualSubmit = () => {
        setIsAnnualSubmitted(true);
        fetch(`${PYTHON_API_BASE}/ssm/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'annual_tax', revenue: data.total_revenue }),
        });
    };

    const handleMonthlySubmit = () => setIsMonthlySubmitted(true);

    const handleSSMReturnReview = () => {
        setSsmReviewData({
            companyName,
            financialYear: '2026',
            turnover: data.total_revenue,
            staffCount: data.payroll.length,
            directors: data.payroll.filter((p: any) => p.salary > 10000).map((p: any) => p.name).join(', ')
        });
        setIsReviewingSSM(true);
    };

    const handleSSMReturnFinal = () => {
        setIsSSMSubmitted(true);
        setIsReviewingSSM(false);
        fetch(`${PYTHON_API_BASE}/ssm/annual-return`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ssmReviewData),
        });
    };

    const downloadPDF = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;
        printWindow.document.write(`
            <html>
                <head>
                    <title>Income Tax Filing — LHDN Form C</title>
                    <style>
                        body { font-family: 'Inter', sans-serif; padding: 40px; color: #1a1a1a; }
                        .header { border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
                        .section { margin-bottom: 25px; }
                        .label { font-weight: 600; color: #666; font-size: 11px; text-transform: uppercase; }
                        .value { font-size: 18px; margin-top: 5px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                        th { background: #f5f5f5; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>LHDN MALAYSIA — FORM C</h1>
                        <p>Income Tax Return Form for Company (Assessment Year 2026)</p>
                    </div>
                    <div class="section">
                        <div class="label">Taxpayer Name</div>
                        <div class="value">${companyName}</div>
                    </div>
                    <div class="section">
                        <div class="label">Total Revenue (TTM)</div>
                        <div class="value">RM ${data.total_revenue.toLocaleString()}</div>
                    </div>
                    <div class="section">
                        <div class="label">Estimated Monthly Tax</div>
                        <div class="value">RM ${data.monthly_tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    </div>
                    <div class="section">
                        <h3>Payroll Summary</h3>
                        <table>
                            <thead>
                                <tr><th>Employee</th><th>Gross</th><th>EPF</th><th>SOCSO</th><th>EIS</th><th>Tax (PCB)</th><th>Net Pay</th></tr>
                            </thead>
                            <tbody>
                                ${data.payroll.map((p: any) => `
                                    <tr>
                                        <td>${p.name}</td>
                                        <td>RM ${(p.gross_salary || p.salary).toLocaleString()}</td>
                                        <td>RM ${(p.epf || 0).toFixed(0)}</td>
                                        <td>RM ${(p.socso || 0).toFixed(0)}</td>
                                        <td>RM ${(p.eis || 0).toFixed(2)}</td>
                                        <td>RM ${(p.tax || 0).toFixed(0)}</td>
                                        <td>RM ${(p.net_salary || p.net || 0).toLocaleString()}</td>
                                    </tr>`).join('')}
                            </tbody>
                        </table>
                    </div>
                    <script>window.print();</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    if (loading) return (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'oklch(0.44 0 0)', fontSize: '0.875rem' }}>
            Calculating compliance...
        </div>
    );

    if (error) return (
        <div className="fintech-card" style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{error}</p>
            <p style={{ color: 'oklch(0.44 0 0)', fontSize: '0.75rem' }}>Check that the backend server is running on port 8000.</p>
        </div>
    );

    if (!data) return null;

    return (
        <div className="fintech-card">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: 650, letterSpacing: '-0.02em', color: '#000', margin: 0 }}>
                        Tax & Statutory Center
                    </h2>
                    <p style={{ marginTop: '0.25rem', fontSize: '0.8125rem', color: 'oklch(0.44 0 0)' }}>
                        Automated Malaysian compliance engine — {companyName}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span className="fintech-badge fintech-badge-success">LHDN Sync Active</span>
                    <span className="fintech-badge fintech-badge-success">SSM Linked</span>
                </div>
            </div>

            {/* Top metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {[
                    { label: 'Monthly Tax Est.', value: `RM ${data.monthly_tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}` },
                    { label: 'Staff Count', value: `${data.payroll?.length ?? 0} members` },
                ].map(({ label, value }) => (
                    <div key={label} style={{ padding: '1rem', background: '#fafafa', borderRadius: '8px', border: '1px solid oklch(0.92 0 0)' }}>
                        <div style={{ fontSize: '0.6rem', color: 'oklch(0.44 0 0)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>{label}</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', color: '#000' }}>{value}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px,1fr) 2fr', gap: '2rem', marginBottom: '2rem' }}>
                {/* Left: Tax note + actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ padding: '1rem', background: '#fafafa', borderRadius: '8px', border: '1px solid oklch(0.92 0 0)', fontSize: '0.75rem', color: 'oklch(0.44 0 0)', lineHeight: 1.6 }}>
                        <div style={{ fontWeight: 600, color: '#000', marginBottom: '0.4rem' }}>SME Tiered Calculation</div>
                        • First RM 150k @ 15%<br />
                        • Next RM 450k @ 17%<br />
                        • Balance @ 24%<br />
                        <div style={{ marginTop: '0.5rem', opacity: 0.8 }}>
                            Annualized Profit Est.: RM {((data.metrics?.estimated_annual_profit) ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        <button className="fintech-btn fintech-btn-primary" style={{ width: '100%', height: '2.5rem' }} onClick={handleAnnualSubmit} disabled={isAnnualSubmitted}>
                            {isAnnualSubmitted ? 'Form C Submitted ✓' : 'Submit Annual Form C'}
                        </button>
                        <button className="fintech-btn fintech-btn-secondary" style={{ width: '100%', height: '2.5rem' }} onClick={downloadPDF}>
                            Download Tax Filing (PDF)
                        </button>

                        <div style={{ padding: '0.875rem', background: '#fafafa', borderRadius: '8px', border: '1px solid oklch(0.92 0 0)', marginTop: '0.25rem' }}>
                            <div style={{ fontSize: '0.6875rem', color: 'oklch(0.44 0 0)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>SSM Annual Return</div>
                            {isReviewingSSM ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.6rem', color: 'oklch(0.44 0 0)', marginBottom: '0.25rem' }}>Company Name</label>
                                        <input
                                            style={{ width: '100%', padding: '0.4rem', border: '1px solid oklch(0.92 0 0)', borderRadius: '4px', fontSize: '0.75rem', background: '#fff', boxSizing: 'border-box' }}
                                            value={ssmReviewData.companyName}
                                            onChange={(e) => setSsmReviewData({ ...ssmReviewData, companyName: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.6rem', color: 'oklch(0.44 0 0)', marginBottom: '0.25rem' }}>Turnover (RM)</label>
                                        <input
                                            style={{ width: '100%', padding: '0.4rem', border: '1px solid oklch(0.92 0 0)', borderRadius: '4px', fontSize: '0.75rem', background: '#fff', boxSizing: 'border-box' }}
                                            value={ssmReviewData.turnover}
                                            type="number"
                                            onChange={(e) => setSsmReviewData({ ...ssmReviewData, turnover: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                    <button className="fintech-btn fintech-btn-primary" style={{ width: '100%' }} onClick={handleSSMReturnFinal}>
                                        File Final Return
                                    </button>
                                </div>
                            ) : (
                                <button className="fintech-btn fintech-btn-secondary" style={{ width: '100%', fontSize: '0.75rem' }} onClick={handleSSMReturnReview} disabled={isSSMSubmitted}>
                                    {isSSMSubmitted ? 'SSM Return Filed ✓' : 'Review & File Return (SSM)'}
                                </button>
                            )}
                            <p style={{ marginTop: '0.5rem', fontSize: '0.6rem', color: 'oklch(0.55 0 0)' }}>Due within 30 days from anniversary.</p>
                        </div>
                    </div>
                </div>

                {/* Right: Payroll table */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h3 style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'oklch(0.44 0 0)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                            Payroll Contributions
                        </h3>
                        <span className="fintech-badge fintech-badge-neutral">{data.payroll.length} Employees</span>
                    </div>

                    <div style={{ background: '#ffffff', border: '1px solid oklch(0.92 0 0)', borderRadius: '8px', overflow: 'hidden' }}>
                        <table className="fintech-table">
                            <thead>
                                <tr>
                                    <th>Staff Member</th>
                                    <th>Gross Salary</th>
                                    <th>Deductions</th>
                                    <th style={{ textAlign: 'right' }}>Net Pay</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.payroll.map((emp: any) => (
                                    <tr key={emp.id}>
                                        <td style={{ fontWeight: 550, color: '#000' }}>{emp.name}</td>
                                        <td>RM {(emp.gross_salary || emp.salary).toLocaleString()}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                                                {[
                                                    { k: 'EPF', v: emp.epf },
                                                    { k: 'SOCSO', v: emp.socso },
                                                    { k: 'EIS', v: emp.eis },
                                                    { k: 'PCB', v: emp.tax },
                                                ].map(({ k, v }) => (
                                                    <span key={k} className="fintech-badge fintech-badge-neutral" style={{ fontSize: '0.55rem' }}>{k} {Number(v).toFixed(0)}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 600, color: '#000' }}>
                                            RM {(emp.net_salary || emp.net || 0).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <button className="fintech-btn fintech-btn-secondary" style={{ width: '100%', marginTop: '1rem' }} onClick={handleMonthlySubmit} disabled={isMonthlySubmitted}>
                        {isMonthlySubmitted ? 'Payments Confirmed ✓' : 'Process Monthly Statutory'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TaxCompliance;
