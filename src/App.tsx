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
  AlertTriangle
} from 'lucide-react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

interface Invoice {
  id: string;
  customerName: string;
  amount: number;
  payeeName: string;
  payeeVpa: string;
  status: 'paid' | 'unpaid';
  createdAt: string;
}

const DEFAULT_PAYEE_NAME = "Ruthwik Reddy";
const DEFAULT_PAYEE_VPA = "7842906633@ybl";

export default function App() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  
  // New States
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'id' | 'amount' | 'date'>('date');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    id: '',
    customerName: '',
    amount: '',
    payeeName: DEFAULT_PAYEE_NAME,
    payeeVpa: DEFAULT_PAYEE_VPA
  });

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
    } catch (error) {
      console.error('Failed to fetch invoices', error);
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
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount)
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setFormData({ 
          id: '', 
          customerName: '', 
          amount: '', 
          payeeName: DEFAULT_PAYEE_NAME, 
          payeeVpa: DEFAULT_PAYEE_VPA 
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
      inv.amount.toString().includes(searchQuery)
    )
    .sort((a, b) => {
      if (sortBy === 'id') return a.id.localeCompare(b.id);
      if (sortBy === 'amount') return b.amount - a.amount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const downloadPdf = (invoice: Invoice) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(31, 41, 55);
    doc.text('Invoice', 20, 30);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(`Invoice ID: ${invoice.id}`, 20, 40);
    doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, 20, 45);
    
    doc.setDrawColor(229, 231, 235);
    doc.line(20, 55, 190, 55);
    
    // Details
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text('BILL TO', 20, 70);
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.text(invoice.customerName, 20, 78);
    
    doc.setTextColor(107, 114, 128);
    doc.setFont('helvetica', 'normal');
    doc.text('PAYEE', 120, 70);
    doc.setTextColor(31, 41, 55);
    doc.setFont('helvetica', 'bold');
    doc.text(invoice.payeeName, 120, 78);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);
    doc.text(invoice.payeeVpa, 120, 84);
    
    doc.line(20, 100, 190, 100);
    
    // Amount
    doc.setFontSize(12);
    doc.setTextColor(107, 114, 128);
    doc.text('TOTAL AMOUNT', 20, 120);
    doc.setFontSize(20);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(`INR ${invoice.amount.toFixed(2)}`, 120, 120);
    
    // QR Code
    if (qrDataUrl) {
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(9);
      doc.text('Scan to Pay via UPI', 105, 145, { align: 'center' });
      doc.addImage(qrDataUrl, 'PNG', 75, 150, 60, 60);
    }
    
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text('This is a system generated invoice.', 105, 280, { align: 'center' });
    
    doc.save(`Invoice_${invoice.id}.pdf`);
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
          <button 
            onClick={() => setShowForm(true)}
            className="modern-button shadow-xl shadow-gray-100"
          >
            <Plus className="w-5 h-5" />
            New Invoice
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
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

                  <div className="p-8 flex flex-col items-center justify-center bg-gray-50/50">
                    <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-100 mb-6">
                      {qrDataUrl ? (
                        <img src={qrDataUrl} alt="UPI QR" className="w-48 h-48" />
                      ) : (
                        <div className="w-48 h-48 bg-gray-100 rounded-xl animate-pulse" />
                      )}
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
      </main>

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
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Invoice ID</label>
                    <input
                      required
                      type="text"
                      placeholder="INV-001"
                      className="modern-input"
                      value={formData.id}
                      onChange={e => setFormData({ ...formData, id: e.target.value })}
                    />
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
