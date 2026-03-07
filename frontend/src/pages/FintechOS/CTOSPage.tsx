import CTOSAnalysis from './components/CTOSAnalysis';
import './FintechOS.css';

export default function CTOSPage() {
    return (
        <div className="page-container" style={{ maxWidth: '1400px', width: '100%' }}>
            <h1 className="page-title">AI CTOS</h1>
            <p className="page-subtitle" style={{ marginBottom: "2rem" }}>Credit risk and behavior analytics.</p>
            <CTOSAnalysis />
        </div>
    );
}
