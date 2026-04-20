import React, { useState, useEffect } from 'react';
import {
    X, Plus, Trash2, Calendar, Receipt, Loader2, Wallet,
    ArrowRight, TrendingDown, Send, IndianRupee
} from 'lucide-react';
import toast from 'react-hot-toast';

const ENTRY_TYPES = [
    { id: 'expense', label: 'Expense', icon: TrendingDown, color: 'red' },
    { id: 'transfer_balu', label: 'To Balu', icon: Send, color: 'blue' },
    { id: 'transfer_mani', label: 'To Mani', icon: Send, color: 'teal' },
];

export function AdvanceExpensesModal({ isOpen, onClose, onUpdate, totalAdvance = 0, initialExpenses = [], isDarkMode }) {
    const [expenses, setExpenses] = useState(initialExpenses);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [entryType, setEntryType] = useState('expense');
    const [newItem, setNewItem] = useState({
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: ''
    });

    useEffect(() => { setExpenses(initialExpenses); }, [initialExpenses]);

    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    const getEntryMeta = (type) => {
        if (type === 'transfer_balu') return { label: 'Transfer → Balu', color: 'blue', bg: isDarkMode ? 'bg-blue-900/30 text-blue-300 border-blue-700/40' : 'bg-blue-50 text-blue-700 border-blue-200' };
        if (type === 'transfer_mani') return { label: 'Transfer → Mani', color: 'teal', bg: isDarkMode ? 'bg-teal-900/30 text-teal-300 border-teal-700/40' : 'bg-teal-50 text-teal-700 border-teal-200' };
        return { label: 'Expense', color: 'red', bg: isDarkMode ? 'bg-red-900/20 text-red-300 border-red-700/30' : 'bg-red-50 text-red-600 border-red-200' };
    };

    const isTransfer = entryType === 'transfer_balu' || entryType === 'transfer_mani';
    const transferTo = entryType === 'transfer_balu' ? 'Balu' : 'Mani';

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newItem.description || !newItem.amount) return;

        setIsSubmitting(true);
        try {
            const payload = {
                ...newItem,
                amount: parseFloat(newItem.amount),
                type: isTransfer ? 'advance_transfer' : 'expense',
                ...(isTransfer && { transferTo })
            };

            const response = await fetch('https://spcarparkingbknd.onrender.com/advance-expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error('Failed to add entry');

            // If transfer, also create a balancesheet revenue record for recipient
            if (isTransfer) {
                const entryDate = new Date(newItem.date);
                const month = entryDate.getMonth();
                const year = entryDate.getFullYear();
                const bsRes = await fetch('https://spcarparkingbknd.onrender.com/balancesheet', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userName: transferTo,
                        amount: parseFloat(newItem.amount),
                        date: entryDate,
                        month,
                        year,
                        type: 'advance_transfer',
                        description: newItem.description || `Advance Transfer`
                    })
                });
                if (!bsRes.ok) throw new Error('Failed to record transfer in statement');
                toast.success(`₹${parseFloat(newItem.amount).toLocaleString('en-IN')} transferred to ${transferTo}`);
            } else {
                toast.success('Expense added successfully');
            }

            setNewItem({ date: new Date().toISOString().split('T')[0], description: '', amount: '' });
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Error adding entry:', error);
            toast.error(error.message || 'Failed to add entry');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this entry? If it was a transfer, the balancesheet record will NOT be auto-removed.')) return;
        setIsLoading(true);
        try {
            const response = await fetch(`https://spcarparkingbknd.onrender.com/advance-expenses/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete entry');
            toast.success('Entry deleted');
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Error deleting entry:', error);
            toast.error('Failed to delete entry');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const totalDeductions = expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
    const advanceInHand = totalAdvance - totalDeductions;
    const totalTransfers = expenses.filter(e => e.type === 'advance_transfer').reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalExpensesOnly = totalDeductions - totalTransfers;

    // Theme helpers
    const surface = isDarkMode ? 'bg-gray-800' : 'bg-white';
    const surfaceSub = isDarkMode ? 'bg-gray-900' : 'bg-gray-50';
    const border = isDarkMode ? 'border-gray-700' : 'border-gray-200';
    const text = isDarkMode ? 'text-gray-100' : 'text-gray-900';
    const muted = isDarkMode ? 'text-gray-400' : 'text-gray-500';
    const inputCls = `w-full px-3 py-2.5 rounded-xl border ${isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-100' : 'bg-white border-gray-200 text-gray-900'} text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm bg-black/60">
            <div
                className={`${surface} rounded-2xl w-full flex flex-col shadow-2xl overflow-hidden ring-1 ${isDarkMode ? 'ring-white/10' : 'ring-gray-900/5'}`}
                style={{ maxWidth: '680px', maxHeight: '92vh' }}
            >
                {/* ── Header ── */}
                <div className={`flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-5 pb-4 border-b ${border}`}>
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className={`p-2.5 rounded-xl flex-shrink-0 ${isDarkMode ? 'bg-violet-900/40' : 'bg-violet-100'}`}>
                                <Wallet className={`w-5 h-5 ${isDarkMode ? 'text-violet-400' : 'text-violet-600'}`} />
                            </div>
                            <div className="min-w-0">
                                <h2 className={`text-lg sm:text-xl font-bold ${text} truncate`}>Advance Ledger</h2>
                                <p className={`text-xs sm:text-sm ${muted} mt-0.5`}>Track expenses & fund transfers</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className={`p-1.5 rounded-full flex-shrink-0 ml-2 transition-all ${isDarkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                            { label: 'Advance Pool', value: totalAdvance, color: isDarkMode ? 'text-amber-400' : 'text-amber-700', bg: isDarkMode ? 'bg-amber-900/20 border-amber-800/30' : 'bg-amber-50 border-amber-100' },
                            { label: 'Net In Hand', value: advanceInHand, color: isDarkMode ? 'text-cyan-400' : 'text-cyan-700', bg: isDarkMode ? 'bg-cyan-900/20 border-cyan-800/30' : 'bg-cyan-50 border-cyan-100' },
                            { label: 'Expenses', value: totalExpensesOnly, color: isDarkMode ? 'text-red-400' : 'text-red-600', bg: isDarkMode ? 'bg-red-900/20 border-red-800/30' : 'bg-red-50 border-red-100' },
                            { label: 'Transferred', value: totalTransfers, color: isDarkMode ? 'text-blue-400' : 'text-blue-600', bg: isDarkMode ? 'bg-blue-900/20 border-blue-800/30' : 'bg-blue-50 border-blue-100' },
                        ].map(({ label, value, color, bg }) => (
                            <div key={label} className={`rounded-xl p-2.5 sm:p-3 border ${bg}`}>
                                <p className={`text-[10px] sm:text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-1`}>{label}</p>
                                <p className={`text-sm sm:text-base font-bold ${color} leading-tight`}>
                                    ₹{value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Scrollable Body ── */}
                <div className={`flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 ${surfaceSub}`}>

                    {/* ── Add Entry Form ── */}
                    <form onSubmit={handleAdd} className={`${surface} rounded-2xl border ${border} p-4 shadow-sm`}>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-1 h-4 rounded-full bg-violet-500" />
                            <h3 className={`text-sm font-semibold ${text}`}>New Entry</h3>
                        </div>

                        {/* Entry Type Selector */}
                        <div className={`flex gap-1.5 p-1 rounded-xl mb-4 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
                            {ENTRY_TYPES.map(({ id, label, icon: Icon, color }) => {
                                const active = entryType === id;
                                const activeClass = {
                                    red: isDarkMode ? 'bg-red-900/70 text-red-300 shadow-sm' : 'bg-white text-red-600 shadow-sm',
                                    blue: isDarkMode ? 'bg-blue-900/70 text-blue-300 shadow-sm' : 'bg-white text-blue-600 shadow-sm',
                                    teal: isDarkMode ? 'bg-teal-900/70 text-teal-300 shadow-sm' : 'bg-white text-teal-600 shadow-sm',
                                }[color];
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => setEntryType(id)}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${active ? activeClass : (isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700')}`}
                                    >
                                        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                                        <span className="truncate">{label}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Transfer indicator */}
                        {isTransfer && (
                            <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-lg text-xs font-medium ${entryType === 'transfer_balu' ? (isDarkMode ? 'bg-blue-900/30 text-blue-300 border border-blue-800/40' : 'bg-blue-50 text-blue-700 border border-blue-200') : (isDarkMode ? 'bg-teal-900/30 text-teal-300 border border-teal-800/40' : 'bg-teal-50 text-teal-700 border border-teal-200')}`}>
                                <ArrowRight className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>This amount will be transferred from the advance pool to <strong>{transferTo}</strong>'s cash in hand and will appear in their statement as revenue.</span>
                            </div>
                        )}

                        {/* Date + Description + Amount */}
                        <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${muted}`}>Date</label>
                                    <div className="relative">
                                        <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${muted} pointer-events-none`} />
                                        <input
                                            type="date"
                                            value={newItem.date}
                                            onChange={(e) => setNewItem({ ...newItem, date: e.target.value })}
                                            className={`${inputCls} pl-9`}
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${muted}`}>Amount</label>
                                    <div className="relative">
                                        <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium ${muted} pointer-events-none`}>₹</span>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            value={newItem.amount}
                                            onChange={(e) => setNewItem({ ...newItem, amount: e.target.value })}
                                            className={`${inputCls} pl-7 font-semibold`}
                                            required
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${muted}`}>Description</label>
                                <input
                                    type="text"
                                    placeholder={isTransfer ? `Reason for transfer to ${transferTo}...` : 'What was this expense for?'}
                                    value={newItem.description}
                                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                    className={inputCls}
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex justify-end mt-4">
                            <button
                                type="submit"
                                disabled={isLoading || isSubmitting}
                                className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[130px] justify-center
                                    ${isTransfer
                                        ? (entryType === 'transfer_balu' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-teal-600 hover:bg-teal-700')
                                        : 'bg-violet-600 hover:bg-violet-700'
                                    }`}
                            >
                                {isSubmitting ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" />Processing...</>
                                ) : isTransfer ? (
                                    <><Send className="w-4 h-4" />Transfer</>
                                ) : (
                                    <><Plus className="w-4 h-4" />Add Expense</>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* ── Entries List ── */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                            <h3 className={`font-semibold text-sm ${text} flex items-center gap-2`}>
                                <Receipt className="w-4 h-4 text-gray-400" />
                                All Entries
                            </h3>
                            <span className={`text-xs font-medium px-2 py-1 rounded-lg border ${isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-white text-gray-500 border-gray-200'}`}>
                                {expenses.length} records
                            </span>
                        </div>

                        <div className={`${surface} rounded-2xl border ${border} overflow-hidden shadow-sm`}>
                            {/* Table Header – desktop only */}
                            <div className={`hidden sm:grid grid-cols-12 gap-3 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider ${muted} ${isDarkMode ? 'bg-gray-900/70 border-b border-gray-800' : 'bg-gray-50 border-b border-gray-100'}`}>
                                <div className="col-span-2">Date</div>
                                <div className="col-span-2">Type</div>
                                <div className="col-span-4">Description</div>
                                <div className="col-span-3 text-right">Amount</div>
                                <div className="col-span-1 text-center">Del</div>
                            </div>

                            <div className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                                {expenses.length === 0 ? (
                                    <div className={`py-12 text-center ${muted}`}>
                                        <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                            <Receipt className="w-7 h-7 opacity-40" />
                                        </div>
                                        <p className="text-sm font-medium">No entries yet</p>
                                        <p className="text-xs mt-1 opacity-70">Add your first expense or transfer above</p>
                                    </div>
                                ) : (
                                    expenses.map((item) => {
                                        const itemType = item.type === 'advance_transfer' ? (item.transferTo === 'Balu' ? 'transfer_balu' : 'transfer_mani') : 'expense';
                                        const meta = getEntryMeta(itemType);
                                        const isItemTransfer = item.type === 'advance_transfer';

                                        return (
                                            <div key={item._id} className={`group transition-colors ${isDarkMode ? 'hover:bg-gray-800/60' : 'hover:bg-gray-50/60'}`}>
                                                {/* Desktop Row */}
                                                <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-3 items-center">
                                                    <div className={`col-span-2 text-xs ${muted} font-medium`}>
                                                        {new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                                                    </div>
                                                    <div className="col-span-2">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${meta.bg}`}>
                                                            {isItemTransfer ? <ArrowRight className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                                                            {isItemTransfer ? item.transferTo : 'Exp'}
                                                        </span>
                                                    </div>
                                                    <div className={`col-span-4 text-sm font-medium ${text} truncate`}>{item.description}</div>
                                                    <div className={`col-span-3 text-right text-sm font-bold ${isItemTransfer ? (isDarkMode ? 'text-blue-400' : 'text-blue-600') : (isDarkMode ? 'text-red-400' : 'text-red-600')}`}>
                                                        {isItemTransfer ? '→' : '-'} ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </div>
                                                    <div className="col-span-1 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleDelete(item._id)}
                                                            className={`p-1.5 rounded-lg ${isDarkMode ? 'text-gray-500 hover:text-red-400 hover:bg-red-900/20' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'} transition-all`}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Mobile Card */}
                                                <div className="sm:hidden px-4 py-3">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${meta.bg}`}>
                                                                    {isItemTransfer ? <ArrowRight className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                                                                    {meta.label}
                                                                </span>
                                                                <span className={`text-[10px] ${muted} flex items-center gap-1`}>
                                                                    <Calendar className="w-2.5 h-2.5" />
                                                                    {new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                                </span>
                                                            </div>
                                                            <p className={`text-sm font-medium ${text} leading-snug truncate`}>{item.description}</p>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                                            <p className={`text-base font-bold ${isItemTransfer ? (isDarkMode ? 'text-blue-400' : 'text-blue-600') : (isDarkMode ? 'text-red-400' : 'text-red-600')}`}>
                                                                {isItemTransfer ? '→' : '-'} ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                            </p>
                                                            <button
                                                                onClick={() => handleDelete(item._id)}
                                                                className={`p-1.5 rounded-lg ${isDarkMode ? 'text-gray-500 active:text-red-400 active:bg-red-900/20' : 'text-gray-400 active:text-red-600 active:bg-red-50'}`}
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Footer ── */}
                <div className={`flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="space-y-1.5">
                        {totalExpensesOnly > 0 && (
                            <div className="flex justify-between items-center text-sm">
                                <span className={muted}>Total Expenses</span>
                                <span className={`font-semibold ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>- ₹{totalExpensesOnly.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                        )}
                        {totalTransfers > 0 && (
                            <div className="flex justify-between items-center text-sm">
                                <span className={muted}>Total Transferred</span>
                                <span className={`font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>→ ₹{totalTransfers.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                        )}
                        <div className={`flex justify-between items-center pt-2 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                            <span className={`text-sm font-bold ${text}`}>Net Advance Available</span>
                            <div className={`px-3 py-1 rounded-xl font-bold text-base ${isDarkMode ? 'bg-cyan-900/40 text-cyan-300' : 'bg-cyan-100 text-cyan-800'}`}>
                                ₹{advanceInHand.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
