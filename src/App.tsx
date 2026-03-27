import React, { useState, useEffect } from 'react';
import { 
  QrCode, 
  Plus, 
  Download, 
  CheckCircle2, 
  Clock, 
  User, 
  IndianRupee, 
  FileText, 
  ArrowRight,
  Trash2,
  ExternalLink
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

export default function App() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState({
    id: '',
    customerName: '',
    amount: '',
    payeeName: '',
    payeeVpa: ''
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
        width: 400,
        margin: 2,
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
        setFormData({ id: '', customerName: '', amount: '', payeeName: '', payeeVpa: '' });
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

  const downloadPdf = (invoice: Invoice) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.text('INVOICE', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.text(`Invoice ID: ${invoice.id}`, 20, 40);
    doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`, 20, 50);
    
    doc.line(20, 55, 190, 55);
    
    // Details
    doc.text('Bill To:', 20, 70);
    doc.setFont('helvetica', 'bold');
    doc.text(invoice.customerName, 20, 80);
    
    doc.setFont('helvetica', 'normal');
    doc.text('Payee Details:', 120, 70);
    doc.text(`Name: ${invoice.payeeName}`, 120, 80);
    doc.text(`UPI ID: ${invoice.payeeVpa}`, 120, 90);
    
    doc.line(20, 100, 190, 100);
    
    // Amount
    doc.setFontSize(16);
    doc.text('Total Amount:', 20, 120);
    doc.setFont('helvetica', 'bold');
    doc.text(`INR ${invoice.amount.toFixed(2)}`, 120, 120);
    
    // QR Code
    if (qrDataUrl) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Scan to Pay via UPI', 105, 140, { align: 'center' });
      doc.addImage(qrDataUrl, 'PNG', 75, 145, 60, 60);
    }
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Thank you for your business!', 105, 220, { align: 'center' });
    
    doc.save(`Invoice_${invoice.id}.pdf`);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-orange-100">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
              <QrCode className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">UPISync</h1>
          </div>
          <button 
            onClick={() => setShowForm(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Invoice
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar / List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Recent Invoices</h2>
            <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full text-gray-600">{invoices.length}</span>
          </div>
          
          <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-200px)] pr-2">
            {invoices.map((inv) => (
              <motion.div
                layoutId={inv.id}
                key={inv.id}
                onClick={() => setSelectedInvoice(inv)}
                className={cn(
                  "p-4 rounded-2xl border transition-all cursor-pointer group",
                  selectedInvoice?.id === inv.id 
                    ? "bg-white border-orange-500 shadow-md ring-1 ring-orange-500" 
                    : "bg-white border-gray-200 hover:border-orange-200 hover:shadow-sm"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-mono text-gray-400">#{inv.id}</span>
                  <span className={cn(
                    "text-[10px] uppercase font-bold px-2 py-0.5 rounded-full",
                    inv.status === 'paid' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                  )}>
                    {inv.status}
                  </span>
                </div>
                <h3 className="font-semibold truncate">{inv.customerName}</h3>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-lg font-bold">₹{inv.amount.toLocaleString()}</span>
                  <ArrowRight className={cn(
                    "w-4 h-4 text-gray-300 transition-transform group-hover:translate-x-1",
                    selectedInvoice?.id === inv.id && "text-orange-500"
                  )} />
                </div>
              </motion.div>
            ))}
            
            {invoices.length === 0 && (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-3xl">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No invoices yet.</p>
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
                className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden"
              >
                <div className="p-8 border-b border-gray-100 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-3xl font-bold tracking-tight">Invoice #{selectedInvoice.id}</h2>
                      <button 
                        onClick={() => toggleStatus(selectedInvoice.id, selectedInvoice.status)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors",
                          selectedInvoice.status === 'paid' 
                            ? "bg-green-500 text-white hover:bg-green-600" 
                            : "bg-amber-500 text-white hover:bg-amber-600"
                        )}
                      >
                        {selectedInvoice.status === 'paid' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        Mark as {selectedInvoice.status === 'paid' ? 'Unpaid' : 'Paid'}
                      </button>
                    </div>
                    <p className="text-gray-500 flex items-center gap-2">
                      Created on {new Date(selectedInvoice.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}
                    </p>
                  </div>
                  <button 
                    onClick={() => downloadPdf(selectedInvoice)}
                    className="p-3 bg-gray-50 hover:bg-gray-100 rounded-2xl text-gray-600 transition-colors"
                    title="Download PDF"
                  >
                    <Download className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <section>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-3">Customer Details</label>
                      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                          <User className="text-orange-500" />
                        </div>
                        <div>
                          <p className="font-bold text-lg">{selectedInvoice.customerName}</p>
                          <p className="text-sm text-gray-500">Client</p>
                        </div>
                      </div>
                    </section>

                    <section>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-3">Payee Information</label>
                      <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-500">Merchant Name</span>
                          <span className="font-semibold">{selectedInvoice.payeeName}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-500">UPI VPA</span>
                          <span className="font-mono text-sm bg-gray-100 px-2 py-0.5 rounded">{selectedInvoice.payeeVpa}</span>
                        </div>
                      </div>
                    </section>

                    <section className="pt-4">
                      <div className="p-6 bg-orange-50 rounded-3xl border border-orange-100">
                        <div className="flex justify-between items-center">
                          <span className="text-orange-900 font-medium">Total Amount</span>
                          <span className="text-3xl font-black text-orange-600">₹{selectedInvoice.amount.toLocaleString()}</span>
                        </div>
                      </div>
                    </section>
                  </div>

                  <div className="flex flex-col items-center justify-center bg-gray-50 rounded-3xl p-8 border border-dashed border-gray-200">
                    <div className="bg-white p-4 rounded-2xl shadow-xl mb-4">
                      {qrDataUrl ? (
                        <img src={qrDataUrl} alt="UPI QR Code" className="w-48 h-48" />
                      ) : (
                        <div className="w-48 h-48 bg-gray-100 animate-pulse rounded-lg" />
                      )}
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-gray-800">Scan to Pay</p>
                      <p className="text-xs text-gray-500 mt-1">Compatible with Google Pay, PhonePe, Paytm, etc.</p>
                    </div>
                    <div className="mt-6 flex gap-2">
                       <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                       <span className="w-2 h-2 rounded-full bg-green-500"></span>
                       <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white rounded-3xl border border-gray-200 border-dashed">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                  <FileText className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-800">Select an invoice</h3>
                <p className="text-gray-500 max-w-xs mt-2">Choose an invoice from the list to view details and generate a payment QR code.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Create Modal */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100 bg-orange-50">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Plus className="text-orange-500" />
                  Create New Invoice
                </h2>
              </div>
              <form onSubmit={handleCreateInvoice} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Invoice ID</label>
                    <input
                      required
                      type="text"
                      placeholder="INV-001"
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                      value={formData.id}
                      onChange={e => setFormData({ ...formData, id: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">Amount (INR)</label>
                    <input
                      required
                      type="number"
                      placeholder="0.00"
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                      value={formData.amount}
                      onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Customer Name</label>
                  <input
                    required
                    type="text"
                    placeholder="John Doe"
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                    value={formData.customerName}
                    onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Payee Name (Your Name)</label>
                  <input
                    required
                    type="text"
                    placeholder="Your Business Name"
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                    value={formData.payeeName}
                    onChange={e => setFormData({ ...formData, payeeName: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase">Payee UPI ID (VPA)</label>
                  <input
                    required
                    type="text"
                    placeholder="name@upi"
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                    value={formData.payeeVpa}
                    onChange={e => setFormData({ ...formData, payeeVpa: e.target.value })}
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-2xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={loading}
                    type="submit"
                    className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl shadow-lg shadow-orange-200 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Creating...' : 'Create Invoice'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 py-12 border-t border-gray-200 mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 opacity-50">
            <QrCode className="w-5 h-5" />
            <span className="font-bold tracking-tight">UPISync</span>
          </div>
          <div className="flex gap-8 text-sm text-gray-400 font-medium">
            <a href="#" className="hover:text-orange-500 transition-colors">Documentation</a>
            <a href="#" className="hover:text-orange-500 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-orange-500 transition-colors">Support</a>
          </div>
          <p className="text-xs text-gray-400">© 2026 UPISync Billing. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
