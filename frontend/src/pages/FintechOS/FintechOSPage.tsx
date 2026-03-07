import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import {
  Activity,
  ShieldCheck,
  TrendingUp,
  FileText,
  Clock,
  Users,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import StatCard from './components/StatCard';
import EInvoiceAnalysis from './components/EInvoiceAnalysis';
import CTOSAnalysis from './components/CTOSAnalysis';
import BusinessRegistration from './components/BusinessRegistration';
import TaxCompliance from './components/TaxCompliance';

import './FintechOS.css';

const PYTHON_API_BASE = 'http://127.0.0.1:8000/api';

export default function FintechOSPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState('readiness');
  const [globalAnalysis, setGlobalAnalysis] = useState<any>(null);
  const [companyName, setCompanyName] = useState('Ctrl-Z SDN BHD');
  const [lastSynced, setLastSynced] = useState<number>(Date.now());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [proposedLoan, setProposedLoan] = useState<number>(() => {
    return Number(localStorage.getItem('fintech_proposed_loan') || '25000');
  });

  useEffect(() => {
    localStorage.setItem('fintech_proposed_loan', proposedLoan.toString());
  }, [proposedLoan]);

  const fetchData = async () => {
    setSyncing(true);
    const ts = Date.now();
    const email = user?.primaryEmailAddress?.emailAddress || '';
    try {
      const [anaRes, compRes] = await Promise.all([
        fetch(`${PYTHON_API_BASE}/analysis?t=${ts}&proposed_loan=${proposedLoan}&email=${encodeURIComponent(email)}`, { cache: 'no-store' }),
        fetch(`${PYTHON_API_BASE}/company?t=${ts}&email=${encodeURIComponent(email)}`, { cache: 'no-store' })
      ]);
      if (!anaRes.ok) throw new Error('API call failed');
      const ana = await anaRes.json();
      const comp = await compRes.json();
      setGlobalAnalysis(ana);
      setCompanyName(comp.name);
      setLastSynced(Date.now());
      setSecondsAgo(0);
    } catch (err) {
      console.error('Fetch Error:', err);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const pollInterval = setInterval(fetchData, 30000);
    return () => clearInterval(pollInterval);
  }, [proposedLoan]);

  // Live "X seconds ago" counter
  useEffect(() => {
    const ticker = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastSynced) / 1000));
    }, 1000);
    return () => clearInterval(ticker);
  }, [lastSynced]);

  return (
    <div className="page-container" style={{ maxWidth: '1400px', width: '100%' }}>
      <header className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 className="page-title">Fintech OS</h1>
          <p className="page-subtitle">{companyName}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
            <Clock size={14} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            {syncing ? 'Syncing...' : `Synced ${secondsAgo}s ago`}
          </div>
          <button
            onClick={fetchData}
            disabled={syncing}
            title="Refresh data from DB"
            className="btn btn-secondary"
            style={{ padding: '0.4rem 0.85rem', height: 'auto', opacity: syncing ? 0.6 : 1 }}
          >
            <TrendingUp size={13} />
            Refresh
          </button>
        </div>
      </header>

      {/* TABS */}
      <div className="tab-container" style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
        <button
          className={`nav-link ${activeTab === 'readiness' ? 'active' : ''}`}
          onClick={() => setActiveTab('readiness')}
          style={{ background: 'transparent', border: 'none', flexDirection: 'row' }}
        >
          <Activity size={16} /> Readiness
        </button>
        <button
          className={`nav-link ${activeTab === 'ctos' ? 'active' : ''}`}
          onClick={() => setActiveTab('ctos')}
          style={{ background: 'transparent', border: 'none', flexDirection: 'row' }}
        >
          <TrendingUp size={16} /> AI CTOS
        </button>
        <button
          className={`nav-link ${activeTab === 'registry' ? 'active' : ''}`}
          onClick={() => setActiveTab('registry')}
          style={{ background: 'transparent', border: 'none', flexDirection: 'row' }}
        >
          <Globe size={16} /> Registry
        </button>
        <button
          className={`nav-link ${activeTab === 'compliance' ? 'active' : ''}`}
          onClick={() => setActiveTab('compliance')}
          style={{ background: 'transparent', border: 'none', flexDirection: 'row' }}
        >
          <ShieldCheck size={16} /> Compliance
        </button>
      </div>

      <section className="grid-container" style={{ marginBottom: '4rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <StatCard
          title="E-Invoices"
          value={globalAnalysis ? `${globalAnalysis.currentMonthCustomerInvoices} Active` : "..."}
          icon={FileText}
        />
        <StatCard
          title="Annual Revenue"
          value={globalAnalysis ? `RM ${globalAnalysis.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "..."}
          icon={TrendingUp}
        />
        <StatCard
          title="Total Staff"
          value={globalAnalysis ? globalAnalysis.staffCount.toString() : "..."}
          icon={Users}
        />
        <StatCard
          title="Loan Readiness"
          value={globalAnalysis ? `${globalAnalysis.loanReadinessScore}%` : "..."}
          icon={Activity}
        />
      </section>

      <AnimatePresence mode="wait">
        {activeTab === 'readiness' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="readiness" transition={{ duration: 0.15 }}>
            <EInvoiceAnalysis
              proposedLoan={proposedLoan}
              setProposedLoan={setProposedLoan}
            />
          </motion.div>
        )}
        {activeTab === 'ctos' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="ctos" transition={{ duration: 0.15 }}>
            <CTOSAnalysis />
          </motion.div>
        )}
        {activeTab === 'registry' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="registry" transition={{ duration: 0.15 }}>
            <BusinessRegistration />
          </motion.div>
        )}
        {activeTab === 'compliance' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="compliance" transition={{ duration: 0.15 }}>
            <TaxCompliance />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
