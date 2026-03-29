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
  PieChart as PieChartIcon
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

interface Invoice {
  id: string;
  customerName: string;
  amount: number;
  payeeName: string;
  payeeVpa: string;
  status: 'paid' | 'unpaid';
  createdAt: string;
  productOrService?: string;
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

export default function App() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showDashboard, setShowDashboard] = useState(false);
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

  // Form state
  const [formData, setFormData] = useState({
    id: Math.random().toString(36).substring(2, 10).toUpperCase(),
    customerName: '',
    amount: '',
    payeeName: DEFAULT_PAYEE_NAME,
    payeeVpa: DEFAULT_PAYEE_VPA,
    productOrService: ''
  });

  const regenerateId = () => {
    setFormData(prev => ({
      ...prev,
      id: Math.random().toString(36).substring(2, 10).toUpperCase()
    }));
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    if (selectedInvoice) {
      generateQrCode(selectedInvoice);
    }
  }, [selectedInvoice]);

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
    const upiLink = `upi://pay?pa=${invoice.payeeVpa}&pn=${encodeURIComponent(invoice.payeeName)}&am=${invoice.amount}&cu=INR&tn=${encodeURIComponent(invoice.id)}`;
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
        setShowForm(false);
        setFormData({ 
          id: Math.random().toString(36).substring(2, 10).toUpperCase(), 
          customerName: '', 
          amount: '', 
          payeeName: DEFAULT_PAYEE_NAME, 
          payeeVpa: DEFAULT_PAYEE_VPA,
          productOrService: ''
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

  const downloadPdf = (invoice: Invoice) => {
    const doc = new jsPDF();
    
    // Header - Ultra Modern B&W
    doc.setFillColor(0, 0, 0);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(32);
    doc.setTextColor(255, 255, 255);
    doc.text('INVOICE', 20, 28);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 200, 200);
    doc.text(`ID: ${invoice.id}`, 140, 20);
    doc.text(`DATE: ${new Date(invoice.createdAt).toLocaleDateString()}`, 140, 26);
    
    // Billing Info
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('BILL TO', 20, 60);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.text(invoice.customerName.toUpperCase(), 20, 70);
    
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(9);
    doc.text('FROM', 120, 60);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(invoice.payeeName, 120, 70);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.payeeVpa, 120, 76);
    
    // Table Header
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(20, 95, 190, 95);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('DESCRIPTION', 20, 105);
    doc.text('AMOUNT', 160, 105, { align: 'right' });
    
    doc.line(20, 110, 190, 110);
    
    // Table Content
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.productOrService || `Service/Product for ${invoice.customerName}`, 20, 125);
    doc.setFont('helvetica', 'bold');
    doc.text(`INR ${invoice.amount.toFixed(2)}`, 160, 125, { align: 'right' });
    
    // Total Section
    doc.setFillColor(245, 245, 245);
    doc.rect(110, 140, 80, 25, 'F');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('TOTAL DUE', 120, 155);
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(`INR ${invoice.amount.toFixed(2)}`, 185, 155, { align: 'right' });
    
    // QR Code Integration
    if (qrDataUrl) {
      doc.setDrawColor(230, 230, 230);
      doc.rect(75, 180, 60, 75);
      doc.addImage(qrDataUrl, 'PNG', 80, 185, 50, 50);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('SCAN TO PAY VIA UPI', 105, 245, { align: 'center' });
    }
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text(`© 2026 UPISync. All rights reserved.`, 105, 285, { align: 'center' });
    
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
    <div className="min-h-screen bg-[#FAFAFA] text-[#000000] font-sans selection:bg-gray-200">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-xl shadow-gray-200">
              <QrCode className="text-white w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black tracking-tighter text-black uppercase">UPISync</h1>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowDashboard(!showDashboard)}
              className={cn(
                "p-3 rounded-xl transition-all border shadow-sm hover:shadow-md active:scale-95 flex items-center gap-2",
                showDashboard ? "bg-black text-white border-black" : "bg-white text-black border-gray-100 hover:bg-gray-50"
              )}
              title="Dashboard"
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Dashboard</span>
            </button>
            <button 
              onClick={() => setShowExportModal(true)}
              className="p-3 bg-white hover:bg-gray-50 rounded-xl text-black transition-all border border-gray-100 shadow-sm hover:shadow-md active:scale-95 flex items-center gap-2"
              title="Export CSV"
            >
              <FileDown className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Export</span>
            </button>
            <button 
              onClick={() => setShowForm(true)}
              className="modern-button shadow-xl shadow-gray-100"
            >
              <Plus className="w-5 h-5" />
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="modern-card p-6 bg-white">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-black" />
                  </div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Revenue</h3>
                </div>
                <p className="text-3xl font-black text-black">₹{stats.totalAmount.toLocaleString()}</p>
                <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-tighter">Across {stats.totalCount} Invoices</p>
              </div>
              <div className="modern-card p-6 bg-white">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Paid Amount</h3>
                </div>
                <p className="text-3xl font-black text-black">₹{stats.paidAmount.toLocaleString()}</p>
                <p className="text-[10px] font-bold text-green-600 mt-2 uppercase tracking-tighter">{stats.paidCount} Paid</p>
              </div>
              <div className="modern-card p-6 bg-white">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                    <Clock className="w-5 h-5 text-red-600" />
                  </div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pending Amount</h3>
                </div>
                <p className="text-3xl font-black text-black">₹{stats.unpaidAmount.toLocaleString()}</p>
                <p className="text-[10px] font-bold text-red-600 mt-2 uppercase tracking-tighter">{stats.unpaidCount} Pending</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="modern-card p-8 bg-white h-[400px]">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-8">Revenue Distribution</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Paid', amount: stats.paidAmount },
                    { name: 'Unpaid', amount: stats.unpaidAmount }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      cursor={{ fill: '#f9fafb' }}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      <Cell fill="#000000" />
                      <Cell fill="#e5e7eb" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="modern-card p-8 bg-white h-[400px]">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-8">Invoice Status</h3>
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
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#000000" />
                      <Cell fill="#e5e7eb" />
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
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
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Recent Activity</h2>
              <span className="text-xs bg-black px-2 py-0.5 rounded-full text-white font-medium">{filteredAndSortedInvoices.length}</span>
            </div>

            {/* Search and Sort */}
            <div className="space-y-3">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-black transition-colors" />
                <input 
                  type="text"
                  placeholder="Search ID, customer, amount..."
                  className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all text-sm font-medium"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <select 
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-100 rounded-xl text-xs font-bold uppercase tracking-tighter appearance-none focus:ring-2 focus:ring-black outline-none cursor-pointer"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                  >
                    <option value="date">Sort by Date</option>
                    <option value="amount">Sort by Amount</option>
                    <option value="id">Sort by ID</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
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
                className="p-4 bg-black rounded-2xl shadow-xl flex items-center justify-between gap-4"
              >
                <span className="text-[10px] font-black text-white uppercase tracking-widest">
                  {selectedIds.length} Selected
                </span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleBulkStatusUpdate('paid')}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold uppercase rounded-lg transition-colors"
                  >
                    Mark Paid
                  </button>
                  <button 
                    onClick={handleBulkDelete}
                    className="p-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
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
                  "p-5 modern-card cursor-pointer group relative overflow-hidden",
                  selectedInvoice?.id === inv.id 
                    ? "ring-2 ring-black bg-gray-50" 
                    : inv.status === 'paid' ? "bg-green-50/30" : "bg-white"
                )}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelection(inv.id);
                      }}
                      className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      {selectedIds.includes(inv.id) ? (
                        <CheckSquare className="w-4 h-4 text-black" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-300" />
                      )}
                    </button>
                    <span className="text-[10px] font-mono text-gray-400">#{inv.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "modern-badge",
                      inv.status === 'paid' ? "bg-black text-white" : "bg-gray-100 text-gray-600"
                    )}>
                      {inv.status}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setInvoiceToDelete(inv);
                      }}
                      className="p-1.5 hover:bg-red-50 hover:text-red-600 text-gray-300 rounded-lg transition-colors"
                      title="Delete Invoice"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <h3 className="font-bold text-black truncate text-lg">{inv.customerName}</h3>
                <div className="flex justify-between items-end mt-4">
                  <div className="space-y-1">
                    <span className="text-xl font-black text-black block">₹{inv.amount.toLocaleString()}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter block">
                      {new Date(inv.createdAt).toLocaleDateString()} • {new Date(inv.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <ArrowRight className={cn(
                    "w-5 h-5 text-gray-300 transition-transform group-hover:translate-x-1 mb-1",
                    selectedInvoice?.id === inv.id && "text-black"
                  )} />
                </div>
              </motion.div>
            ))}
            
            {filteredAndSortedInvoices.length === 0 && (
              <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl border-dashed">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-6 h-6 text-gray-300" />
                </div>
                <p className="text-sm text-gray-400 font-medium">No invoices found</p>
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
                className="modern-card overflow-hidden"
              >
                <div className="p-8 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h2 className="text-4xl font-black tracking-tighter text-black">Invoice #{selectedInvoice.id}</h2>
                      <button 
                        onClick={() => toggleStatus(selectedInvoice.id, selectedInvoice.status)}
                        className={cn(
                          "modern-badge cursor-pointer transition-all hover:scale-105",
                          selectedInvoice.status === 'paid' 
                            ? "bg-black text-white" 
                            : "bg-gray-200 text-gray-800"
                        )}
                      >
                        {selectedInvoice.status === 'paid' ? 'Paid' : 'Unpaid'}
                      </button>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        {new Date(selectedInvoice.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        {new Date(selectedInvoice.createdAt).toLocaleTimeString(undefined, { timeStyle: 'short' })}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => downloadPdf(selectedInvoice)}
                      className="p-4 bg-white hover:bg-gray-50 rounded-2xl text-black transition-all border border-gray-100 shadow-sm hover:shadow-md active:scale-95"
                      title="Download PDF"
                    >
                      <Download className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2">
                  <div className="p-8 space-y-8 border-b md:border-b-0 md:border-r border-gray-100">
                    <section>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-4">Customer</label>
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100">
                          <User className="text-black w-7 h-7" />
                        </div>
                        <div>
                          <p className="font-black text-xl text-black">{selectedInvoice.customerName}</p>
                          <p className="text-xs text-gray-400 font-bold uppercase tracking-tighter">Verified Client</p>
                        </div>
                      </div>
                    </section>

                    <section>
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-4">Payment Details</label>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-400 font-medium">Merchant</span>
                          <span className="text-sm font-black text-black">{selectedInvoice.payeeName}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-400 font-medium">UPI ID</span>
                          <span className="text-sm font-mono font-bold text-black bg-gray-100 px-3 py-1 rounded-xl">{selectedInvoice.payeeVpa}</span>
                        </div>
                        {selectedInvoice.productOrService && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-400 font-medium">Product/Service</span>
                            <span className="text-sm font-bold text-black">{selectedInvoice.productOrService}</span>
                          </div>
                        )}
                      </div>
                    </section>

                    <div className="pt-4">
                      <div className="p-8 bg-black rounded-3xl shadow-2xl shadow-gray-300">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 font-bold text-xs uppercase tracking-widest">Amount Due</span>
                          <span className="text-4xl font-black text-white tracking-tighter">₹{selectedInvoice.amount.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 flex flex-col items-center justify-center bg-gray-50/50 relative">
                    <div className={cn(
                      "bg-white p-4 rounded-2xl shadow-xl border-4 transition-all duration-500 mb-6 relative",
                      isScanned ? "border-green-500 scale-105" : "border-white"
                    )}>
                      {qrDataUrl ? (
                        <img src={qrDataUrl} alt="UPI QR" className="w-48 h-48" />
                      ) : (
                        <div className="w-48 h-48 bg-gray-100 rounded-xl animate-pulse" />
                      )}
                      
                      <AnimatePresence>
                        {isScanned && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            className="absolute inset-0 bg-green-500/10 flex items-center justify-center rounded-xl backdrop-blur-[2px]"
                          >
                            <div className="bg-green-500 text-white p-3 rounded-full shadow-lg">
                              <Check className="w-8 h-8" />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="flex gap-3 mb-6">
                      <button 
                        onClick={() => generateQrCode(selectedInvoice)}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Regenerate
                      </button>
                      <button 
                        onClick={simulateScan}
                        className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-gray-800 transition-all shadow-sm"
                      >
                        Simulate Scan
                      </button>
                    </div>

                    <div className="text-center space-y-3">
                      <div className="flex items-center justify-center gap-2 text-black">
                        <ShieldCheck className="w-5 h-5" />
                        <span className="text-sm font-black uppercase tracking-tighter">Secure UPI Payment</span>
                      </div>
                      <p className="text-xs text-gray-400 max-w-[200px] leading-relaxed font-medium">
                        Scan with any UPI app like GPay, PhonePe, or Paytm to pay instantly.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-20 bg-white border border-gray-200 rounded-3xl border-dashed">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-6">
                  <Info className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">No Invoice Selected</h3>
                <p className="text-sm text-gray-500 max-w-xs mt-2">
                  Choose an invoice from the list to view full details and generate the payment QR code.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>

      {/* GEO Content: How it Works & FAQ */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-gray-100">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
          <div>
            <h2 className="text-3xl font-black tracking-tighter text-black uppercase mb-8">How it Works</h2>
            <div className="space-y-8">
              <div className="flex gap-6">
                <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-black shrink-0">1</div>
                <div>
                  <h3 className="font-bold text-black mb-1">Create Invoice</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">Enter customer details, amount, and your UPI VPA. Our system instantly generates a secure, unique invoice ID.</p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-black shrink-0">2</div>
                <div>
                  <h3 className="font-bold text-black mb-1">Generate Dynamic QR</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">A dynamic UPI QR code is created specifically for that invoice. It includes the exact amount and invoice ID for easy reconciliation.</p>
                </div>
              </div>
              <div className="flex gap-6">
                <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-black shrink-0">3</div>
                <div>
                  <h3 className="font-bold text-black mb-1">Get Paid Instantly</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">Share the QR or download the professional PDF invoice. Payments go directly to your linked bank account via UPI.</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-black tracking-tighter text-black uppercase mb-8">Key Benefits</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
                <ShieldCheck className="w-6 h-6 text-black mb-3" />
                <h4 className="font-bold text-black mb-1">Zero Commission</h4>
                <p className="text-xs text-gray-500">UPI is free. We don't charge any transaction fees or commissions on your payments.</p>
              </div>
              <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
                <Clock className="w-6 h-6 text-black mb-3" />
                <h4 className="font-bold text-black mb-1">Instant Settlement</h4>
                <p className="text-xs text-gray-500">Money moves directly from the customer's bank to yours. No waiting for settlement cycles.</p>
              </div>
              <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
                <FileText className="w-6 h-6 text-black mb-3" />
                <h4 className="font-bold text-black mb-1">Professional PDF</h4>
                <p className="text-xs text-gray-500">Generate high-quality, minimalist black & white invoices that look professional and are easy to print.</p>
              </div>
              <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
                <Search className="w-6 h-6 text-black mb-3" />
                <h4 className="font-bold text-black mb-1">Easy Tracking</h4>
                <p className="text-xs text-gray-500">Keep track of paid and unpaid invoices with a clean dashboard and powerful search tools.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* GEO Content: Use Cases & FAQ */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-gray-100 bg-gray-50/30">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
          <div>
            <h2 className="text-3xl font-black tracking-tighter text-black uppercase mb-8">Who is it for?</h2>
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-gray-100">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h4 className="font-bold text-black">Freelancers</h4>
                  <p className="text-xs text-gray-500">Perfect for designers, developers, and consultants who need a quick way to bill clients via UPI.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-gray-100">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
                  <QrCode className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h4 className="font-bold text-black">Small Businesses</h4>
                  <p className="text-xs text-gray-500">Ideal for retail shops, service providers, and local vendors looking to digitize their billing.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-white rounded-2xl border border-gray-100">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h4 className="font-bold text-black">Service Providers</h4>
                  <p className="text-xs text-gray-500">Great for tutors, trainers, and repair services who collect payments on-the-go.</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-black tracking-tighter text-black uppercase mb-8">Frequently Asked Questions</h2>
            <div className="space-y-6">
              <details className="group border-b border-gray-100 pb-4 cursor-pointer">
                <summary className="flex justify-between items-center font-bold text-black list-none">
                  Is UPISync secure for payments?
                  <ChevronDown className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" />
                </summary>
                <p className="text-sm text-gray-500 mt-3 leading-relaxed">
                  Yes. UPISync only generates the payment instruction (QR code). The actual transaction happens securely within the user's UPI-enabled banking app. We never touch your money.
                </p>
              </details>
              <details className="group border-b border-gray-100 pb-4 cursor-pointer">
                <summary className="flex justify-between items-center font-bold text-black list-none">
                  What UPI apps are supported?
                  <ChevronDown className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" />
                </summary>
                <p className="text-sm text-gray-500 mt-3 leading-relaxed">
                  Our dynamic QR codes follow the standard NPCI UPI specifications, meaning they work with GPay, PhonePe, Paytm, Amazon Pay, and all BHIM-enabled banking apps.
                </p>
              </details>
              <details className="group border-b border-gray-100 pb-4 cursor-pointer">
                <summary className="flex justify-between items-center font-bold text-black list-none">
                  Can I export my billing data?
                  <ChevronDown className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform" />
                </summary>
                <p className="text-sm text-gray-500 mt-3 leading-relaxed">
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
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100"
            >
              <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black tracking-tighter text-black">Export Invoices</h2>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Select fields for CSV</p>
                </div>
                <button onClick={() => setShowExportModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  {Object.keys(exportFields).map((field) => (
                    <button
                      key={field}
                      onClick={() => setExportFields(prev => ({ ...prev, [field]: !(prev as any)[field] }))}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-2xl border transition-all",
                        (exportFields as any)[field] 
                          ? "bg-black border-black text-white" 
                          : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                      )}
                    >
                      <span className="text-xs font-bold uppercase tracking-widest">{field.replace(/([A-Z])/g, ' $1')}</span>
                      {(exportFields as any)[field] ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                  ))}
                </div>

                <div className="pt-4">
                  <button
                    onClick={exportToCSV}
                    className="w-full py-4 bg-black hover:bg-gray-800 text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-gray-200 flex items-center justify-center gap-3"
                  >
                    <FileDown className="w-5 h-5" />
                    Download CSV ({filteredAndSortedInvoices.length} items)
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
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden p-10 text-center"
            >
              <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-8">
                <AlertTriangle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-3xl font-black tracking-tighter text-black mb-4">Delete Invoice?</h2>
              <p className="text-gray-500 font-medium mb-8 leading-relaxed">
                You are about to permanently delete invoice <span className="text-black font-bold">#{invoiceToDelete.id}</span> for <span className="text-black font-bold">{invoiceToDelete.customerName}</span>. This action cannot be undone.
              </p>
              
              <div className="p-6 bg-gray-50 rounded-3xl mb-8 flex justify-between items-center">
                <div className="text-left">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Amount</p>
                  <p className="text-xl font-black text-black">₹{invoiceToDelete.amount.toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</p>
                  <p className="text-sm font-bold text-black uppercase">{invoiceToDelete.status}</p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => deleteInvoice(invoiceToDelete.id)}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-red-100"
                >
                  Confirm Delete
                </button>
                <button
                  onClick={() => setInvoiceToDelete(null)}
                  className="w-full py-4 bg-white hover:bg-gray-50 text-gray-400 font-black uppercase tracking-widest rounded-2xl transition-all"
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
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Create Invoice</h2>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleCreateInvoice} className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5 relative">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Invoice ID</label>
                    <div className="relative">
                      <input
                        required
                        type="text"
                        placeholder="INV-001"
                        className="modern-input pr-10"
                        value={formData.id}
                        onChange={e => setFormData({ ...formData, id: e.target.value })}
                      />
                      <button 
                        type="button"
                        onClick={regenerateId}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-black transition-all"
                        title="Regenerate ID"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Amount (INR)</label>
                    <input
                      required
                      type="number"
                      placeholder="0.00"
                      className="modern-input"
                      value={formData.amount}
                      onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Customer Name</label>
                  <input
                    required
                    type="text"
                    placeholder="Enter customer name"
                    className="modern-input"
                    value={formData.customerName}
                    onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Product or Service</label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Web Development, Consulting"
                    className="modern-input"
                    value={formData.productOrService}
                    onChange={e => setFormData({ ...formData, productOrService: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Payee Name</label>
                  <input
                    required
                    type="text"
                    placeholder="Merchant name"
                    className="modern-input"
                    value={formData.payeeName}
                    onChange={e => setFormData({ ...formData, payeeName: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">UPI VPA</label>
                  <input
                    required
                    type="text"
                    placeholder="upi-id@bank"
                    className="modern-input font-mono text-sm"
                    value={formData.payeeVpa}
                    onChange={e => setFormData({ ...formData, payeeVpa: e.target.value })}
                  />
                </div>

                <div className="pt-4">
                  <button
                    disabled={loading}
                    type="submit"
                    className="w-full py-4 modern-button shadow-2xl shadow-gray-200 text-lg uppercase tracking-widest"
                  >
                    {loading ? 'Processing...' : 'Create Invoice'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-12 border-t border-gray-200 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 opacity-40">
            <QrCode className="w-5 h-5" />
            <span className="font-bold tracking-tight">UPISync</span>
          </div>
          <div className="flex gap-10 text-xs text-gray-400 font-bold uppercase tracking-widest">
            <a href="#" className="hover:text-black transition-colors">Documentation</a>
            <a href="#" className="hover:text-black transition-colors">Privacy</a>
            <a href="#" className="hover:text-black transition-colors">Status</a>
          </div>
          <p className="text-xs text-gray-400 font-medium">© 2026 UPISync. Built for speed.</p>
        </div>
      </footer>
    </div>
  );
}
