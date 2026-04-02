import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  Plus, 
  Download, 
  CheckCircle2, 
  Clock, 
  User, 
  FileText, 
  ArrowRight,
  X,
  Info,
  Calendar,
  CreditCard,
  ShieldCheck,
  Trash2,
  Search,
  ChevronDown,
  Filter,
  CheckSquare,
  Square,
  AlertTriangle,
  FileDown,
  RefreshCw,
  Check,
  LayoutDashboard,
  TrendingUp,
  PieChart as PieChartIcon,
  Moon,
  Sun,
  Users,
  Repeat,
  Settings,
  Briefcase
} from 'lucide-react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';

interface Client {
  id: string;
  name: string;
  email: string;
  category: string;
  createdAt: string;
}

interface RecurringInvoice {
  id: string;
  clientId: string;
  customerName: string;
  amount: number;
  payeeName: string;
  payeeVpa: string;
  productOrService: string;
  frequency: 'weekly' | 'monthly';
  nextRunDate: string;
  createdAt: string;
  currency: string;
}

interface Invoice {
  id: string;
  customerName: string;
  amount: number;
  payeeName: string;
  payeeVpa: string;
  status: 'paid' | 'unpaid';
  createdAt: string;
  productOrService?: string;
  currency: string;
}

interface Stats {
  totalCount: number;
  paidCount: number;
  unpaidCount: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
}

const DEFAULT_PAYEE_NAME = "Ruthwik Reddy";
const DEFAULT_PAYEE_VPA = "7842906633@ybl";

const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
];

const getCurrencySymbol = (code: string) => {
  return CURRENCIES.find(c => c.code === code)?.symbol || code;
};

