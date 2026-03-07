import TaxCompliance from './components/TaxCompliance';
import './FintechOS.css';

export default function CompliancePage() {
    return (
        <div className="page-container" style={{ maxWidth: '1400px', width: '100%' }}>
            <h1 className="page-title">Compliance</h1>
            <p className="page-subtitle" style={{ marginBottom: "2rem" }}>Tax compliance, PCB/EPF estimates, and accounting health.</p>
            <TaxCompliance />
        </div>
    );
}
