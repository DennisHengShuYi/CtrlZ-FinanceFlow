import { useState } from 'react';
import EInvoiceAnalysis from './components/EInvoiceAnalysis';
import './FintechOS.css';

export default function ReadinessPage() {
    const [proposedLoan, setProposedLoan] = useState<number>(25000);
    return (
        <div className="page-container" style={{ maxWidth: '1400px', width: '100%' }}>
            <h1 className="page-title">Readiness</h1>
            <p className="page-subtitle" style={{ marginBottom: "2rem" }}>Real-time sentiment from Supabase data engine.</p>
            <EInvoiceAnalysis proposedLoan={proposedLoan} setProposedLoan={setProposedLoan} />
        </div>
    );
}