export default function App() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [recurringInvoices, setRecurringInvoices] = useState<RecurringInvoice[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showClientsModal, setShowClientsModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showDashboard, setShowDashboard] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  
  // New States
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'id' | 'amount' | 'date'>('date');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  
  // CSV Export States
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFields, setExportFields] = useState({
    id: true,
    customerName: true,
    productOrService: true,
    amount: true,
    status: true,
    createdAt: true,
    payeeName: true,
    payeeVpa: true
  });

  // QR Feedback State
  const [isScanned, setIsScanned] = useState(false);

  // Client Form State
  const [clientFormData, setClientFormData] = useState({
    name: '',
    email: '',
    category: 'General'
  });

  // Recurring Form State
  const [recurringFormData, setRecurringFormData] = useState({
    clientId: '',
    amount: '',
    frequency: 'monthly' as 'weekly' | 'monthly',
    productOrService: '',
    currency: 'INR'
  });

  // Form state
  const [formData, setFormData] = useState({
    id: Math.random().toString(36).substring(2, 10).toUpperCase(),
    customerName: '',
    amount: '',
    payeeName: DEFAULT_PAYEE_NAME,
    payeeVpa: DEFAULT_PAYEE_VPA,
    productOrService: '',
    isRecurring: false,
    frequency: 'monthly' as 'weekly' | 'monthly',
    currency: 'INR'
  });

  const regenerateId = () => {
    setFormData(prev => ({
      ...prev,
      id: Math.random().toString(36).substring(2, 10).toUpperCase()
    }));
  };

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/health');
        if (!res.ok) throw new Error('Health check failed');
        console.log('Server health check successful');
      } catch (error) {
        console.error('Server health check failed:', error);
      }
    };
    checkHealth();
    fetchInvoices();
    fetchClients();
    fetchRecurringInvoices();
  }, []);

  useEffect(() => {
    if (selectedInvoice) {
      generateQrCode(selectedInvoice);
    }
  }, [selectedInvoice]);

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/clients');
      const data = await res.json();
      setClients(data);
    } catch (error) {
      console.error('Failed to fetch clients', error);
    }
  };

  const fetchRecurringInvoices = async () => {
    try {
      const res = await fetch('/api/recurring-invoices');
      const data = await res.json();
      setRecurringInvoices(data);
    } catch (error) {
      console.error('Failed to fetch recurring invoices', error);
    }
  };

  const fetchInvoices = async () => {
    try {
      const res = await fetch('/api/invoices');
      const data = await res.json();
      setInvoices(data);
      fetchStats();
    } catch (error) {
      console.error('Failed to fetch invoices', error);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats', error);
    }
  };

  const generateQrCode = async (invoice: Invoice) => {
    const upiLink = `upi://pay?pa=${invoice.payeeVpa}&pn=${encodeURIComponent(invoice.payeeName)}&am=${invoice.amount}&cu=${invoice.currency || 'INR'}&tn=${encodeURIComponent(invoice.id)}`;
    try {
      const url = await QRCode.toDataURL(upiLink, {
        width: 600,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      setQrDataUrl(url);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount
        }),
      });
      if (res.ok) {
        // If recurring is checked, also set up a recurring invoice
        if (formData.isRecurring) {
          const client = clients.find(c => c.name === formData.customerName);
          if (client) {
            const nextRun = new Date();
            if (formData.frequency === 'weekly') nextRun.setDate(nextRun.getDate() + 7);
            else nextRun.setMonth(nextRun.getMonth() + 1);

            await fetch('/api/recurring-invoices', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: Math.random().toString(36).substring(2, 10).toUpperCase(),
                clientId: client.id,
                amount,
                payeeName: formData.payeeName,
                payeeVpa: formData.payeeVpa,
                productOrService: formData.productOrService,
                frequency: formData.frequency,
                nextRunDate: nextRun.toISOString(),
                currency: formData.currency
              }),
            });
            fetchRecurringInvoices();
          }
        }

        setShowForm(false);
        setFormData({ 
          id: Math.random().toString(36).substring(2, 10).toUpperCase(), 
          customerName: '', 
          amount: '', 
          payeeName: DEFAULT_PAYEE_NAME, 
          payeeVpa: DEFAULT_PAYEE_VPA,
          productOrService: '',
          isRecurring: false,
          frequency: 'monthly',
          currency: 'INR'
        });
        fetchInvoices();
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to create invoice');
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
    try {
      await fetch(`/api/invoices/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchInvoices();
      if (selectedInvoice?.id === id) {
        setSelectedInvoice({ ...selectedInvoice, status: newStatus as 'paid' | 'unpaid' });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const deleteInvoice = async (id: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (selectedInvoice?.id === id) {
          setSelectedInvoice(null);
        }
        setInvoiceToDelete(null);
        fetchInvoices();
      }
    } catch (error) {
      console.error('Failed to delete invoice', error);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} invoices?`)) return;
    setBulkActionLoading(true);
    try {
      const res = await fetch('/api/invoices/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (res.ok) {
        setSelectedIds([]);
        fetchInvoices();
        if (selectedInvoice && selectedIds.includes(selectedInvoice.id)) {
          setSelectedInvoice(null);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkStatusUpdate = async (status: 'paid' | 'unpaid') => {
    setBulkActionLoading(true);
    try {
      const res = await fetch('/api/invoices/bulk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, status }),
      });
      if (res.ok) {
        setSelectedIds([]);
        fetchInvoices();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const filteredAndSortedInvoices = invoices
    .filter(inv => 
      inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.productOrService && inv.productOrService.toLowerCase().includes(searchQuery.toLowerCase())) ||
      inv.amount.toString().includes(searchQuery)
    )
    .sort((a, b) => {
      if (sortBy === 'id') return a.id.localeCompare(b.id);
      if (sortBy === 'amount') return b.amount - a.amount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: Math.random().toString(36).substring(2, 10).toUpperCase(),
          ...clientFormData
        }),
      });
      if (res.ok) {
        setClientFormData({ name: '', email: '', category: 'General' });
        fetchClients();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const deleteClient = async (id: string) => {
    if (!confirm("Are you sure? This will not delete their invoices.")) return;
    try {
      await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      fetchClients();
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(recurringFormData.amount);
    if (isNaN(amount) || amount <= 0) return;

    const nextRun = new Date();
    if (recurringFormData.frequency === 'weekly') nextRun.setDate(nextRun.getDate() + 7);
    else nextRun.setMonth(nextRun.getMonth() + 1);

    try {
      const res = await fetch('/api/recurring-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: Math.random().toString(36).substring(2, 10).toUpperCase(),
          ...recurringFormData,
          amount,
          payeeName: DEFAULT_PAYEE_NAME,
          payeeVpa: DEFAULT_PAYEE_VPA,
          nextRunDate: nextRun.toISOString()
        }),
      });
      if (res.ok) {
        setRecurringFormData({ clientId: '', amount: '', frequency: 'monthly', productOrService: '', currency: 'INR' });
        fetchRecurringInvoices();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const deleteRecurring = async (id: string) => {
    try {
      await fetch(`/api/recurring-invoices/${id}`, { method: 'DELETE' });
      fetchRecurringInvoices();
    } catch (error) {
      console.error(error);
    }
  };

  const downloadPdf = (invoice: Invoice) => {
    const doc = new jsPDF();
    
    // Header - Brutalist B&W
    doc.setFillColor(0, 0, 0);
    doc.rect(0, 0, 210, 50, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(48);
    doc.setTextColor(255, 255, 255);
    doc.text('INVOICE', 20, 35);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`ID: ${invoice.id.toUpperCase()}`, 190, 25, { align: 'right' });
    doc.text(`DATE: ${new Date(invoice.createdAt).toLocaleDateString().toUpperCase()}`, 190, 35, { align: 'right' });
    
    // Billing Info
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO //', 20, 75);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(24);
    doc.text(invoice.customerName.toUpperCase(), 20, 90);
    
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(10);
    doc.text('FROM //', 120, 75);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(18);
    doc.text(invoice.payeeName.toUpperCase(), 120, 90);
    doc.setFontSize(12);
    doc.setFont('courier', 'bold');
    doc.text(invoice.payeeVpa, 120, 100);
    
    // Table Header
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(2);
    doc.line(20, 120, 190, 120);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('DESCRIPTION', 20, 130);
    doc.text('AMOUNT', 190, 130, { align: 'right' });
    
    doc.line(20, 135, 190, 135);
    
    // Table Content
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text((invoice.productOrService || `Service/Product for ${invoice.customerName}`).toUpperCase(), 20, 155);
    doc.setFontSize(24);
    doc.text(`${invoice.currency || 'INR'} ${invoice.amount.toFixed(2)}`, 190, 155, { align: 'right' });
    
    // Total Section
    doc.setLineWidth(4);
    doc.line(110, 175, 190, 175);
    doc.setFontSize(12);
    doc.setTextColor(150, 150, 150);
    doc.text('TOTAL DUE //', 120, 190);
    doc.setFontSize(32);
    doc.setTextColor(0, 0, 0);
    doc.text(`${invoice.currency || 'INR'} ${invoice.amount.toFixed(2)}`, 190, 210, { align: 'right' });
    
    // QR Code Integration
    if (qrDataUrl) {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1);
      doc.rect(75, 220, 60, 60);
      doc.addImage(qrDataUrl, 'PNG', 80, 225, 50, 50);
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text('SCAN TO PAY // UPI', 105, 285, { align: 'center' });
    }
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(200, 200, 200);
    doc.text(`© 2026 UPISync Protocol. All rights reserved. Generated via AISync.`, 105, 292, { align: 'center' });
    
    doc.save(`Invoice_${invoice.id}.pdf`);
  };

  const exportToCSV = () => {
    const selectedFields = Object.entries(exportFields)
      .filter(([_, enabled]) => enabled)
      .map(([field]) => field);
    
    if (selectedFields.length === 0) return;

    const header = selectedFields.join(',');
    const rows = filteredAndSortedInvoices.map(inv => {
      return selectedFields.map(field => {
        const val = (inv as any)[field];
        return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
      }).join(',');
    });

    const csvContent = [header, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Invoices_Export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowExportModal(false);
  };

  const simulateScan = () => {
    setIsScanned(true);
    setTimeout(() => setIsScanned(false), 3000);
  };

  return (
    <div className="min-h-screen font-sans selection:bg-[var(--text)] selection:text-[var(--bg)]">
      {/* Header */}
      <header className="bg-[var(--bg)] border-b-4 border-[var(--border)] sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[var(--text)] flex items-center justify-center">
              <QrCode className="text-[var(--bg)] w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-[var(--text)] uppercase leading-none">UPISync</h1>
              <p className="label-mono mt-1">Invoicing Protocol v2.1</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowClientsModal(true)}
              className="brutalist-button-outline"
              title="Manage Clients"
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Clients</span>
            </button>
            <button 
              onClick={() => setShowRecurringModal(true)}
              className="brutalist-button-outline"
              title="Recurring Invoices"
            >
              <Repeat className="w-4 h-4" />
              <span className="hidden sm:inline">Recurring</span>
            </button>
            <button 
              onClick={() => setShowDashboard(!showDashboard)}
              className={cn(
                "brutalist-button-outline",
                showDashboard && "bg-[var(--text)] text-[var(--bg)]"
              )}
              title="Dashboard"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
            <button 
              onClick={() => setShowExportModal(true)}
              className="brutalist-button-outline"
              title="Export CSV"
            >
              <FileDown className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button 
              onClick={() => setShowForm(true)}
              className="brutalist-button"
            >
              <Plus className="w-4 h-4" />
              New Invoice
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {showDashboard && stats ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8 mb-12"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-[var(--border)]">
              <div className="p-8 bg-[var(--bg)] border-r border-[var(--border)]">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 bg-[var(--text)] flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-[var(--bg)]" />
                  </div>
                  <h3 className="label-mono">Total Revenue</h3>
                </div>
                <p className="text-4xl font-black text-[var(--text)]">{getCurrencySymbol('INR')}{stats.totalAmount.toLocaleString()}</p>
                <p className="label-mono mt-4">Across {stats.totalCount} Invoices</p>
              </div>
              <div className="p-8 bg-[var(--bg)] border-r border-[var(--border)]">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 bg-[var(--text)] flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-[var(--bg)]" />
                  </div>
                  <h3 className="label-mono">Paid Amount</h3>
                </div>
                <p className="text-4xl font-black text-[var(--text)]">{getCurrencySymbol('INR')}{stats.paidAmount.toLocaleString()}</p>
                <p className="label-mono mt-4 text-green-600">{stats.paidCount} Paid</p>
              </div>
              <div className="p-8 bg-[var(--bg)]">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-10 h-10 bg-[var(--text)] flex items-center justify-center">
                    <Clock className="w-5 h-5 text-[var(--bg)]" />
                  </div>
                  <h3 className="label-mono">Pending Amount</h3>
                </div>
                <p className="text-4xl font-black text-[var(--text)]">{getCurrencySymbol('INR')}{stats.unpaidAmount.toLocaleString()}</p>
                <p className="label-mono mt-4 text-red-600">{stats.unpaidCount} Pending</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="p-8 bg-[var(--bg)] border-4 border-[var(--border)] h-[400px]">
                <h3 className="text-[10px] font-black text-[var(--text)] uppercase tracking-widest border-b-2 border-[var(--border)] pb-4 mb-8">Revenue Distribution</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Paid', amount: stats.paidAmount },
                    { name: 'Unpaid', amount: stats.unpaidAmount }
                  ]}>
                    <CartesianGrid strokeDasharray="0" vertical={false} stroke="#eee" strokeWidth={1} />
                    <XAxis dataKey="name" axisLine={true} tickLine={true} tick={{ fontSize: 10, fontWeight: '900', fill: '#000' }} />
                    <YAxis axisLine={true} tickLine={true} tick={{ fontSize: 10, fontWeight: '900', fill: '#000' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '0', border: `2px solid #000`, boxShadow: 'none', fontWeight: '900', textTransform: 'uppercase', fontSize: '10px', color: '#000' }}
                      itemStyle={{ color: '#000' }}
                      cursor={{ fill: '#f3f4f6' }}
                    />
                    <Bar dataKey="amount">
                      <Cell fill="#000" />
                      <Cell fill="#fff" stroke="#000" strokeWidth={2} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="p-8 bg-[var(--bg)] border-4 border-[var(--border)] h-[400px]">
                <h3 className="text-[10px] font-black text-[var(--text)] uppercase tracking-widest border-b-2 border-[var(--border)] pb-4 mb-8">Invoice Status</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Paid', value: stats.paidCount },
                        { name: 'Unpaid', value: stats.unpaidCount }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={0}
                      dataKey="value"
                      stroke="#000"
                      strokeWidth={2}
                    >
                      <Cell fill="#000" />
                      <Cell fill="#fff" />
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '0', border: `2px solid #000`, boxShadow: 'none', fontWeight: '900', textTransform: 'uppercase', fontSize: '10px', color: '#000' }}
                      itemStyle={{ color: '#000' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar / List */}
        <div className="lg:col-span-4 space-y-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between px-1 border-b-2 border-[var(--border)] pb-2">
              <h2 className="text-[10px] font-black text-[var(--text)] uppercase tracking-widest">Recent Activity</h2>
              <span className="text-[10px] bg-[var(--text)] px-3 py-1 text-[var(--bg)] font-black uppercase">{filteredAndSortedInvoices.length} Total</span>
            </div>

            {/* Search and Sort */}
            <div className="space-y-4">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text)] z-10" />
                <input 
                  type="text"
                  placeholder="Search Registry..."
                  className="brutalist-input pl-12"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-0 border-2 border-[var(--border)]">
                <div className="relative flex-1 border-r-2 border-[var(--border)]">
                  <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text)]" />
                  <select 
                    className="w-full pl-12 pr-4 py-3 bg-[var(--bg)] text-[var(--text)] text-[10px] font-black uppercase tracking-widest appearance-none outline-none cursor-pointer hover:opacity-80"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                  >
                    <option value="date">Sort: Chronological</option>
                    <option value="amount">Sort: Value</option>
                    <option value="id">Sort: Identifier</option>
                  </select>
                </div>
                <div className="px-4 flex items-center bg-[var(--bg)]">
                  <ChevronDown className="w-4 h-4 text-[var(--text)]" />
                </div>
              </div>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          <AnimatePresence>
            {selectedIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="p-6 bg-[var(--text)] border-2 border-[var(--border)] flex items-center justify-between gap-4"
              >
                <span className="text-[10px] font-black text-[var(--bg)] uppercase tracking-widest">
                  {selectedIds.length} Selected
                </span>
                <div className="flex gap-4">
                  <button 
                    onClick={() => handleBulkStatusUpdate('paid')}
                    className="px-4 py-2 bg-[var(--bg)] text-[var(--text)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--muted)]/20 transition-colors"
                  >
                    Mark Paid
                  </button>
                  <button 
                    onClick={handleBulkDelete}
                    className="p-2 bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-320px)] pr-2 custom-scrollbar">
            {filteredAndSortedInvoices.map((inv) => (
              <motion.div
                layoutId={inv.id}
                key={inv.id}
                onClick={() => setSelectedInvoice(inv)}
                className={cn(
                  "p-6 border-4 transition-all cursor-pointer group relative overflow-hidden",
                  selectedInvoice?.id === inv.id 
                    ? "border-[var(--border)] bg-[var(--bg)] opacity-95 translate-x-2 -translate-y-2 shadow-[-8px_8px_0px_0px_var(--border)]" 
                    : "border-[var(--border)] bg-[var(--bg)] hover:opacity-90"
                )}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelection(inv.id);
                      }}
                      className="p-1 hover:bg-[var(--text)] hover:text-[var(--bg)] transition-colors border-2 border-transparent hover:border-[var(--border)]"
                    >
                      {selectedIds.includes(inv.id) ? (
                        <CheckSquare className="w-5 h-5 text-[var(--text)] group-hover:text-inherit" />
                      ) : (
                        <Square className="w-5 h-5 text-[var(--muted)]" />
                      )}
                    </button>
                    <span className="text-[10px] font-black text-[var(--muted)] label-mono uppercase tracking-widest">#{inv.id}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "px-3 py-1 text-[10px] font-black uppercase tracking-widest",
                      inv.status === 'paid' ? "bg-[var(--text)] text-[var(--bg)]" : "bg-[var(--bg)] text-[var(--text)] border-2 border-[var(--border)]"
                    )}>
                      {inv.status}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setInvoiceToDelete(inv);
                      }}
                      className="p-2 hover:bg-red-600 hover:text-white text-[var(--muted)] transition-colors border-2 border-transparent hover:border-[var(--border)]"
                      title="Delete Invoice"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <h3 className="text-2xl font-black text-[var(--text)] uppercase tracking-tighter truncate leading-none mb-4">{inv.customerName}</h3>
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <span className="text-3xl font-black text-[var(--text)] tracking-tighter leading-none block">
                      {getCurrencySymbol(inv.currency || 'INR')}{inv.amount.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest label-mono block mt-2">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <ArrowRight className={cn(
                    "w-6 h-6 text-[var(--muted)] transition-transform group-hover:translate-x-2",
                    selectedInvoice?.id === inv.id && "text-[var(--text)]"
                  )} />
                </div>
              </motion.div>
            ))}
            
            {filteredAndSortedInvoices.length === 0 && (
              <div className="text-center py-24 bg-[var(--bg)] border-4 border-dashed border-[var(--border)]">
                <div className="w-20 h-20 bg-[var(--text)] opacity-5 flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-10 h-10 text-[var(--text)] opacity-20" />
                </div>
                <p className="text-xl font-black text-[var(--text)] opacity-30 uppercase tracking-tighter">No records found in registry</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Content / Details */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {selectedInvoice ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-[var(--bg)] border-4 border-[var(--border)] overflow-hidden"
              >
                <div className="p-10 border-b-4 border-[var(--border)] flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-[var(--bg)]">
                  <div>
                    <div className="flex flex-wrap items-center gap-4 mb-4">
                      <h2 className="text-5xl font-black tracking-tighter text-[var(--text)] uppercase leading-none">Invoice #{selectedInvoice.id}</h2>
                      <button 
                        onClick={() => toggleStatus(selectedInvoice.id, selectedInvoice.status)}
                        className={cn(
                          "px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all border-2 border-[var(--border)]",
                          selectedInvoice.status === 'paid' 
                            ? "bg-[var(--text)] text-[var(--bg)]" 
                            : "bg-[var(--bg)] text-[var(--text)] hover:opacity-80"
                        )}
                      >
                        {selectedInvoice.status === 'paid' ? 'Paid' : 'Unpaid'}
                      </button>
                    </div>
                    <div className="flex items-center gap-6 text-[10px] font-black text-[var(--muted)] uppercase tracking-widest label-mono">
                      <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(selectedInvoice.createdAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {new Date(selectedInvoice.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => downloadPdf(selectedInvoice)}
                      className="p-5 bg-[var(--text)] text-[var(--bg)] hover:opacity-80 transition-all border-2 border-[var(--border)] active:scale-95"
                      title="Download PDF"
                    >
                      <Download className="w-8 h-8" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2">
                  <div className="p-10 space-y-12 border-b-4 md:border-b-0 md:border-r-4 border-[var(--border)]">
                    <section>
                      <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest block mb-6 label-mono">Target Entity</label>
                      <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-[var(--text)] flex items-center justify-center border-4 border-[var(--border)]">
                          <User className="text-[var(--bg)] w-10 h-10" />
                        </div>
                        <div>
                          <p className="text-3xl font-black text-[var(--text)] uppercase tracking-tight leading-none mb-2">{selectedInvoice.customerName}</p>
                          <p className="text-[10px] text-[var(--muted)] font-black uppercase tracking-widest label-mono">Verified Registry Entry</p>
                        </div>
                      </div>
                    </section>

                    <section>
                      <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest block mb-6 label-mono">Transaction Metadata</label>
                      <div className="space-y-6">
                        <div className="flex justify-between items-center border-b-2 border-[var(--border)] opacity-10 pb-4">
                          <span className="text-[10px] text-[var(--muted)] font-black uppercase tracking-widest label-mono">Merchant</span>
                          <span className="text-lg font-black text-[var(--text)] uppercase tracking-tight">{selectedInvoice.payeeName}</span>
                        </div>
                        <div className="flex justify-between items-center border-b-2 border-[var(--border)] opacity-10 pb-4">
                          <span className="text-[10px] text-[var(--muted)] font-black uppercase tracking-widest label-mono">UPI Protocol</span>
                          <span className="text-sm font-black text-[var(--bg)] bg-[var(--text)] px-4 py-1 uppercase tracking-widest">{selectedInvoice.payeeVpa}</span>
                        </div>
                        {selectedInvoice.productOrService && (
                          <div className="flex justify-between items-center border-b-2 border-[var(--border)] opacity-10 pb-4">
                            <span className="text-[10px] text-[var(--muted)] font-black uppercase tracking-widest label-mono">Service Class</span>
                            <span className="text-lg font-black text-[var(--text)] uppercase tracking-tight">{selectedInvoice.productOrService}</span>
                          </div>
                        )}
                      </div>
                    </section>

                    <div className="pt-6">
                      <div className="p-10 bg-[var(--text)] border-4 border-[var(--border)]">
                        <div className="flex justify-between items-center">
                          <span className="text-[var(--bg)] opacity-60 font-black text-[10px] uppercase tracking-widest label-mono">Total Value</span>
                          <span className="text-5xl font-black text-[var(--bg)] tracking-tighter leading-none">
                            {getCurrencySymbol(selectedInvoice.currency || 'INR')}{selectedInvoice.amount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-10 flex flex-col items-center justify-center bg-[var(--bg)] opacity-95 relative">
                    <div className={cn(
                      "bg-[var(--bg)] p-6 border-8 transition-all duration-500 mb-10 relative",
                      isScanned ? "border-green-600 scale-105 shadow-[20px_20px_0px_0px_rgba(22,163,74,0.2)]" : "border-[var(--border)] shadow-[20px_20px_0px_0px_var(--border)]"
                    )}>
                      {qrDataUrl ? (
                        <img src={qrDataUrl} alt="UPI QR" className="w-64 h-64" />
                      ) : (
                        <div className="w-64 h-64 bg-[var(--muted)]/10 animate-pulse" />
                      )}
                      
                      <AnimatePresence>
                        {isScanned && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            className="absolute inset-0 bg-green-600/10 flex items-center justify-center backdrop-blur-[2px]"
                          >
                            <div className="bg-green-600 text-white p-6 border-4 border-[var(--border)] shadow-xl">
                              <Check className="w-12 h-12" />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="flex gap-4 mb-10">
                      <button 
                        onClick={() => generateQrCode(selectedInvoice)}
                        className="flex items-center gap-3 px-6 py-3 bg-[var(--bg)] border-4 border-[var(--border)] text-[10px] font-black uppercase tracking-widest hover:opacity-80 transition-all"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Regenerate
                      </button>
                      <button 
                        onClick={simulateScan}
                        className="flex items-center gap-3 px-6 py-3 bg-[var(--text)] text-[var(--bg)] border-4 border-[var(--border)] text-[10px] font-black uppercase tracking-widest hover:opacity-80 transition-all"
                      >
                        <QrCode className="w-4 h-4" />
                        Simulate Scan
                      </button>
                    </div>

                    <div className="text-center max-w-xs">
                      <p className="text-[10px] font-black text-[var(--text)] uppercase tracking-widest leading-relaxed label-mono">
                        Scan with any UPI application to initiate secure transaction protocol.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-20 bg-[var(--bg)] border-4 border-dashed border-[var(--border)]">
                <div className="w-24 h-24 bg-[var(--text)] opacity-5 flex items-center justify-center mb-8">
                  <FileText className="w-12 h-12 text-[var(--text)] opacity-20" />
                </div>
                <h3 className="text-2xl font-black text-[var(--text)] uppercase tracking-tighter mb-4">Select an Entry</h3>
                <p className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest label-mono max-w-xs mx-auto">
                  Choose a record from the registry to view detailed transaction metadata and protocol status.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>

      {/* GEO Content: How it Works & FAQ */}
      <section className="max-w-7xl mx-auto px-6 py-32 border-t-4 border-[var(--border)]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24">
          <div>
            <h2 className="text-4xl font-black tracking-tighter text-[var(--text)] uppercase mb-12">How it Works</h2>
            <div className="space-y-12">
              <div className="flex gap-8">
                <div className="w-12 h-12 bg-[var(--text)] text-[var(--bg)] flex items-center justify-center font-black shrink-0 border-2 border-[var(--border)]">1</div>
                <div>
                  <h3 className="text-xl font-black text-[var(--text)] uppercase tracking-tight mb-2">Create Invoice</h3>
                  <p className="text-xs text-[var(--muted)] label-mono leading-relaxed">Enter customer details, amount, and your UPI VPA. Our system instantly generates a secure, unique invoice ID.</p>
                </div>
              </div>
              <div className="flex gap-8">
                <div className="w-12 h-12 bg-[var(--text)] text-[var(--bg)] flex items-center justify-center font-black shrink-0 border-2 border-[var(--border)]">2</div>
                <div>
                  <h3 className="text-xl font-black text-[var(--text)] uppercase tracking-tight mb-2">Generate Dynamic QR</h3>
                  <p className="text-xs text-[var(--muted)] label-mono leading-relaxed">A dynamic UPI QR code is created specifically for that invoice. It includes the exact amount and invoice ID for easy reconciliation.</p>
                </div>
              </div>
              <div className="flex gap-8">
                <div className="w-12 h-12 bg-[var(--text)] text-[var(--bg)] flex items-center justify-center font-black shrink-0 border-2 border-[var(--border)]">3</div>
                <div>
                  <h3 className="text-xl font-black text-[var(--text)] uppercase tracking-tight mb-2">Get Paid Instantly</h3>
                  <p className="text-xs text-[var(--muted)] label-mono leading-relaxed">Share the QR or download the professional PDF invoice. Payments go directly to your linked bank account via UPI.</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-black tracking-tighter text-[var(--text)] uppercase mb-8">Key Benefits</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border-4 border-[var(--border)]">
              <div className="p-8 bg-[var(--bg)] border-b-4 sm:border-b-0 sm:border-r-4 border-[var(--border)] hover:opacity-80 transition-colors">
                <ShieldCheck className="w-8 h-8 text-[var(--text)] mb-4" />
                <h4 className="text-xl font-black text-[var(--text)] uppercase tracking-tight mb-2">Zero Commission</h4>
                <p className="text-xs text-[var(--muted)] label-mono leading-relaxed">UPI is free. We don't charge any transaction fees or commissions on your payments.</p>
              </div>
              <div className="p-8 bg-[var(--bg)] border-b-4 sm:border-b-0 border-[var(--border)] hover:opacity-80 transition-colors">
                <Clock className="w-8 h-8 text-[var(--text)] mb-4" />
                <h4 className="text-xl font-black text-[var(--text)] uppercase tracking-tight mb-2">Instant Settlement</h4>
                <p className="text-xs text-[var(--muted)] label-mono leading-relaxed">Money moves directly from the customer's bank to yours. No waiting for settlement cycles.</p>
              </div>
              <div className="p-8 bg-[var(--bg)] border-r-4 border-[var(--border)] hover:opacity-80 transition-colors">
                <FileText className="w-8 h-8 text-[var(--text)] mb-4" />
                <h4 className="text-xl font-black text-[var(--text)] uppercase tracking-tight mb-2">Professional PDF</h4>
                <p className="text-xs text-[var(--muted)] label-mono leading-relaxed">Generate high-quality, minimalist black & white invoices that look professional and are easy to print.</p>
              </div>
              <div className="p-8 bg-[var(--bg)] hover:opacity-80 transition-colors">
                <Search className="w-8 h-8 text-[var(--text)] mb-4" />
                <h4 className="text-xl font-black text-[var(--text)] uppercase tracking-tight mb-2">Easy Tracking</h4>
                <p className="text-xs text-[var(--muted)] label-mono leading-relaxed">Keep track of paid and unpaid invoices with a clean dashboard and powerful search tools.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* GEO Content: Use Cases & FAQ */}
      <section className="max-w-7xl mx-auto px-6 py-32 border-t-4 border-[var(--border)]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24">
          <div>
            <h2 className="text-4xl font-black tracking-tighter text-[var(--text)] uppercase mb-12">Who is it for?</h2>
            <div className="grid grid-cols-1 gap-8">
              <div className="flex items-start gap-8 p-8 bg-[var(--bg)] border-4 border-[var(--border)] hover:opacity-80 transition-colors">
                <div className="w-16 h-16 bg-[var(--text)] flex items-center justify-center shrink-0 border-2 border-[var(--border)]">
                  <User className="w-8 h-8 text-[var(--bg)]" />
                </div>
                <div>
                  <h4 className="text-2xl font-black text-[var(--text)] uppercase tracking-tight mb-2">Freelancers</h4>
                  <p className="text-xs text-[var(--muted)] label-mono leading-relaxed">Perfect for designers, developers, and consultants who need a quick way to bill clients via UPI.</p>
                </div>
              </div>
              <div className="flex items-start gap-8 p-8 bg-[var(--bg)] border-4 border-[var(--border)] hover:opacity-80 transition-colors">
                <div className="w-16 h-16 bg-[var(--text)] flex items-center justify-center shrink-0 border-2 border-[var(--border)]">
                  <QrCode className="w-8 h-8 text-[var(--bg)]" />
                </div>
                <div>
                  <h4 className="text-2xl font-black text-[var(--text)] uppercase tracking-tight mb-2">Small Businesses</h4>
                  <p className="text-xs text-[var(--muted)] label-mono leading-relaxed">Ideal for retail shops, service providers, and local vendors looking to digitize their billing.</p>
                </div>
              </div>
              <div className="flex items-start gap-8 p-8 bg-[var(--bg)] border-4 border-[var(--border)] hover:opacity-80 transition-colors">
                <div className="w-16 h-16 bg-[var(--text)] flex items-center justify-center shrink-0 border-2 border-[var(--border)]">
                  <FileText className="w-8 h-8 text-[var(--bg)]" />
                </div>
                <div>
                  <h4 className="text-2xl font-black text-[var(--text)] uppercase tracking-tight mb-2">Service Providers</h4>
                  <p className="text-xs text-[var(--muted)] label-mono leading-relaxed">Great for tutors, trainers, and repair services who collect payments on-the-go.</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-4xl font-black tracking-tighter text-[var(--text)] uppercase mb-12">Frequently Asked Questions</h2>
            <div className="space-y-8">
              <details className="group border-b-4 border-[var(--border)] pb-6 cursor-pointer">
                <summary className="flex justify-between items-center text-xl font-black text-[var(--text)] uppercase tracking-tight list-none">
                  Is UPISync secure for payments?
                  <ChevronDown className="w-6 h-6 text-[var(--text)] group-open:rotate-180 transition-transform" />
                </summary>
                <p className="text-xs text-[var(--muted)] mt-4 leading-relaxed label-mono">
                  Yes. UPISync only generates the payment instruction (QR code). The actual transaction happens securely within the user's UPI-enabled banking app. We never touch your money.
                </p>
              </details>
              <details className="group border-b-4 border-[var(--border)] pb-6 cursor-pointer">
                <summary className="flex justify-between items-center text-xl font-black text-[var(--text)] uppercase tracking-tight list-none">
                  What UPI apps are supported?
                  <ChevronDown className="w-6 h-6 text-[var(--text)] group-open:rotate-180 transition-transform" />
                </summary>
                <p className="text-xs text-[var(--muted)] mt-4 leading-relaxed label-mono">
                  Our dynamic QR codes follow the standard NPCI UPI specifications, meaning they work with GPay, PhonePe, Paytm, Amazon Pay, and all BHIM-enabled banking apps.
                </p>
              </details>
              <details className="group border-b-4 border-[var(--border)] pb-6 cursor-pointer">
                <summary className="flex justify-between items-center text-xl font-black text-[var(--text)] uppercase tracking-tight list-none">
                  Can I export my billing data?
                  <ChevronDown className="w-6 h-6 text-[var(--text)] group-open:rotate-180 transition-transform" />
                </summary>
                <p className="text-xs text-[var(--muted)] mt-4 leading-relaxed label-mono">
                  Absolutely. You can download individual professional PDF invoices or export your entire billing history as a CSV file for accounting and tax purposes.
                </p>
              </details>
            </div>
          </div>
        </div>
      </section>

      {/* Export Modal */}
      <AnimatePresence>
        {showExportModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowExportModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-[var(--bg)] w-full max-w-lg rounded-none shadow-none border-4 border-[var(--border)] overflow-hidden"
            >
              <div className="p-8 border-b-4 border-[var(--border)] flex justify-between items-center bg-[var(--text)]">
                <div>
                  <h2 className="text-2xl font-black tracking-tighter text-[var(--bg)] uppercase">Export Invoices</h2>
                  <p className="text-[10px] text-[var(--bg)] opacity-60 font-bold uppercase tracking-widest label-mono mt-1">Select fields for CSV</p>
                </div>
                <button onClick={() => setShowExportModal(false)} className="p-2 hover:bg-[var(--bg)] hover:text-[var(--text)] text-[var(--bg)] transition-colors border-2 border-transparent hover:border-[var(--border)]">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="p-8 space-y-8">
                <div className="grid grid-cols-2 gap-4">
                  {Object.keys(exportFields).map((field) => (
                    <button
                      key={field}
                      onClick={() => setExportFields(prev => ({ ...prev, [field]: !(prev as any)[field] }))}
                      className={cn(
                        "flex items-center justify-between p-4 border-2 transition-all",
                        (exportFields as any)[field] 
                          ? "bg-[var(--text)] border-[var(--border)] text-[var(--bg)]" 
                          : "bg-[var(--bg)] border-[var(--border)] text-[var(--text)] hover:opacity-80"
                      )}
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest">{field.replace(/([A-Z])/g, ' $1')}</span>
                      {(exportFields as any)[field] ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                  ))}
                </div>

                <div className="pt-4">
                  <button
                    onClick={exportToCSV}
                    className="w-full py-5 brutalist-button text-xl uppercase tracking-widest bg-[var(--text)] text-[var(--bg)] border-4 border-[var(--border)]"
                  >
                    Download CSV ({filteredAndSortedInvoices.length})
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {invoiceToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInvoiceToDelete(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-[var(--bg)] w-full max-w-md rounded-none shadow-none border-4 border-[var(--border)] overflow-hidden p-12 text-center"
            >
              <div className="w-24 h-24 bg-red-600 flex items-center justify-center mx-auto mb-8 border-4 border-[var(--border)]">
                <AlertTriangle className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-4xl font-black tracking-tighter text-[var(--text)] uppercase mb-4">Terminate?</h2>
              <p className="text-[var(--muted)] label-mono mb-10 leading-relaxed">
                Permanently delete invoice <span className="text-[var(--text)] font-black">#{invoiceToDelete.id}</span> for <span className="text-[var(--text)] font-black">{invoiceToDelete.customerName}</span>.
              </p>
              
              <div className="p-8 bg-[var(--bg)] opacity-80 border-2 border-[var(--border)] mb-10 flex justify-between items-center text-left">
                <div>
                  <p className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest label-mono">Amount</p>
                  <p className="text-2xl font-black text-[var(--text)] tracking-tighter">{getCurrencySymbol(invoiceToDelete.currency || 'INR')}{invoiceToDelete.amount.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest label-mono">Status</p>
                  <p className="text-sm font-black text-[var(--text)] uppercase tracking-widest">{invoiceToDelete.status}</p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <button
                  onClick={() => deleteInvoice(invoiceToDelete.id)}
                  className="w-full py-5 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest transition-all border-2 border-[var(--border)]"
                >
                  Confirm Deletion
                </button>
                <button
                  onClick={() => setInvoiceToDelete(null)}
                  className="w-full py-5 bg-[var(--bg)] hover:opacity-80 text-[var(--text)] font-black uppercase tracking-widest transition-all border-2 border-[var(--border)]"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-[var(--bg)] w-full max-w-lg rounded-none shadow-none border-4 border-[var(--border)] overflow-hidden"
            >
              <div className="p-8 border-b-4 border-[var(--border)] flex justify-between items-center bg-[var(--text)]">
                <h2 className="text-2xl font-black text-[var(--bg)] uppercase tracking-tighter">Create Invoice</h2>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-[var(--bg)] hover:text-[var(--text)] text-[var(--bg)] transition-colors border-2 border-transparent hover:border-[var(--border)]">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleCreateInvoice} className="p-8 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest label-mono">Select Client (Optional)</label>
                  <select 
                    className="w-full p-4 bg-[var(--bg)] border-2 border-[var(--border)] rounded-none outline-none focus:opacity-80 transition-all text-sm font-black uppercase tracking-tight text-[var(--text)]"
                    onChange={(e) => {
                      const client = clients.find(c => c.id === e.target.value);
                      if (client) {
                        setFormData({ ...formData, customerName: client.name });
                      }
                    }}
                  >
                    <option value="">-- Select a saved client --</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name} ({client.category})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="space-y-3 relative">
                    <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest label-mono">Invoice ID</label>
                    <div className="relative">
                      <input
                        required
                        type="text"
                        placeholder="INV-001"
                        className="w-full p-4 bg-[var(--bg)] border-2 border-[var(--border)] rounded-none outline-none focus:opacity-80 transition-all text-sm font-black uppercase tracking-tight pr-12 text-[var(--text)]"
                        value={formData.id}
                        onChange={e => setFormData({ ...formData, id: e.target.value })}
                      />
                      <button 
                        type="button"
                        onClick={regenerateId}
                        className="absolute right-0 top-0 h-full px-3 hover:bg-[var(--text)] hover:text-[var(--bg)] transition-all border-l-2 border-[var(--border)] text-[var(--text)]"
                        title="Regenerate ID"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest label-mono">Currency</label>
                    <select 
                      className="w-full p-4 bg-[var(--bg)] border-2 border-[var(--border)] rounded-none outline-none focus:opacity-80 transition-all text-sm font-black uppercase tracking-tight text-[var(--text)]"
                      value={formData.currency}
                      onChange={e => setFormData({ ...formData, currency: e.target.value })}
                    >
                      {CURRENCIES.map(c => (
                        <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest label-mono">Amount</label>
                    <input
                      required
                      type="number"
                      placeholder="0.00"
                      className="w-full p-4 bg-[var(--bg)] border-2 border-[var(--border)] rounded-none outline-none focus:opacity-80 transition-all text-sm font-black uppercase tracking-tight text-[var(--text)]"
                      value={formData.amount}
                      onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest label-mono">Customer Name</label>
                  <input
                    required
                    type="text"
                    placeholder="Enter customer name"
                    className="w-full p-4 bg-[var(--bg)] border-2 border-[var(--border)] rounded-none outline-none focus:opacity-80 transition-all text-sm font-black uppercase tracking-tight text-[var(--text)]"
                    value={formData.customerName}
                    onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest label-mono">Product or Service</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Web Development, Consulting"
                    className="w-full p-4 bg-[var(--bg)] border-2 border-[var(--border)] rounded-none outline-none focus:opacity-80 transition-all text-sm font-black uppercase tracking-tight text-[var(--text)]"
                    value={formData.productOrService}
                    onChange={e => setFormData({ ...formData, productOrService: e.target.value })}
                  />
                </div>

                <div className="p-6 bg-[var(--bg)] border-2 border-[var(--border)]">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <Repeat className="w-5 h-5 text-[var(--text)]" />
                      <span className="text-sm font-black uppercase tracking-tight text-[var(--text)]">Make Recurring</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={formData.isRecurring}
                        onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                      />
                      <div className="w-14 h-7 bg-[var(--muted)] opacity-20 peer-focus:outline-none rounded-none peer peer-checked:after:translate-x-full peer-checked:after:border-[var(--border)] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--bg)] after:border-[var(--border)] after:border after:rounded-none after:h-6 after:w-6 after:transition-all peer-checked:bg-[var(--text)] peer-checked:opacity-100"></div>
                    </label>
                  </div>
                  
                  {formData.isRecurring && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-4"
                    >
                      <label className="label-mono text-[10px] text-[var(--muted)]">Frequency</label>
                      <div className="flex gap-0 border-2 border-[var(--border)]">
                        {['weekly', 'monthly'].map((freq) => (
                          <button
                            key={freq}
                            type="button"
                            onClick={() => setFormData({ ...formData, frequency: freq as any })}
                            className={cn(
                              "flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all",
                              formData.frequency === freq 
                                ? "bg-[var(--text)] text-[var(--bg)]" 
                                : "bg-[var(--bg)] text-[var(--text)] hover:opacity-80"
                            )}
                          >
                            {freq}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest label-mono">Payee Name</label>
                  <input
                    required
                    type="text"
                    placeholder="Merchant name"
                    className="w-full p-4 bg-[var(--bg)] border-2 border-[var(--border)] rounded-none outline-none focus:opacity-80 transition-all text-sm font-black uppercase tracking-tight text-[var(--text)]"
                    value={formData.payeeName}
                    onChange={e => setFormData({ ...formData, payeeName: e.target.value })}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest label-mono">UPI VPA</label>
                  <input
                    required
                    type="text"
                    placeholder="upi-id@bank"
                    className="w-full p-4 bg-[var(--bg)] border-2 border-[var(--border)] rounded-none outline-none focus:opacity-80 transition-all text-sm font-black uppercase tracking-tight font-mono text-[var(--text)]"
                    value={formData.payeeVpa}
                    onChange={e => setFormData({ ...formData, payeeVpa: e.target.value })}
                  />
                </div>

                <div className="pt-6">
                  <button
                    disabled={loading}
                    type="submit"
                    className="w-full py-5 bg-[var(--text)] text-[var(--bg)] text-xl font-black uppercase tracking-widest border-4 border-[var(--border)] hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Create Invoice'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="max-w-7xl mx-auto px-6 py-20 border-t-4 border-[var(--border)] mt-32">
        <div className="flex flex-col md:flex-row justify-between items-center gap-16">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[var(--text)] flex items-center justify-center border-2 border-[var(--border)]">
              <QrCode className="w-6 h-6 text-[var(--bg)]" />
            </div>
            <span className="font-black uppercase tracking-tighter text-3xl text-[var(--text)]">UPISync</span>
          </div>
          <div className="flex flex-wrap justify-center gap-12 text-[10px] font-black uppercase tracking-widest label-mono text-[var(--text)]">
            <a href="#" className="hover:bg-[var(--text)] hover:text-[var(--bg)] px-2 py-1 transition-colors">Documentation</a>
            <a href="#" className="hover:bg-[var(--text)] hover:text-[var(--bg)] px-2 py-1 transition-colors">Privacy</a>
            <a href="#" className="hover:bg-[var(--text)] hover:text-[var(--bg)] px-2 py-1 transition-colors">Status</a>
          </div>
          <p className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest label-mono">© 2026 UPISync Protocol. All rights reserved.</p>
        </div>
      </footer>
      {/* Clients Management Modal */}
      <AnimatePresence>
        {showClientsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowClientsModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-3xl bg-[var(--bg)] rounded-none shadow-none border-4 border-[var(--border)] overflow-hidden"
            >
              <div className="p-8 border-b-4 border-[var(--border)] flex justify-between items-center bg-[var(--text)]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[var(--bg)] flex items-center justify-center border-2 border-[var(--border)]">
                    <Users className="w-6 h-6 text-[var(--text)]" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-[var(--bg)] uppercase tracking-tighter">Client Registry</h2>
                    <p className="text-[10px] text-[var(--muted)] label-mono uppercase tracking-widest">Database of active entities</p>
                  </div>
                </div>
                <button onClick={() => setShowClientsModal(false)} className="p-2 hover:bg-[var(--bg)] hover:text-[var(--text)] text-[var(--bg)] transition-colors border-2 border-transparent hover:border-[var(--border)]">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
                <form onSubmit={handleCreateClient} className="mb-12 p-8 bg-[var(--card-bg)] border-2 border-[var(--border)]">
                  <h3 className="text-sm font-black uppercase tracking-widest border-b-2 border-[var(--border)] pb-4 mb-8 text-[var(--text)]">Register New Client</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest label-mono">Full Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Acme Corp" 
                        className="w-full p-4 bg-[var(--bg)] border-2 border-[var(--border)] rounded-none outline-none focus:bg-[var(--muted)]/5 transition-all text-sm font-black uppercase tracking-tight text-[var(--text)] placeholder:text-[var(--muted)]/50"
                        value={clientFormData.name}
                        onChange={e => setClientFormData({...clientFormData, name: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest label-mono">Email Address</label>
                      <input 
                        type="email" 
                        placeholder="contact@acme.com" 
                        className="w-full p-4 bg-[var(--bg)] border-2 border-[var(--border)] rounded-none outline-none focus:bg-[var(--muted)]/5 transition-all text-sm font-black uppercase tracking-tight text-[var(--text)] placeholder:text-[var(--muted)]/50"
                        value={clientFormData.email}
                        onChange={e => setClientFormData({...clientFormData, email: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest label-mono">Category</label>
                      <select 
                        className="w-full p-4 bg-[var(--bg)] border-2 border-[var(--border)] rounded-none outline-none focus:bg-[var(--muted)]/5 transition-all text-sm font-black uppercase tracking-tight text-[var(--text)]"
                        value={clientFormData.category}
                        onChange={e => setClientFormData({...clientFormData, category: e.target.value})}
                      >
                        <option value="General">General</option>
                        <option value="VIP">VIP</option>
                        <option value="Corporate">Corporate</option>
                        <option value="Subscription">Subscription</option>
                      </select>
                    </div>
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-5 bg-[var(--text)] text-[var(--bg)] text-xl font-black uppercase tracking-widest border-4 border-[var(--border)] hover:opacity-90 transition-all active:scale-95"
                  >
                    Add to Registry
                  </button>
                </form>

                <div className="space-y-8">
                  <h3 className="text-sm font-black uppercase tracking-widest border-b-2 border-[var(--border)] pb-4 text-[var(--text)]">Active Clients</h3>
                  <div className="grid gap-6">
                    {clients.length === 0 ? (
                      <div className="py-20 text-center border-4 border-dashed border-[var(--border)]">
                        <Users className="w-16 h-16 text-[var(--muted)]/20 mx-auto mb-6" />
                        <p className="text-lg font-black uppercase text-[var(--muted)]/40 tracking-tighter">No clients registered</p>
                      </div>
                    ) : (
                      <div className="border-2 border-[var(--border)] divide-y-2 divide-[var(--border)]">
                        {clients.map(client => (
                          <div key={client.id} className="flex items-center justify-between p-8 bg-[var(--card-bg)] hover:bg-[var(--muted)]/5 transition-all group">
                            <div className="flex items-center gap-8">
                              <div className="w-16 h-16 bg-[var(--text)] flex items-center justify-center font-black text-[var(--bg)] text-2xl border-2 border-[var(--border)]">
                                {client.name.charAt(0)}
                              </div>
                              <div>
                                <h4 className="text-2xl font-black text-[var(--text)] uppercase tracking-tight leading-none">{client.name}</h4>
                                <p className="label-mono text-[var(--muted)] mt-2">{client.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-8">
                              <span className="px-3 py-1 bg-[var(--text)] text-[var(--bg)] text-[10px] font-black uppercase tracking-widest">
                                {client.category}
                              </span>
                              <button 
                                onClick={() => deleteClient(client.id)}
                                className="p-4 hover:bg-[var(--text)] hover:text-[var(--bg)] border-2 border-transparent hover:border-[var(--border)] transition-all text-red-600"
                                title="Remove Client"
                              >
                                <Trash2 className="w-6 h-6" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Recurring Invoices Modal */}
      <AnimatePresence>
        {showRecurringModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRecurringModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-3xl bg-[var(--bg)] rounded-none shadow-none border-4 border-[var(--border)] overflow-hidden"
            >
              <div className="p-8 border-b-4 border-[var(--border)] flex justify-between items-center bg-[var(--text)]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[var(--bg)] flex items-center justify-center border-2 border-[var(--border)]">
                    <Repeat className="w-6 h-6 text-[var(--text)]" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-[var(--bg)] uppercase tracking-tighter">Recurring Protocol</h2>
                    <p className="text-[10px] text-[var(--muted)] label-mono uppercase tracking-widest">Automated billing schedules</p>
                  </div>
                </div>
                <button onClick={() => setShowRecurringModal(false)} className="p-2 hover:bg-[var(--bg)] hover:text-[var(--text)] text-[var(--bg)] transition-colors border-2 border-transparent hover:border-[var(--border)]">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 max-h-[75vh] overflow-y-auto custom-scrollbar">
                <form onSubmit={handleCreateRecurring} className="mb-12 p-8 bg-[var(--card-bg)] border-2 border-[var(--border)]">
                  <h3 className="text-sm font-black uppercase tracking-widest border-b-2 border-[var(--border)] pb-4 mb-8 text-[var(--text)]">Establish Recurring Protocol</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest label-mono">Target Client</label>
                      <select 
                        className="w-full p-4 bg-[var(--bg)] border-2 border-[var(--border)] rounded-none outline-none focus:bg-[var(--muted)]/5 transition-all text-sm font-black uppercase tracking-tight text-[var(--text)]"
                        value={recurringFormData.clientId}
                        onChange={e => setRecurringFormData({...recurringFormData, clientId: e.target.value})}
                        required
                      >
                        <option value="">Select Client</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest label-mono">Service Description</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Monthly Retainer" 
                        className="w-full p-4 bg-[var(--bg)] border-2 border-[var(--border)] rounded-none outline-none focus:bg-[var(--muted)]/5 transition-all text-sm font-black uppercase tracking-tight text-[var(--text)] placeholder:text-[var(--muted)]/50"
                        value={recurringFormData.productOrService}
                        onChange={e => setRecurringFormData({...recurringFormData, productOrService: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest label-mono">Currency</label>
                      <select 
                        className="w-full p-4 bg-[var(--bg)] border-2 border-[var(--border)] rounded-none outline-none focus:bg-[var(--muted)]/5 transition-all text-sm font-black uppercase tracking-tight text-[var(--text)]"
                        value={recurringFormData.currency}
                        onChange={e => setRecurringFormData({...recurringFormData, currency: e.target.value})}
                        required
                      >
                        {CURRENCIES.map(c => (
                          <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest label-mono">Amount Per Cycle</label>
                      <input 
                        type="number" 
                        placeholder="0.00" 
                        className="w-full p-4 bg-[var(--bg)] border-2 border-[var(--border)] rounded-none outline-none focus:bg-[var(--muted)]/5 transition-all text-sm font-black uppercase tracking-tight text-[var(--text)] placeholder:text-[var(--muted)]/50"
                        value={recurringFormData.amount}
                        onChange={e => setRecurringFormData({...recurringFormData, amount: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="label-mono text-[10px] text-[var(--muted)]">Cycle Frequency</label>
                      <div className="flex gap-0 border-2 border-[var(--border)]">
                        {['weekly', 'monthly'].map((freq) => (
                          <button
                            key={freq}
                            type="button"
                            onClick={() => setRecurringFormData({ ...recurringFormData, frequency: freq as any })}
                            className={cn(
                              "flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all",
                              recurringInvoices.find(ri => ri.frequency === freq) || recurringFormData.frequency === freq
                                ? "bg-[var(--text)] text-[var(--bg)]" 
                                : "bg-[var(--bg)] text-[var(--text)] hover:bg-[var(--muted)]/5"
                            )}
                          >
                            {freq}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button 
                    type="submit"
                    className="w-full py-5 bg-[var(--text)] text-[var(--bg)] text-xl font-black uppercase tracking-widest border-4 border-[var(--border)] hover:opacity-90 transition-all active:scale-95"
                  >
                    Activate Protocol
                  </button>
                </form>

                <div className="space-y-8">
                  <h3 className="text-sm font-black uppercase tracking-widest border-b-2 border-[var(--border)] pb-4 text-[var(--text)]">Active Protocols</h3>
                  <div className="grid gap-6">
                    {recurringInvoices.length === 0 ? (
                      <div className="py-20 text-center border-4 border-dashed border-[var(--border)]">
                        <Repeat className="w-16 h-16 text-[var(--muted)]/20 mx-auto mb-6" />
                        <p className="text-lg font-black uppercase text-[var(--muted)]/40 tracking-tighter">No active protocols detected</p>
                      </div>
                    ) : (
                      <div className="border-2 border-[var(--border)] divide-y-2 divide-[var(--border)]">
                        {recurringInvoices.map((ri) => (
                          <div key={ri.id} className="p-8 bg-[var(--card-bg)] hover:bg-[var(--muted)]/5 transition-all group relative">
                            <div className="flex justify-between items-start mb-6">
                              <div className="space-y-2">
                                <h4 className="text-2xl font-black text-[var(--text)] uppercase tracking-tight leading-none">{ri.customerName}</h4>
                                <p className="label-mono text-[var(--muted)]">{ri.productOrService}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-3xl font-black text-[var(--text)] tracking-tighter">
                                  {getCurrencySymbol(ri.currency || 'INR')}{ri.amount.toFixed(2)}
                                </p>
                                <span className="px-3 py-1 bg-[var(--text)] text-[var(--bg)] text-[10px] font-black uppercase tracking-widest inline-block mt-2">
                                  {ri.frequency}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-6 border-t-2 border-[var(--border)]">
                              <div className="flex items-center gap-3 label-mono text-[var(--muted)]">
                                <Calendar className="w-4 h-4" />
                                <span>Next: {new Date(ri.nextRunDate).toLocaleDateString()}</span>
                              </div>
                              <button 
                                onClick={() => deleteRecurring(ri.id)}
                                className="label-mono text-red-600 hover:bg-[var(--text)] hover:text-[var(--bg)] px-6 py-2 border-2 border-transparent hover:border-[var(--border)] transition-all font-black uppercase"
                              >
                                Terminate Schedule
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
