export interface EInvoiceStats {
  revenueConsistency: number; // 0-100
  cashFlowCoverage: number; // ratio
  debtToIncome: number; // ratio
  collectionEfficiency: number; // 0-100
  complianceScore: number; // 0-100
  totalRevenue: number;
}

export interface RoadmapStep {
  timeframe: string;
  action: string;
  impact: string;
  status: 'pending' | 'active' | 'completed';
  expectedScore: number;
}

export interface RedFlag {
  type: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

export interface CTOSReport {
  score: number;
  grade: string;
  drivers: {
    paymentHistory: number;
    amountsOwed: number;
    creditMix: number;
    newCredit: number;
    lengthOfCredit: number;
  };
  recommendations: string[];
  redFlags: RedFlag[];
  roadmap: RoadmapStep[];
  loanReadiness: number; // 0-100
  lastUpdated: string;
}

export interface Employee {
  id: string;
  name: string;
  salary: number;
  epf: number;
  socso: number;
  eis: number;
}

export interface MonthlyRevenue {
  month: string;
  revenue: number;
}

export const mockMonthlyRevenue: MonthlyRevenue[] = [
  { month: 'Mar 25', revenue: 35000 },
  { month: 'Apr 25', revenue: 38000 },
  { month: 'May 25', revenue: 42000 },
  { month: 'Jun 25', revenue: 45000 },
  { month: 'Jul 25', revenue: 48000 },
  { month: 'Aug 25', revenue: 52000 },
  { month: 'Sep 25', revenue: 55000 },
  { month: 'Oct 25', revenue: 58000 },
  { month: 'Nov 25', revenue: 62000 },
  { month: 'Dec 25', revenue: 65000 },
  { month: 'Jan 26', revenue: 72000 },
  { month: 'Feb 26', revenue: 78000.5 },
];

export const mockEInvoiceData: EInvoiceStats = {
  revenueConsistency: 88,
  cashFlowCoverage: 2.1,
  debtToIncome: 0.35,
  collectionEfficiency: 94,
  complianceScore: 100,
  totalRevenue: mockMonthlyRevenue.reduce((acc, curr) => acc + curr.revenue, 0),
};

export const REVENUE_THRESHOLD = 500000; // Threshold for legal registration

export const mockCTOS: CTOSReport = {
  score: 685, // Lowered slightly to show room for improvement or red flags
  grade: 'Good',
  lastUpdated: '01 Mar 2026',
  drivers: {
    paymentHistory: 35,
    amountsOwed: 30,
    creditMix: 10,
    newCredit: 10,
    lengthOfCredit: 15,
  },
  redFlags: [
    { type: 'Payment Delay', description: 'Two payments for PTPTN were late by 15 days in Q4 2025.', severity: 'medium' },
    { type: 'Utilization', description: 'Credit card utilization reached 75% in Jan 2026.', severity: 'high' }
  ],
  recommendations: [
    'Keep credit utilization under 30%',
    'Ensure all installments are paid before the due date',
    'Avoid multiple credit applications in a short period',
  ],
  roadmap: [
    { timeframe: 'Month 1', action: 'Settlement of high-utilization card balance below 30%', impact: '+25 points', status: 'active', expectedScore: 710 },
    { timeframe: 'Month 2', action: 'Six consecutive months of on-time installments for PTPTN', impact: '+15 points', status: 'pending', expectedScore: 725 },
    { timeframe: 'Month 3', action: 'Closing of one unused credit line to improve credit age profile', impact: '+10 points', status: 'pending', expectedScore: 735 },
    { timeframe: 'Month 6', action: 'Normalize score above 740 for Grade A status', impact: 'Final Target', status: 'pending', expectedScore: 745 },
  ],
  loanReadiness: 68,
};

export const mockEmployees: Employee[] = [
  { id: '1', name: 'Alex Wong', salary: 4500, epf: 0, socso: 0, eis: 0 },
  { id: '2', name: 'Siti Aminah', salary: 3800, epf: 0, socso: 0, eis: 0 },
  { id: '3', name: 'Raj Kumar', salary: 5200, epf: 0, socso: 0, eis: 0 },
];

export const calculatePayroll = (salary: number) => {
  const epf = salary * 0.11; // Employee 11%
  const socso = salary * 0.005; // ~0.5%
  const eis = salary * 0.002; // ~0.2%
  return { epf, socso, eis, net: salary - epf - socso - eis };
};

export const calculateMonthlyTax = (annualRevenue: number) => {
  // Simplified tax calculation for illustration
  const estimatedProfit = annualRevenue * 0.3; // Assume 30% margin
  const monthlyTax = (estimatedProfit * 0.24) / 12; // 24% tax rate
  return monthlyTax;
};
