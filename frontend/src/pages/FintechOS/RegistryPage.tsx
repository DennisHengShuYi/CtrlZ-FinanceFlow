import BusinessRegistration from './components/BusinessRegistration';
import './FintechOS.css';

export default function RegistryPage() {
    return (
        <div className="page-container" style={{ maxWidth: '1400px', width: '100%' }}>
            <h1 className="page-title">Registry</h1>
            <p className="page-subtitle" style={{ marginBottom: "2rem" }}>Business compliance and SSM registration details.</p>
            <BusinessRegistration />
        </div>
    );
}
