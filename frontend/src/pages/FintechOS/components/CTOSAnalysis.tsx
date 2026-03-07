import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

const PYTHON_API_BASE = 'http://127.0.0.1:8000/api';

const CTOSAnalysis = () => {
    const [isRetrieving, setIsRetrieving] = useState(false);
    const [report, setReport] = useState<any>(null);

    const handleRetrieve = () => {
        setIsRetrieving(true);
        fetch(`${PYTHON_API_BASE}/ctos`)
            .then(res => res.json())
            .then(data => {
                setReport(data);
                setIsRetrieving(false);
            });
    };

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '3rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.25rem' }}>Credit Intelligence Hub</h2>
                    <p style={{ marginTop: '0.25rem' }}>AI-driven CTOS report synthesis</p>
                </div>
                {!report && (
                    <button className="btn btn-primary" onClick={handleRetrieve} disabled={isRetrieving}>
                        {isRetrieving ? 'Processing...' : 'Run Analysis'}
                    </button>
                )}
            </div>

            <AnimatePresence>
                {report && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div className="grid-container" style={{ gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '3rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                <div className="card" style={{ background: 'var(--muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                                    <div className="card-title">Credit Score</div>
                                    <div style={{ fontSize: '4rem', fontWeight: 700, margin: '1rem 0', letterSpacing: 'var(--tracking-tighter)' }}>
                                        {report.score}
                                    </div>
                                    <div className="badge badge-success">{report.grade}</div>
                                </div>
                            </div>

                            <div>
                                <h3 style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Report Breakdown</h3>

                                {/* Dynamic CTOS Element Explanations */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '3rem' }}>
                                    {report.elements.map((el: any, i: number) => (
                                        <div key={i} style={{ padding: '1rem', background: 'oklch(0.9851 0 0 / 0.05)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{el.name}</span>
                                                <span className="badge" style={{ background: 'var(--muted)', fontSize: '0.625rem' }}>{el.value}</span>
                                            </div>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', margin: 0 }}>{el.explanation}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Red Flags + Immediate Roadmap */}
                                <h3 style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Priority Action Plan</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    {report.red_flags.map((flag: any, i: number) => (
                                        <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                                            <div style={{ padding: '1rem', background: 'oklch(0.3 0.1 20 / 0.1)', display: 'flex', gap: '1rem', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                                                <AlertCircle size={16} color="var(--destructive)" />
                                                <div>
                                                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--destructive)' }}>{flag.type}</div>
                                                    <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: 'var(--foreground)' }}>{flag.description}</p>
                                                </div>
                                            </div>
                                            <div style={{ padding: '1rem', background: 'var(--background)' }}>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Improvement Action</div>
                                                <p style={{ margin: '0 0 0.5rem', fontSize: '0.8125rem', fontWeight: 500 }}>{flag.roadmap_action}</p>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--success)' }}></div>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Impact: {flag.roadmap_impact}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Final Bank Decision */}
                                <div style={{ marginTop: '3rem', padding: '1.5rem', background: 'var(--muted)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', textAlign: 'center' }}>
                                    <h3 style={{ fontSize: '0.6875rem', color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>Partner Bank Verdict</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: report.loan_probability >= 70 ? 'var(--success)' : 'var(--foreground)' }}>
                                            {report.bank_decision}
                                        </div>
                                        {report.red_flags && report.red_flags[0]?.loan_approval_prediction && (
                                            <div style={{ padding: '0.75rem 1.5rem', background: 'var(--background)', borderRadius: '1rem', border: '1px solid var(--border)', marginTop: '0.5rem' }}>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--muted-foreground)', textTransform: 'uppercase' }}>Loan Approval Likelihood</div>
                                                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'oklch(0.7 0.25 145)' }}>
                                                    {report.red_flags[0].loan_approval_prediction}%
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <p style={{ fontSize: '0.8125rem', color: 'var(--muted-foreground)', marginTop: '1rem' }}>
                                        Based on a {report.loan_probability}% probability of successful loan servicing.
                                    </p>
                                </div>
                            </div>

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CTOSAnalysis;
