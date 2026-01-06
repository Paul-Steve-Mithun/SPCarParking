import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calendar, Receipt, IndianRupee, Loader2, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';

export function AdvanceExpensesModal({ isOpen, onClose, onUpdate, totalAdvance = 0, isDarkMode }) {
    const [expenses, setExpenses] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newItem, setNewItem] = useState({
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: ''
    });

    useEffect(() => {
        if (isOpen) {
            fetchExpenses();
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const fetchExpenses = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('https://spcarparkingbknd.onrender.com/advance-expenses');
            if (response.ok) {
                const data = await response.json();
                setExpenses(data);
                if (onUpdate) onUpdate();
            }
        } catch (error) {
            console.error('Error fetching expenses:', error);
            toast.error('Failed to fetch expenses');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newItem.description || !newItem.amount) return;

        setIsSubmitting(true);
        try {
            const response = await fetch('https://spcarparkingbknd.onrender.com/advance-expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newItem)
            });

            if (response.ok) {
                toast.success('Expense added');
                setNewItem({
                    date: new Date().toISOString().split('T')[0],
                    description: '',
                    amount: ''
                });
                fetchExpenses();
            } else {
                throw new Error('Failed to add expense');
            }
        } catch (error) {
            console.error('Error adding expense:', error);
            toast.error('Failed to add expense');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this expense?')) return;

        setIsLoading(true);
        try {
            const response = await fetch(`https://spcarparkingbknd.onrender.com/advance-expenses/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                toast.success('Expense deleted');
                fetchExpenses();
            } else {
                throw new Error('Failed to delete expense');
            }
        } catch (error) {
            console.error('Error deleting expense:', error);
            toast.error('Failed to delete expense');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    const totalExpenses = expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
    const advanceInHand = totalAdvance - totalExpenses;

    // Theme values
    const bgColor = isDarkMode ? 'bg-gray-800' : 'bg-white';
    const textColor = isDarkMode ? 'text-gray-100' : 'text-gray-900';
    const subTextColor = isDarkMode ? 'text-gray-400' : 'text-gray-500';
    const borderColor = isDarkMode ? 'border-gray-700' : 'border-gray-100';
    const inputBg = isDarkMode ? 'bg-gray-900' : 'bg-white';
    const inputBorder = isDarkMode ? 'border-gray-700' : 'border-gray-200';
    const headerBg = isDarkMode ? 'bg-gray-800' : 'bg-white';
    const listHeaderBg = isDarkMode ? 'bg-gray-900/50' : 'bg-gray-50/80';
    const containerBg = isDarkMode ? 'bg-gray-900/50' : 'bg-gray-50/50';
    const cardBg = isDarkMode ? 'bg-gray-800' : 'bg-white';
    const hoverBg = isDarkMode ? 'hover:bg-gray-700/20' : 'hover:bg-gray-50/80';

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-all animate-fade-in ${isDarkMode ? 'bg-black/70' : 'bg-black/60'}`}>
            <div className={`${bgColor} rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden ring-1 ${isDarkMode ? 'ring-white/10' : 'ring-gray-900/5'}`}>
                {/* Header */}
                <div className={`p-4 sm:p-6 border-b ${borderColor} ${headerBg}`}>
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                                <Wallet className={`w-6 h-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                            </div>
                            <div>
                                <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Advance Expenses Ledger</h2>
                                <p className={`${subTextColor} text-sm mt-0.5`}>Track expenses from advance collection</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className={`p-2 rounded-full transition-all ${isDarkMode ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50' : 'text-gray-400 hover:text-gray-500 hover:bg-gray-100'}`}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Header Stats */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-amber-900/10 border-amber-700/30' : 'bg-amber-50 border-amber-100'}`}>
                            <p className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-amber-100/70' : 'text-amber-900'}`}>Advance Till Date</p>
                            <p className={`text-2xl font-bold ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                                ₹{totalAdvance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                        <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-cyan-900/10 border-cyan-700/30' : 'bg-cyan-50 border-cyan-100'}`}>
                            <p className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-cyan-100/70' : 'text-cyan-900'}`}>Advance In Hand</p>
                            <p className={`text-2xl font-bold ${isDarkMode ? 'text-cyan-400' : 'text-cyan-700'}`}>
                                ₹{advanceInHand.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className={`flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 ${containerBg}`}>
                    {/* Add New Form */}
                    <form onSubmit={handleAdd} className={`${cardBg} p-5 rounded-xl border ${borderColor} shadow-sm`}>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-1 h-5 bg-blue-500 rounded-full"></div>
                            <h3 className={`font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Add New Expense</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                            <div className="sm:col-span-3">
                                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${subTextColor}`}>Date</label>
                                <input
                                    type="date"
                                    value={newItem.date}
                                    onChange={(e) => setNewItem({ ...newItem, date: e.target.value })}
                                    className={`w-full px-3 py-2.5 rounded-lg border ${inputBorder} ${inputBg} ${isDarkMode ? 'text-gray-100' : 'text-gray-900'} focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm`}
                                    required
                                />
                            </div>
                            <div className="sm:col-span-6">
                                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${subTextColor}`}>Description</label>
                                <input
                                    type="text"
                                    placeholder="Enter expense details..."
                                    value={newItem.description}
                                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                    className={`w-full px-3 py-2.5 rounded-lg border ${inputBorder} ${inputBg} ${isDarkMode ? 'text-gray-100' : 'text-gray-900'} focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm`}
                                    required
                                />
                            </div>
                            <div className="sm:col-span-3">
                                <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${subTextColor}`}>Amount</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className={`text-sm font-medium ${subTextColor}`}>₹</span>
                                    </div>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={newItem.amount}
                                        onChange={(e) => setNewItem({ ...newItem, amount: e.target.value })}
                                        className={`w-full pl-7 pr-3 py-2.5 rounded-lg border ${inputBorder} ${inputBg} ${isDarkMode ? 'text-gray-100' : 'text-gray-900'} focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm font-medium`}
                                        required
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end mt-4">
                            <button
                                type="submit"
                                disabled={isLoading || isSubmitting}
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[120px] justify-center"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Adding...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4" />
                                        Add Entry
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Expenses List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <h3 className={`font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'} flex items-center gap-2`}>
                                <Receipt className="w-4 h-4 text-gray-400" />
                                Recent Entries
                            </h3>
                            <span className={`text-xs font-medium px-2 py-1 rounded-md border ${isDarkMode ? 'bg-gray-800 text-gray-400 border-gray-700' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                {expenses.length} records
                            </span>
                        </div>

                        <div className={`${cardBg} rounded-xl border ${borderColor} overflow-hidden shadow-sm`}>
                            <div className={`hidden sm:grid grid-cols-12 gap-4 p-3 ${listHeaderBg} text-xs font-bold ${subTextColor} uppercase tracking-wider border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`}>
                                <div className="col-span-3 pl-2">Date</div>
                                <div className="col-span-4">Description</div>
                                <div className="col-span-3 text-right">Amount</div>
                                <div className="col-span-2 text-center">Action</div>
                            </div>

                            <div className={`divide-y ${isDarkMode ? 'divide-gray-800' : 'divide-gray-100'}`}>
                                {expenses.length === 0 ? (
                                    <div className={`p-12 text-center ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                        <div className={`${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50'} w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4`}>
                                            <Receipt className="w-8 h-8 opacity-50" />
                                        </div>
                                        <p className="font-medium">No expenses recorded yet</p>
                                        <p className="text-sm mt-1 opacity-70">Add your first advance expense above</p>
                                    </div>
                                ) : (
                                    expenses.map((item) => (
                                        <div key={item._id} className={`group ${hoverBg} transition-colors`}>
                                            {/* Desktop View */}
                                            <div className="hidden sm:grid grid-cols-12 gap-4 p-3.5 items-center">
                                                <div className={`col-span-3 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} pl-2 font-medium`}>
                                                    {new Date(item.date).toLocaleDateString('en-GB', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric'
                                                    })}
                                                </div>
                                                <div className={`col-span-4 text-sm font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                                                    {item.description}
                                                </div>
                                                <div className={`col-span-3 text-right font-mono font-bold ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                                                    - ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                </div>
                                                <div className="col-span-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => handleDelete(item._id)}
                                                        className={`p-1.5 rounded-lg transition-all ${isDarkMode ? 'text-gray-400 hover:text-red-400 hover:bg-red-900/20' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                                                        title="Delete entry"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Mobile View */}
                                            <div className="sm:hidden p-4 space-y-3">
                                                <div className="flex justify-between items-start gap-3">
                                                    <div className="space-y-1.5 flex-1">
                                                        <div className={`text-sm font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'} leading-snug`}>{item.description}</div>
                                                        <div className={`text-xs ${subTextColor} flex items-center gap-1.5 font-medium ${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-100'} w-fit px-2 py-0.5 rounded`}>
                                                            <Calendar className="w-3 h-3" />
                                                            {new Date(item.date).toLocaleDateString('en-GB', {
                                                                day: '2-digit',
                                                                month: 'short',
                                                                year: 'numeric'
                                                            })}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2">
                                                        <div className={`font-mono font-bold ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>- ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                                                        <button
                                                            onClick={() => handleDelete(item._id)}
                                                            className="p-1.5 text-gray-400 active:text-red-600 active:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className={`p-4 sm:p-6 border-t ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex justify-between items-center mb-2">
                        <span className={`text-sm font-medium ${subTextColor}`}>Total Deductions</span>
                        <span className={`text-lg font-bold font-mono ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                            - ₹{totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                    </div>
                    {/* Simplified Footer Summary */}
                    <div className={`mt-4 pt-4 border-t flex justify-between items-center ${isDarkMode ? 'border-gray-700/50' : 'border-gray-200'}`}>
                        <span className={`text-sm font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Net Advance Available</span>
                        <div className={`px-3 py-1 rounded-lg font-bold font-mono ${isDarkMode ? 'bg-cyan-900/30 text-cyan-300' : 'bg-cyan-100 text-cyan-800'}`}>
                            ₹{advanceInHand.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Add index.js export if necessary or just import this file directly
