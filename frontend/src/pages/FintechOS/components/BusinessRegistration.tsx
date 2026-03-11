import React, { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { Zap, Mail, CheckCircle2, FileText, Users, DollarSign, Paperclip } from 'lucide-react';
import { sendThresholdAlertEmail } from '../services/emailService';
import { useApiFetch } from '../../../hooks/useApiFetch';

const BusinessRegistration = () => {
    const { user } = useUser();
    const apiFetch = useApiFetch();
    const [accepted, setAccepted] = useState(false);
    const [isEmailSent, setIsEmailSent] = useState(false);
    const [lastDispatch, setLastDispatch] = useState<string | null>(null);
    const [ssmResult, setSsmResult] = useState<any>(null);
    const [businessReg, setBusinessReg] = useState<string | null>(null);
    const [totalRevenue, setTotalRevenue] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);
    const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

    const [form, setForm] = useState({
        companyName: 'TECHLANCE SOLUTIONS SDN BHD',
        alternativeName1: 'TECHLANCE DIGITAL SDN BHD',
        alternativeName2: 'TECHLANCE VENTURES SDN BHD',
        businessNature: 'Software Engineering & Digital Transformation',
        msicCode: '62010 - Computer Programming Activities',
        companyType: 'Private Limited (Sdn Bhd)',
        registeredAddress: 'Unit 12-A, Menara TechPark, Jalan Ampang, 50450 Kuala Lumpur',
        directorName: '', directorNric: '', directorDob: '', directorNationality: '', directorAddress: '', directorShares: '',
        director2Name: '', director2Nric: '', director2Dob: '', director2Nationality: '', director2Address: '', director2Shares: '',
        authorisedCapital: '400000', paidUpCapital: '100000', totalShares: '100000', shareValue: '1.00',
    });

    React.useEffect(() => {
        const fetchContext = async () => {
            const email = user?.primaryEmailAddress?.emailAddress || '';
            const ts = Date.now();
            try {
                const [staffData, analysisData, companyData] = await Promise.all([
                    apiFetch(`/api/staff/directors?t=${ts}`),
                    apiFetch(`/api/analysis?t=${ts}`),
                    apiFetch(`/api/company?t=${ts}&email=${encodeURIComponent(email)}`)
                ]);

                if (companyData?.business_reg) {
                    setBusinessReg(companyData.business_reg);
                    setIsLoading(false);
                    return;
                }

                setForm(f => ({
                    ...f,
                    companyName: (companyData.name || f.companyName).toUpperCase(),
                    paidUpCapital: analysisData.totalRevenue ? Math.round(analysisData.totalRevenue * 0.2).toString() : '100000',
                    authorisedCapital: '500000',
                    totalShares: analysisData.totalRevenue ? Math.round(analysisData.totalRevenue * 0.2).toString() : '100000',
                }));

                if (staffData.directors && staffData.directors.length >= 2) {
                    const d1 = staffData.directors[0];
                    const d2 = staffData.directors[1];
                    setForm(f => ({
                        ...f,
                        directorName: d1.name, directorNric: d1.nric || '', directorDob: d1.dob || '',
                        directorNationality: d1.nationality || 'Malaysian', directorAddress: d1.address || '',
                        directorShares: d1.shares?.toString() || '60',
                        director2Name: d2.name, director2Nric: d2.nric || '', director2Dob: d2.dob || '',
                        director2Nationality: d2.nationality || 'Malaysian', director2Address: d2.address || '',
                        director2Shares: d2.shares?.toString() || '40',
                    }));
                }

                setBusinessReg(companyData.business_reg || null);
                setTotalRevenue(analysisData.totalRevenue || 0);
            } catch (err) {
                console.error('Failed to fetch context:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchContext();
    }, [user]);

    React.useEffect(() => {
        if (!isLoading && !businessReg && totalRevenue >= 500000 && !isEmailSent) {
            const triggerEmail = async () => {
                try {
                    await sendThresholdAlertEmail({
                        to: 'admin@techlance.my',
                        subject: 'URGENT: SSM Registration Required — RM 500k Milestone',
                        revenue: totalRevenue // use actual revenue
                    });
                    setIsEmailSent(true);
                    setLastDispatch(new Date().toLocaleTimeString());
                } catch (err) {
                    console.error('Email Dispatch Failed:', err);
                }
            };
            triggerEmail();
        }
    }, [isLoading, businessReg, totalRevenue, isEmailSent]);

    const update = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

    const handleSubmit = async () => {
        const data = await apiFetch(`/api/ssm/register`, {
            method: 'POST',
            body: JSON.stringify(form)
        });
        setSsmResult(data);
        setAccepted(true);
    };

    if (isLoading) {
        return <div className="fintech-card" style={{ textAlign: 'center', padding: '4rem 1rem' }}>Loading SSM Registration Status...</div>;
    }

    if (businessReg) {
        return (
            <div className="fintech-card" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
                <CheckCircle2 color="#16a349" size={52} style={{ margin: '0 auto 1.5rem' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Business Already Registered</h3>
                <p style={{ color: 'oklch(0.44 0 0)', fontSize: '0.875rem' }}>
                    SSM Registration Number: <span style={{ fontWeight: 600 }}>{businessReg}</span>
                </p>
            </div>
        );
    }

    if (totalRevenue < 500000) {
        return (
            <div className="fintech-card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, background: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                    <Users size={24} color="#6b7280" />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>Registration Not Yet Required</h3>
                <p style={{ color: 'oklch(0.44 0 0)', fontSize: '0.875rem', marginBottom: '1.5rem', maxWidth: '400px', margin: '0 auto 1.5rem' }}>
                    Your business has not yet reached the RM 500,000 revenue threshold. Mandatory SSM Registration is not required at this time.
                </p>
                <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '1.5rem', maxWidth: '400px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                        <span style={{ color: '#4b5563' }}>Current Revenue</span>
                        <span style={{ fontWeight: 600 }}>RM {(totalRevenue).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, (totalRevenue / 500000) * 100)}%`, height: '100%', background: '#3b82f6' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.75rem' }}>
                        <span style={{ color: '#9ca3af' }}>0</span>
                        <span style={{ color: '#9ca3af' }}>Threshold: RM 500k</span>
                    </div>
                </div>
            </div>
        );
    }

    if (accepted) {
        return (
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{ textAlign: 'center', padding: '6rem 1rem' }}
                className="fintech-card"
            >
                <CheckCircle2 color="#16a349" size={52} style={{ marginBottom: '1.5rem' }} />
                <h3 style={{ fontSize: '1.375rem', fontWeight: 650, marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
                    Registration Initialized
                </h3>
                <p style={{ color: 'oklch(0.44 0 0)', fontSize: '0.875rem', marginBottom: '2rem' }}>
                    Your SSM application has been submitted successfully.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <span className="fintech-badge fintech-badge-success" style={{ fontSize: '0.7rem', padding: '0.3rem 0.75rem' }}>
                        Ref: {ssmResult?.ref_no || 'SSM-2026-TL-8821'}
                    </span>
                    <span className="fintech-badge fintech-badge-neutral" style={{ fontSize: '0.7rem', padding: '0.3rem 0.75rem' }}>
                        Cert: {ssmResult?.digital_cert || 'CERT-A4-MY-2026'}
                    </span>
                </div>
            </motion.div>
        );
    }

    return (
        <div className="fintech-card">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 36, height: 36, background: '#fef9c3', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Zap size={18} color="#ca8a04" />
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 650, letterSpacing: '-0.02em', color: '#000' }}>
                            SSM Registration Hub
                        </h2>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'oklch(0.44 0 0)' }}>AI-prefilled from LHDN & E-Invoice records</p>
                    </div>
                </div>
                <span className="fintech-badge fintech-badge-warning">Action Required</span>
            </div>

            {/* Notification bar */}
            <div style={{ padding: '0.75rem 1rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                <Mail size={15} color="#16a349" />
                <span style={{ fontSize: '0.8rem', color: '#166534', flex: 1 }}>
                    {isEmailSent
                        ? `Threshold alert dispatched at ${lastDispatch}. Please complete registration below.`
                        : 'Monitoring revenue for legal registration requirement...'}
                </span>
                <span className="fintech-badge fintech-badge-success">AI-Prefill Active</span>
            </div>

            {/* Section 1 — Company Identity */}
            <div className="registry-section">
                <div className="registry-section-title">
                    <FileText size={14} />
                    Section 1 — Company Identity
                </div>
                <div className="registry-grid">
                    <div className="registry-field">
                        <label>Proposed Company Name (1st Choice)</label>
                        <input value={form.companyName} onChange={e => update('companyName', e.target.value)} />
                    </div>
                    <div className="registry-field">
                        <label>Alternative Name (2nd Choice)</label>
                        <input value={form.alternativeName1} onChange={e => update('alternativeName1', e.target.value)} />
                    </div>
                    <div className="registry-field">
                        <label>Alternative Name (3rd Choice)</label>
                        <input value={form.alternativeName2} onChange={e => update('alternativeName2', e.target.value)} />
                    </div>
                    <div className="registry-field">
                        <label>Company Type</label>
                        <input value={form.companyType} disabled />
                    </div>
                    <div className="registry-field" style={{ gridColumn: '1 / -1' }}>
                        <label>Primary Business Activity (MSIC Code)</label>
                        <input value={form.msicCode} disabled />
                        <p style={{ fontSize: '0.65rem', color: 'oklch(0.44 0 0)', marginTop: '0.3rem' }}>Verified by E-Invoice Sentiment Analysis</p>
                    </div>
                    <div className="registry-field" style={{ gridColumn: '1 / -1' }}>
                        <label>Registered Business Address</label>
                        <input value={form.registeredAddress} onChange={e => update('registeredAddress', e.target.value)} />
                    </div>
                </div>
            </div>

            {/* Section 2 — Directors */}
            <div className="registry-section">
                <div className="registry-section-title">
                    <Users size={14} />
                    Section 2 — Directors & Shareholders
                </div>
                {[
                    { prefix: 'director', label: 'Director 1 — Majority Shareholder' },
                    { prefix: 'director2', label: 'Director 2 — Minority Shareholder' },
                ].map(({ prefix, label }) => (
                    <div key={prefix} className="registry-director-block">
                        <div className="registry-director-label">{label}</div>
                        <div className="registry-grid">
                            <div className="registry-field">
                                <label>Full Name (as per NRIC)</label>
                                <input value={(form as any)[`${prefix}Name`]} onChange={e => update(`${prefix}Name`, e.target.value)} />
                            </div>
                            <div className="registry-field">
                                <label>NRIC Number</label>
                                <input value={(form as any)[`${prefix}Nric`]} onChange={e => update(`${prefix}Nric`, e.target.value)} />
                            </div>
                            <div className="registry-field">
                                <label>Date of Birth</label>
                                <input type="date" value={(form as any)[`${prefix}Dob`]} onChange={e => update(`${prefix}Dob`, e.target.value)} />
                            </div>
                            <div className="registry-field">
                                <label>Shareholding (%)</label>
                                <input value={(form as any)[`${prefix}Shares`]} onChange={e => update(`${prefix}Shares`, e.target.value)} />
                            </div>
                            <div className="registry-field" style={{ gridColumn: '1 / -1' }}>
                                <label>Residential Address</label>
                                <input value={(form as any)[`${prefix}Address`]} onChange={e => update(`${prefix}Address`, e.target.value)} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Section 3 — Share Capital */}
            <div className="registry-section">
                <div className="registry-section-title">
                    <DollarSign size={14} />
                    Section 3 — Share Capital
                </div>
                <div className="registry-grid">
                    {[
                        { label: 'Total Authorised Capital (RM)', key: 'authorisedCapital' },
                        { label: 'Paid-Up Capital (RM)', key: 'paidUpCapital' },
                        { label: 'Total Shares Issued', key: 'totalShares' },
                        { label: 'Par Value Per Share (RM)', key: 'shareValue' },
                    ].map(({ label, key }) => (
                        <div key={key} className="registry-field">
                            <label>{label}</label>
                            <input value={(form as any)[key]} onChange={e => update(key, e.target.value)} />
                        </div>
                    ))}
                </div>
            </div>

            {/* Section 4 — Documents */}
            <div className="registry-section">
                <div className="registry-section-title">
                    <Paperclip size={14} />
                    Section 4 — Supporting Documents
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {[
                        { doc: 'NRIC Copy (Director 1)', key: 'nric1' },
                        { doc: 'NRIC Copy (Director 2)', key: 'nric2' },
                        { doc: 'Consent to Act (Form 49)', key: 'f49' },
                        { doc: 'Share Statement (Form 24)', key: 'f24' },
                        { doc: 'Company Constitution', key: 'constitution' },
                    ].map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: '#fff', borderRadius: '6px', border: '1px solid oklch(0.92 0 0)' }}>
                            <span style={{ fontSize: '0.8125rem', color: '#000' }}>{item.doc}</span>
                            {uploadedFiles.includes(item.key) ? (
                                <span className="fintech-badge fintech-badge-success">✓ Uploaded</span>
                            ) : (
                                <label className="fintech-btn fintech-btn-secondary" style={{ height: 'auto', padding: '0.25rem 0.6rem', fontSize: '0.7rem', cursor: 'pointer' }}>
                                    <Paperclip size={10} /> Upload
                                    <input type="file" style={{ display: 'none' }} onChange={() => setUploadedFiles(p => [...p, item.key])} />
                                </label>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <button className="fintech-btn fintech-btn-primary" style={{ width: '100%', height: '3rem', fontSize: '0.9375rem' }} onClick={handleSubmit}>
                Initialize SSM Submission
            </button>
        </div>
    );
};

export default BusinessRegistration;
