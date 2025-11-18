import { useEffect, useState } from 'react';
import { 
    DollarSign, 
    Calendar,
    Printer,
    ChevronDown,
    AlertCircle,
    ArrowUp,
    ArrowDown,
    CreditCard,
    Search,
    Plus,
    User,
    Wallet,
    ClipboardList,
    FileText,
    X,
    Banknote,
    Users,
    TrashIcon
} from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useTheme } from './contexts/ThemeContext';

const ExpenseStatSkeleton = ({ isDarkMode }) => (
    <div className={`rounded-2xl p-4 sm:p-6 border shadow-md animate-pulse ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} h-12 w-12`}></div>
            <div>
                <div className={`h-4 w-24 rounded mb-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                <div className={`h-7 w-32 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
            </div>
        </div>
    </div>
);

const ExpenseTableRowSkeleton = ({ isDarkMode }) => (
    <tr className="animate-pulse">
        <td className="px-3 sm:px-6 py-4">
            <div className={`h-4 w-8 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
        </td>
        {Array.from({ length: 7 }).map((_, i) => (
            <td key={i} className="px-3 sm:px-6 py-4">
                <div className={`h-4 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} ${i % 2 === 0 ? 'w-20' : 'w-28'}`}></div>
            </td>
        ))}
    </tr>
);

export function ExpensesDashboard() {
    const { isDarkMode } = useTheme();
    const [expenses, setExpenses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filteredData, setFilteredData] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [expenseToDelete, setExpenseToDelete] = useState(null);
    const [isAddingExpense, setIsAddingExpense] = useState(false);
    const [newExpense, setNewExpense] = useState({
        expenseType: 'Watchman 1',
        spentBy: 'Balu',
        description: '',
        amount: '',
        transactionMode: 'Cash',
        transactionDate: new Date().toISOString().split('T')[0]
    });
    const [stats, setStats] = useState({
        totalExpenses: 0,
        baluExpenses: 0,
        maniExpenses: 0
    });
    const [sortConfig, setSortConfig] = useState({ 
        key: 'transactionDate', 
        direction: 'desc' 
    });
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    // 1. Add state for edit modal
    const [isEditExpenseOpen, setIsEditExpenseOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [editExpenseForm, setEditExpenseForm] = useState({
        amount: '',
        transactionDate: '',
        transactionMode: 'Cash',
        spentBy: 'Balu',
    });

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June', 
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    useEffect(() => {
        fetchExpenses();
    }, [selectedMonth, selectedYear]);

    useEffect(() => {
        const filtered = expenses.filter(expense => {
            const query = searchQuery.toLowerCase();
            return (
                expense.expenseType.toLowerCase().includes(query) ||
                (expense.description || '').toLowerCase().includes(query)
            );
        });
        setFilteredData(filtered);
    }, [searchQuery, expenses]);

    const fetchExpenses = async () => {
        setIsLoading(true);
        try {
            const [expensesRes, statsRes] = await Promise.all([
                fetch(`https://spcarparkingbknd.onrender.com/expenses?month=${selectedMonth}&year=${selectedYear}`),
                fetch(`https://spcarparkingbknd.onrender.com/expenses/stats?month=${selectedMonth}&year=${selectedYear}`)
            ]);

            const expensesData = await expensesRes.json();
            const statsData = await statsRes.json();

            setExpenses(expensesData);

            // Calculate totals from stats
            const totalExpenses = statsData.reduce((sum, stat) => sum + stat.totalAmount, 0);
            const baluExpenses = statsData.find(s => s._id === 'Balu')?.totalAmount || 0;
            const maniExpenses = statsData.find(s => s._id === 'Mani')?.totalAmount || 0;

            setStats({
                totalExpenses,
                baluExpenses,
                maniExpenses
            });

        } catch (error) {
            toast.error('Failed to fetch expenses data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddExpense = async () => {
        if (isAddingExpense) return; // Prevent double submission
        setIsAddingExpense(true);
        try {
            const response = await fetch('https://spcarparkingbknd.onrender.com/expenses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newExpense),
            });

            if (!response.ok) throw new Error('Failed to add expense');

            await fetchExpenses();
            setIsAddExpenseOpen(false);
            setNewExpense({
                expenseType: 'Watchman 1',
                spentBy: 'Balu',
                description: '',
                amount: '',
                transactionMode: 'Cash',
                transactionDate: new Date().toISOString().split('T')[0]
            });
            toast.success('Expense added successfully');
        } catch (error) {
            toast.error('Failed to add expense');
        } finally {
            setIsAddingExpense(false);
        }
    };

    const generateFilteredPDF = (filterBy = null) => {
        const doc = new jsPDF('landscape');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        // Filter data based on selection
        const filteredData = filterBy 
            ? expenses.filter(record => record.spentBy === filterBy)
            : expenses;

        // Calculate totals for filtered data
        const filteredStats = {
            totalExpenses: filteredData
                .reduce((sum, record) => sum + record.amount, 0)
        };

        // Calculate total table width based on column widths and included columns
        const columnWidths = {
            sno: 15,
            date: 25,
            type: 30,
            description: 40,
            mode: 25,
            spentBy: 25,
            amount: 35
        };
        
        // Calculate total width based on included columns
        const includedWidths = { ...columnWidths };
        if (filterBy) {
            delete includedWidths.spentBy; // Remove spentBy width for filtered reports
        }
        
        const totalTableWidth = Object.values(includedWidths).reduce((sum, width) => sum + width, 0);
        const leftMargin = (pageWidth - totalTableWidth) / 2;

        // Modern header with gradient-like effect
        doc.setFillColor(79, 70, 229);
        doc.rect(0, 0, pageWidth, 35, 'F');
        
        // Company name
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('SP CAR PARKING', pageWidth / 2, 18, { align: 'center' });
        
        // Statement title with generation date
        doc.setFontSize(14);
        const today = new Date();
        const formattedDate = today.toLocaleDateString('en-gb', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        const titleText = filterBy 
            ? `${monthNames[selectedMonth]} ${selectedYear} Expenses Statement - ${filterBy}'s Expenses (Generated: ${formattedDate})`
            : `${monthNames[selectedMonth]} ${selectedYear} Expenses Statement (Generated: ${formattedDate})`;
        doc.text(titleText, pageWidth / 2, 28, { align: 'center' });

        // Format date function
        const formatDateForPDF = (date) => {
            const d = new Date(date);
            return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        };

        // Add the formatAmount function
        const formatAmount = (amount) => {
            if (amount === '-') return '-';
            
            // Convert amount to string with 2 decimal places
            const amountStr = amount.toFixed(2);
            
            // Calculate spaces needed (for maximum 100000.00)
            const spaceNeeded = 10 - amountStr.length;
            const spaces = ' '.repeat(spaceNeeded);
            
            // Return formatted string with consistent spacing
            return `INR${spaces}${amountStr}`;
        };

        // Table columns
        const baseColumns = [
            { header: 'S.No', dataKey: 'sno' },
            { header: 'Date', dataKey: 'date' },
            { header: 'Type', dataKey: 'type' },
            { header: 'Description', dataKey: 'description' },
            { header: 'Mode', dataKey: 'mode' }
        ];

        // Add Spent By column only for complete report
        if (!filterBy) {
            baseColumns.push({ header: 'Spent By', dataKey: 'spentBy' });
        }

        // Add Amount column (always included)
        baseColumns.push({ header: 'Amount', dataKey: 'amount' });

        // Prepare table rows
        const sortedTableRows = filteredData
            .sort((a, b) => {
                const dateA = new Date(a.transactionDate);
                const dateB = new Date(b.transactionDate);
                return dateA - dateB; // Oldest first
            })
            .map((record, index) => {
                const rowData = {
                    sno: (index + 1).toString(),
                    date: formatDateForPDF(record.transactionDate),
                    type: record.expenseType,
                    description: record.description || '-',
                    mode: record.transactionMode,
                    amount: formatAmount(record.amount)
                };

                // Add spentBy only for complete report
                if (!filterBy) {
                    rowData.spentBy = record.spentBy;
                }

                return rowData;
            });

        doc.autoTable({
            columns: baseColumns,
            body: sortedTableRows,
            startY: 45,
            theme: 'grid',
            headStyles: {
                fillColor: [79, 70, 229],
                textColor: [255, 255, 255],
                fontSize: 11,
                fontStyle: 'bold',
                cellPadding: 3,
                halign: 'center',
                valign: 'middle',
                lineWidth: 0.1,
                minCellHeight: 14
            },
            bodyStyles: {
                fontSize: 10,
                cellPadding: 2,
                lineColor: [237, 237, 237],
                valign: 'middle'
            },
            columnStyles: {
                sno: { cellWidth: columnWidths.sno, halign: 'center' },
                date: { cellWidth: columnWidths.date, halign: 'center' },
                type: { cellWidth: columnWidths.type, halign: 'center' },
                description: { cellWidth: columnWidths.description, halign: 'left' },
                mode: { cellWidth: columnWidths.mode, halign: 'center' },
                spentBy: { cellWidth: columnWidths.spentBy, halign: 'center' },
                amount: { cellWidth: columnWidths.amount, halign: 'right' }  // Right align amount
            },
            alternateRowStyles: {
                fillColor: [250, 250, 255]
            },
            margin: { 
                left: leftMargin,
                right: leftMargin,
                bottom: 20
            },
            styles: {
                fontSize: 9,
                font: 'helvetica',
                lineWidth: 0.1,
                overflow: 'linebreak',
                cellWidth: 'auto'
            },
            didDrawPage: function(data) {
                // Add page number at the bottom center
                doc.setFontSize(11);
                doc.setTextColor(0, 0, 0);
                doc.text(
                    `Page ${data.pageNumber}`, 
                    pageWidth / 2, 
                    pageHeight - 15, 
                    { align: 'center' }
                );
            },
            didParseCell: function(data) {
                // For amount column, use monospace font and bold style
                if (data.column.dataKey === 'amount') {
                    data.cell.styles.font = 'courier';
                    data.cell.styles.fontStyle = 'bold';
                    
                    // Handle different data types
                    if (data.cell.raw !== '-') {
                        let amount;
                        if (typeof data.cell.raw === 'string') {
                            amount = parseFloat(data.cell.raw.replace('INR', '').trim());
                        } else if (typeof data.cell.raw === 'number') {
                            amount = data.cell.raw;
                        }

                        if (!isNaN(amount)) {
                            data.cell.text = [formatAmount(amount)];
                        }
                    }
                }
            },
            didDrawCell: function(data) {
                // Draw stats after the last cell is processed
                if (data.row.index === sortedTableRows.length - 1 && data.column.index === baseColumns.length - 1) {
                    let finalY = data.cell.y + data.cell.height + 10;
                    const requiredHeight = !filterBy ? 50 : 30; // Height needed for stats boxes
                    
                    if (pageHeight - finalY < requiredHeight) {
                        doc.addPage();
                        finalY = 40;
                    }

                    // Set styles for totals
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(10);
                    doc.setTextColor(0, 0, 0);
                    doc.setDrawColor(200, 200, 200);
                    doc.setLineWidth(0.1);

                    const lineSpacing = 10;
                    const textPadding = 5;
                    const rowHeight = 10;

                    // Calculate positions for total boxes
                    const totalWidth = columnWidths.description + columnWidths.mode + columnWidths.amount;
                    const descriptionWidth = totalWidth * 0.4;
                    const rightMargin = pageWidth - leftMargin;
                    const amountX = rightMargin - columnWidths.amount;
                    const startX = amountX - descriptionWidth;

                    // Function to draw total row
                    const drawTotalRow = (y, description, amount, isHighlighted = false) => {
                        if (isHighlighted) {
                            doc.setFillColor(246, 246, 252);
                            doc.rect(startX, y - 7, descriptionWidth + columnWidths.amount, rowHeight, 'F');
                        }

                        doc.rect(startX, y - 7, descriptionWidth, rowHeight);
                        doc.rect(amountX, y - 7, columnWidths.amount, rowHeight);

                        // Set bold font for description
                        doc.setFont('helvetica', 'bold');
                        doc.text(description, startX + 2, y);
                        
                        // Set monospace bold font for amount
                        doc.setFont('courier', 'bold');
                        doc.text(
                            formatAmount(amount),
                            amountX + columnWidths.amount - 2,
                            y, 
                            { align: 'right' }
                        );
                    };

                    if (!filterBy) {
                        // Calculate individual expenses
                        const baluExpenses = filteredData
                            .filter(record => record.spentBy === 'Balu')
                            .reduce((sum, record) => sum + record.amount, 0);

                        const maniExpenses = filteredData
                            .filter(record => record.spentBy === 'Mani')
                            .reduce((sum, record) => sum + record.amount, 0);

                        // Draw Balu's Expenses
                        drawTotalRow(finalY, 'Balu\'s Expenses:', baluExpenses);

                        // Draw Mani's Expenses
                        drawTotalRow(finalY + lineSpacing, 'Mani\'s Expenses:', maniExpenses);

                        // Draw Grand Total
                        drawTotalRow(
                            finalY + (lineSpacing * 2),
                            'Grand Total:',
                            filteredStats.totalExpenses,
                            true
                        );
                    } else {
                        // For filtered reports, show only total
                        drawTotalRow(
                            finalY,
                            'Total Expenses:',
                            filteredStats.totalExpenses,
                            true
                        );
                    }
                }
            }
        });

        const filename = filterBy 
            ? `SP_Parking_Expenses_${filterBy}_${monthNames[selectedMonth]}_${selectedYear}.pdf`
            : `SP_Parking_Expenses_${monthNames[selectedMonth]}_${selectedYear}.pdf`;
        doc.save(filename);
        setIsPdfModalOpen(false);
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });

        const sortedData = [...expenses].sort((a, b) => {
            if (key === 'transactionDate') {
                const dateA = new Date(a[key]);
                const dateB = new Date(b[key]);
                return direction === 'asc' ? dateA - dateB : dateB - dateA;
            }
            if (key === 'amount') {
                return direction === 'asc' ? a[key] - b[key] : b[key] - a[key];
            }
            if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
            if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        setExpenses(sortedData);
    };

    const SortIcon = ({ column }) => {
        if (sortConfig.key !== column) {
            return <ChevronDown className="w-4 h-4 ml-1" />;
        }
        return sortConfig.direction === 'asc' ? 
            <ArrowUp className="w-4 h-4 ml-1" /> : 
            <ArrowDown className="w-4 h-4 ml-1" />;
    };

    const handleDeleteExpense = async (expenseId, expense) => {
        setExpenseToDelete({ id: expenseId, ...expense });
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        try {
            const response = await fetch(`https://spcarparkingbknd.onrender.com/expenses/${expenseToDelete.id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete expense');
            }

            await fetchExpenses(); // Refresh the expenses list
            toast.success('Expense deleted successfully');
            setIsDeleteModalOpen(false);
            setExpenseToDelete(null);
        } catch (error) {
            toast.error('Failed to delete expense');
        }
    };

    // 2. Add handler to open edit modal
    const handleEditExpense = (expense) => {
        setEditingExpense(expense);
        setEditExpenseForm({
            amount: expense.amount,
            transactionDate: expense.transactionDate.split('T')[0],
            transactionMode: expense.transactionMode,
            spentBy: expense.spentBy,
            description: expense.description || '',
        });
        setIsEditExpenseOpen(true);
    };

    // 3. Add handler to save edit
    const handleSaveEditExpense = async () => {
        if (!editingExpense) return;
        try {
            const body = {
                amount: editExpenseForm.amount,
                transactionDate: editExpenseForm.transactionDate,
                transactionMode: editExpenseForm.transactionMode,
                spentBy: editExpenseForm.spentBy,
            };
            if (editingExpense.expenseType === 'Miscellaneous') {
                body.description = editExpenseForm.description;
            }
            const response = await fetch(`https://spcarparkingbknd.onrender.com/expenses/${editingExpense._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!response.ok) throw new Error('Failed to update expense');
            await fetchExpenses();
            setIsEditExpenseOpen(false);
            setEditingExpense(null);
            toast.success('Expense updated successfully');
        } catch (error) {
            toast.error('Failed to update expense');
        }
    };

    return (
        <div className={`relative ${isDarkMode ? 'bg-gray-900' : ''}`}>
            <Toaster position="bottom-right" />
            <div className={`min-h-screen p-2 sm:p-6 transition-all duration-300 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg overflow-hidden mb-6`}>
                <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center sm:text-left">
                            Expenses Dashboard
                        </h1>
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <button
                                onClick={() => setIsAddExpenseOpen(true)}
                                className={`w-full sm:w-auto px-4 py-2.5 rounded-lg flex items-center justify-center space-x-2 transition-colors duration-200 shadow-md ${isDarkMode ? 'bg-gray-900 text-yellow-400 hover:bg-gray-800' : 'bg-white text-yellow-600 hover:bg-gray-50'}`}
                            >
                                <Plus className="w-5 h-5" />
                                <span className="font-semibold">Add Expense</span>
                            </button>
                            <button 
                                onClick={() => setIsPdfModalOpen(true)}
                                className={`w-full sm:w-auto px-4 py-2.5 rounded-lg flex items-center justify-center space-x-2 transition-colors duration-200 shadow-md ${isDarkMode ? 'bg-gray-900 text-yellow-400 hover:bg-gray-800' : 'bg-white text-yellow-600 hover:bg-gray-50'}`}
                            >
                                <Printer className="w-5 h-5" />
                                <span className="font-semibold">Export PDF</span>
                            </button>
                        </div>
                    </div>
                    
                    <div className="mt-6 flex flex-col sm:flex-row gap-4">
                        <div className="relative w-full sm:w-48">
                            <select 
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                className={`w-full appearance-none px-4 py-3 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 font-medium shadow-md transition-colors duration-200 ${isDarkMode ? 'bg-gray-900 text-yellow-400 border-gray-700 hover:bg-gray-800' : 'bg-white text-yellow-600 border-gray-200 hover:bg-gray-50'}`}
                            >
                                {monthNames.map((month, index) => (
                                    <option key={index} value={index}>{month}</option>
                                ))}
                            </select>
                            <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
                        </div>
                        <div className="relative w-full sm:w-32">
                            <select 
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className={`w-full appearance-none px-4 py-3 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 font-medium shadow-md transition-colors duration-200 ${isDarkMode ? 'bg-gray-900 text-yellow-400 border-gray-700 hover:bg-gray-800' : 'bg-white text-yellow-600 border-gray-200 hover:bg-gray-50'}`}
                            >
                                {Array.from({ length: 5 }, (_, i) => selectedYear - 2 + i).map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
                        </div>
                    </div>
                </div>
                {/* Stats Cards */}
                <div className="p-4 sm:p-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {isLoading ? (
                        <>
                            <ExpenseStatSkeleton isDarkMode={isDarkMode} />
                            <ExpenseStatSkeleton isDarkMode={isDarkMode} />
                            <ExpenseStatSkeleton isDarkMode={isDarkMode} />
                        </>
                    ) : (
                        <>
                            <div className={`rounded-2xl p-4 sm:p-6 border shadow-md hover:shadow-lg transition-all duration-200 ${isDarkMode ? 'bg-gradient-to-br from-yellow-900 to-yellow-800 border-gray-800' : 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-white'}`}> 
                                <div className="flex items-center space-x-4">
                                    <div className={`p-3 rounded-xl shadow-sm ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}> 
                                        <DollarSign className={`w-6 h-6 ${isDarkMode ? 'text-yellow-300' : 'text-yellow-600'}`} />
                                    </div>
                                    <div>
                                        <p className={`text-sm font-medium ${isDarkMode ? 'text-yellow-200' : 'text-gray-600'}`}>Total Expenses</p>
                                        <p className={`text-lg sm:text-2xl font-bold ${isDarkMode ? 'text-yellow-100' : 'text-gray-900'}`}>{stats.totalExpenses.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                            <div className={`rounded-2xl p-4 sm:p-6 border shadow-md hover:shadow-lg transition-all duration-200 ${isDarkMode ? 'bg-gradient-to-br from-yellow-900 to-yellow-800 border-gray-800' : 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-white'}`}> 
                                <div className="flex items-center space-x-4">
                                    <div className={`p-3 rounded-xl shadow-sm ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}> 
                                        <User className={`w-6 h-6 ${isDarkMode ? 'text-yellow-300' : 'text-yellow-600'}`} />
                                    </div>
                                    <div>
                                        <p className={`text-sm font-medium ${isDarkMode ? 'text-yellow-200' : 'text-gray-600'}`}>Balu's Expenses</p>
                                        <p className={`text-lg sm:text-2xl font-bold ${isDarkMode ? 'text-yellow-100' : 'text-gray-900'}`}>{stats.baluExpenses.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                            <div className={`rounded-2xl p-4 sm:p-6 border shadow-md hover:shadow-lg transition-all duration-200 ${isDarkMode ? 'bg-gradient-to-br from-yellow-900 to-yellow-800 border-gray-800' : 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-white'}`}> 
                                <div className="flex items-center space-x-4">
                                    <div className={`p-3 rounded-xl shadow-sm ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}> 
                                        <User className={`w-6 h-6 ${isDarkMode ? 'text-yellow-300' : 'text-yellow-600'}`} />
                                    </div>
                                    <div>
                                        <p className={`text-sm font-medium ${isDarkMode ? 'text-yellow-200' : 'text-gray-600'}`}>Mani's Expenses</p>
                                        <p className={`text-lg sm:text-2xl font-bold ${isDarkMode ? 'text-yellow-100' : 'text-gray-900'}`}>{stats.maniExpenses.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
            {/* Transaction History section */}
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg overflow-hidden`}>
                <div className="p-4 sm:p-6">
                    <div className="flex flex-col space-y-4">
                        <h2 className={`text-xl font-bold mb-4 text-center sm:text-left ${isDarkMode ? 'text-yellow-100' : 'text-gray-900'}`}>Transaction History</h2>
                        <div className="relative w-full mb-6">
                            <input
                                type="text"
                                placeholder="Search expenses..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 ${isDarkMode ? 'bg-gray-900 text-yellow-200 border-gray-700 placeholder-yellow-400' : 'border-gray-300'}`}
                            />
                            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${isDarkMode ? 'text-yellow-400' : 'text-gray-400'}`} />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <div className="max-w-[1400px] mx-auto">
                            <div className="inline-block min-w-full align-middle">
                                <div className="overflow-hidden">
                                    <table className={`min-w-full divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                                        <thead>
                                            <tr className={isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}>
                                                <th className={`px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold uppercase tracking-wider ${isDarkMode ? 'text-yellow-300' : 'text-gray-600'}`}>S.NO</th>
                                                {[
                                                    { key: 'transactionDate', label: 'Date', shortLabel: 'Date' },
                                                    { key: 'expenseType', label: 'Type', shortLabel: 'Type' },
                                                    { key: 'description', label: 'Description', shortLabel: 'Desc' },
                                                    { key: 'transactionMode', label: 'Mode', shortLabel: 'Mode' },
                                                    { key: 'spentBy', label: 'Spent By', shortLabel: 'By' },
                                                    { key: 'amount', label: 'Amount', shortLabel: 'Amt' },
                                                    { key: 'actions', label: 'Actions', shortLabel: 'Act' }
                                                ].map((column) => (
                                                    <th 
                                                        key={column.key}
                                                        onClick={() => column.key !== 'actions' && handleSort(column.key)}
                                                        className={`px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold uppercase tracking-wider ${isDarkMode ? 'text-yellow-300' : 'text-gray-600'} ${column.key !== 'actions' ? isDarkMode ? 'cursor-pointer hover:bg-gray-800' : 'cursor-pointer hover:bg-gray-100' : ''}`}
                                                    >
                                                        <div className="flex items-center">
                                                            <span className="hidden sm:inline">
                                                                {column.label}
                                                            </span>
                                                            <span className="sm:hidden">
                                                                {column.shortLabel}
                                                            </span>
                                                            {column.key !== 'actions' && (
                                                                sortConfig.key === column.key ? (
                                                                    sortConfig.direction === 'asc' ? 
                                                                        <ArrowUp className="w-4 h-4 ml-1" /> : 
                                                                        <ArrowDown className="w-4 h-4 ml-1" />
                                                                ) : (
                                                                    <ChevronDown className="w-4 h-4 ml-1" />
                                                                )
                                                            )}
                                                        </div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className={`${isDarkMode ? 'bg-gray-900 divide-gray-800' : 'bg-white divide-gray-200'}`}>
                                            {isLoading ? (
                                                Array.from({ length: 10 }).map((_, index) => (
                                                    <ExpenseTableRowSkeleton key={index} isDarkMode={isDarkMode} />
                                                ))
                                            ) : (
                                                filteredData.map((expense, index) => (
                                                    <tr key={expense._id} className={`${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} cursor-pointer`} onClick={e => {
                                                        // Prevent edit modal if delete button is clicked
                                                        if (e.target.closest('button')) return;
                                                        handleEditExpense(expense);
                                                    }}>
                                                        <td className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium ${isDarkMode ? 'text-yellow-100' : 'text-gray-900'}`}>{index + 1}</td>
                                                        <td className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium ${isDarkMode ? 'text-yellow-100' : 'text-gray-900'}`}>{new Date(expense.transactionDate).toLocaleDateString('en-GB')}</td>
                                                        <td className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium ${isDarkMode ? 'text-yellow-100' : 'text-gray-900'}`}>{expense.expenseType}</td>
                                                        <td className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-yellow-300' : 'text-gray-600'}`}>
                                                            <div className="max-w-[150px] sm:max-w-[200px] overflow-hidden text-ellipsis" title={expense.description || '-' }>
                                                                {expense.description ? (
                                                                    expense.description.length > 25 
                                                                        ? `${expense.description.substring(0, 25)}...` 
                                                                        : expense.description
                                                                ) : '-'}
                                                            </div>
                                                        </td>
                                                        <td className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-yellow-300' : 'text-gray-600'}`}>
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                expense.transactionMode === 'UPI' 
                                                                    ? isDarkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800' 
                                                                    : isDarkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800'
                                                            }`}>
                                                                {expense.transactionMode === 'UPI' ? (
                                                                    <>
                                                                        <CreditCard className="w-3 h-3 mr-1" />
                                                                        <span>UPI</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <DollarSign className="w-3 h-3 mr-1" />
                                                                        <span>Cash</span>
                                                                    </>
                                                                )}
                                                            </span>
                                                        </td>
                                                        <td className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-yellow-300' : 'text-gray-600'}`}>
                                                            <div className="flex items-center justify-center gap-1">
                                                                <User className={`w-4 h-4 ${isDarkMode ? 'text-yellow-400' : 'text-gray-400'}`} />
                                                                {expense.spentBy}
                                                            </div>
                                                        </td>
                                                        <td className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium ${isDarkMode ? 'text-yellow-100' : 'text-gray-900'}`}> 
                                                            <div className="w-full text-right font-mono">
                                                                <span className="inline-block w-[100px] text-right text-base">
                                                                    {expense.amount.toFixed(2)}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className={`px-3 sm:px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-yellow-300' : 'text-gray-600'}`}> 
                                                            <div className="flex justify-center">
                                                                <button
                                                                    onClick={e => { e.stopPropagation(); handleDeleteExpense(expense._id, expense); }}
                                                                    className={`transition-colors p-1 rounded-full ${isDarkMode ? 'text-red-400 hover:text-red-300 hover:bg-red-900' : 'text-red-600 hover:text-red-800 hover:bg-red-50'}`}
                                                                    title="Delete expense"
                                                                >
                                                                    <TrashIcon className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Add Expense Modal */}
            <Transition appear show={isAddExpenseOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setIsAddExpenseOpen(false)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className={`fixed inset-0 ${isDarkMode ? 'bg-black/70' : 'bg-black/30'} backdrop-blur-sm z-40`} />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto z-50">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className={`w-full max-w-md transform overflow-hidden rounded-2xl p-4 sm:p-6 text-left align-middle shadow-xl transition-all mx-4 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                                    <div className="flex items-center justify-between mb-6">
                                        <Dialog.Title as="h3" className={`text-xl font-bold ${isDarkMode ? 'text-yellow-100' : 'text-gray-900'}`}>
                                            Add New Expense
                                        </Dialog.Title>
                                        <button
                                            onClick={() => setIsAddExpenseOpen(false)}
                                            className={`transition-colors ${isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-500'}`}
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="space-y-5">
                                        <div>
                                            <label className={`flex items-center text-sm font-medium mb-2 ${isDarkMode ? 'text-yellow-200' : 'text-gray-700'}`}> <ClipboardList className="w-4 h-4 mr-2 text-yellow-500" /> Expense Type </label>
                                            <select
                                                value={newExpense.expenseType}
                                                onChange={(e) => setNewExpense({...newExpense, expenseType: e.target.value})}
                                                className={`w-full px-4 py-2.5 rounded-lg border focus:outline-none transition-all ${isDarkMode ? 'bg-gray-800 text-yellow-200 border-gray-700 focus:border-yellow-600 focus:ring-2 focus:ring-yellow-700' : 'bg-white border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200'}`}
                                            >
                                                <option value="Watchman 1">Watchman 1</option>
                                                <option value="Watchman 2">Watchman 2</option>
                                                <option value="Electricity Bill">Electricity Bill</option>
                                                <option value="Wi-Fi">Wi-Fi</option>
                                                <option value="Sweeper">Sweeper</option>
                                                <option value="Telephone">Telephone</option>
                                                <option value="Water">Water</option>
                                                <option value="Miscellaneous">Miscellaneous</option>
                                            </select>
                                        </div>

                                        {newExpense.expenseType === 'Miscellaneous' && (
                                            <div>
                                                <label className={`flex items-center text-sm font-medium mb-2 ${isDarkMode ? 'text-yellow-200' : 'text-gray-700'}`}> <FileText className="w-4 h-4 mr-2 text-yellow-500" /> Description </label>
                                                <input
                                                    type="text"
                                                    value={newExpense.description}
                                                    onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                                                    className={`w-full px-4 py-2.5 rounded-lg border focus:outline-none transition-all ${isDarkMode ? 'bg-gray-800 text-yellow-200 border-gray-700 placeholder-yellow-400 focus:border-yellow-600 focus:ring-2 focus:ring-yellow-700' : 'bg-white border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200'}`}
                                                    placeholder="Enter expense description"
                                                    required
                                                />
                                            </div>
                                        )}

                                        <div>
                                            <label className={`flex items-center text-sm font-medium mb-2 ${isDarkMode ? 'text-yellow-200' : 'text-gray-700'}`}> <Banknote className="w-4 h-4 mr-2 text-yellow-500" /> Amount </label>
                                            <div className="relative">
                                                <span className={`absolute inset-y-0 left-0 flex items-center pl-3 font-bold ${isDarkMode ? 'text-yellow-400' : 'text-gray-400'}`}>₹</span>
                                                <input
                                                    type="number"
                                                    value={newExpense.amount}
                                                    onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                                                    className={`w-full pl-8 pr-4 py-2.5 rounded-lg border focus:outline-none transition-all ${isDarkMode ? 'bg-gray-800 text-yellow-200 border-gray-700 placeholder-yellow-400 focus:border-yellow-600 focus:ring-2 focus:ring-yellow-700' : 'bg-white border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200'}`}
                                                    placeholder="0.00"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className={`flex items-center text-sm font-medium mb-2 ${isDarkMode ? 'text-yellow-200' : 'text-gray-700'}`}> <Wallet className="w-4 h-4 mr-2 text-yellow-500" /> Transaction Mode </label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setNewExpense({...newExpense, transactionMode: 'Cash'})}
                                                    className={`flex items-center justify-center px-4 py-2.5 rounded-lg border transition-all ${newExpense.transactionMode === 'Cash' ? isDarkMode ? 'bg-yellow-900 border-yellow-600 text-yellow-200' : 'bg-yellow-50 border-yellow-500 text-yellow-700' : isDarkMode ? 'bg-gray-800 border-gray-700 text-yellow-200 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                                >
                                                    <DollarSign className="w-4 h-4 mr-2" /> Cash
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setNewExpense({...newExpense, transactionMode: 'UPI'})}
                                                    className={`flex items-center justify-center px-4 py-2.5 rounded-lg border transition-all ${newExpense.transactionMode === 'UPI' ? isDarkMode ? 'bg-yellow-900 border-yellow-600 text-yellow-200' : 'bg-yellow-50 border-yellow-500 text-yellow-700' : isDarkMode ? 'bg-gray-800 border-gray-700 text-yellow-200 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                                >
                                                    <CreditCard className="w-4 h-4 mr-2" /> UPI
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className={`flex items-center text-sm font-medium mb-2 ${isDarkMode ? 'text-yellow-200' : 'text-gray-700'}`}> <Calendar className="w-4 h-4 mr-2 text-yellow-500" /> Date </label>
                                            <input
                                                type="date"
                                                value={newExpense.transactionDate}
                                                onChange={(e) => setNewExpense({...newExpense, transactionDate: e.target.value})}
                                                className={`w-full px-4 py-2.5 rounded-lg border focus:outline-none transition-all ${isDarkMode ? 'bg-gray-800 text-yellow-200 border-gray-700 focus:border-yellow-600 focus:ring-2 focus:ring-yellow-700' : 'bg-white border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200'}`}
                                            />
                                        </div>

                                        <div>
                                            <label className={`flex items-center text-sm font-medium mb-2 ${isDarkMode ? 'text-yellow-200' : 'text-gray-700'}`}> <Users className="w-4 h-4 mr-2 text-yellow-500" /> Spent By </label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setNewExpense({...newExpense, spentBy: 'Balu'})}
                                                    className={`flex items-center justify-center px-4 py-2.5 rounded-lg border transition-all ${newExpense.spentBy === 'Balu' ? isDarkMode ? 'bg-yellow-900 border-yellow-600 text-yellow-200' : 'bg-yellow-50 border-yellow-500 text-yellow-700' : isDarkMode ? 'bg-gray-800 border-gray-700 text-yellow-200 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                                >
                                                    <User className="w-4 h-4 mr-2" /> Balu
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setNewExpense({...newExpense, spentBy: 'Mani'})}
                                                    className={`flex items-center justify-center px-4 py-2.5 rounded-lg border transition-all ${newExpense.spentBy === 'Mani' ? isDarkMode ? 'bg-yellow-900 border-yellow-600 text-yellow-200' : 'bg-yellow-50 border-yellow-500 text-yellow-700' : isDarkMode ? 'bg-gray-800 border-gray-700 text-yellow-200 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                                >
                                                    <User className="w-4 h-4 mr-2" /> Mani
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8 flex justify-end gap-3">
                                        <button
                                            type="button"
                                            className={`px-4 py-2.5 rounded-lg border font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'border-gray-700 text-yellow-200 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                            onClick={() => setIsAddExpenseOpen(false)}
                                            disabled={isAddingExpense}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            className={`px-6 py-2.5 rounded-lg font-medium transition-all flex items-center disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'bg-yellow-700 text-white hover:bg-yellow-800' : 'bg-yellow-500 text-white hover:bg-yellow-600'}`}
                                            onClick={handleAddExpense}
                                            disabled={isAddingExpense}
                                        >
                                            {isAddingExpense ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                                    Adding...
                                                </>
                                            ) : (
                                                <>
                                                    <Plus className="w-4 h-4 mr-2" />
                                                    Add Expense
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* Delete Confirmation Modal */}
            <Transition appear show={isDeleteModalOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setIsDeleteModalOpen(false)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className={`fixed inset-0 ${isDarkMode ? 'bg-black/70' : 'bg-black/30'} backdrop-blur-sm z-40`} />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto z-50">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className={`w-full max-w-md transform overflow-hidden rounded-2xl p-4 sm:p-6 text-left align-middle shadow-xl transition-all mx-4 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                                    <div className="flex items-center justify-center mb-6">
                                        <div className="bg-red-100 rounded-full p-3">
                                            <AlertCircle className="h-6 w-6 text-red-600" />
                                        </div>
                                    </div>
                                    
                                    <Dialog.Title
                                        as="h3"
                                        className={`text-lg font-bold text-center ${isDarkMode ? 'text-yellow-100' : 'text-gray-900'} mb-4`}
                                    >
                                        Delete Expense
                                    </Dialog.Title>

                                    <div className={`rounded-lg p-4 mb-6 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                                        <div className="space-y-2">
                                            <p className={`text-sm ${isDarkMode ? 'text-yellow-200' : 'text-gray-600'}`}> <span className="font-medium">Type:</span> {expenseToDelete?.expenseType} </p>
                                            {expenseToDelete?.description && (
                                                <p className={`text-sm ${isDarkMode ? 'text-yellow-200' : 'text-gray-600'}`}> <span className="font-medium">Description:</span> {expenseToDelete.description} </p>
                                            )}
                                            <p className={`text-sm ${isDarkMode ? 'text-yellow-200' : 'text-gray-600'}`}> <span className="font-medium">Amount:</span> {expenseToDelete?.amount.toFixed(2)} </p>
                                            <p className={`text-sm ${isDarkMode ? 'text-yellow-200' : 'text-gray-600'}`}> <span className="font-medium">Date:</span> {new Date(expenseToDelete?.transactionDate).toLocaleDateString('en-GB')} </p>
                                            <p className={`text-sm ${isDarkMode ? 'text-yellow-200' : 'text-gray-600'}`}> <span className="font-medium">Spent By:</span> {expenseToDelete?.spentBy} </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row justify-end gap-3">
                                        <button
                                            type="button"
                                            className={`inline-flex justify-center rounded-lg border font-medium transition-all focus:outline-none px-4 py-2 ${isDarkMode ? 'bg-gray-800 text-yellow-200 border-gray-700 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                            onClick={() => setIsDeleteModalOpen(false)}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            className={`inline-flex justify-center rounded-lg border font-medium transition-all focus:outline-none px-4 py-2 ${isDarkMode ? 'bg-red-700 text-white border-transparent hover:bg-red-800' : 'bg-red-600 text-white border-transparent hover:bg-red-700'}`}
                                            onClick={confirmDelete}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* Add the PDF Generation Modal */}
            <Transition appear show={isPdfModalOpen} as={Fragment}>
                <Dialog 
                    as="div" 
                    className="relative z-50" 
                    onClose={() => setIsPdfModalOpen(false)}
                >
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className={`fixed inset-0 ${isDarkMode ? 'bg-black/70' : 'bg-black/30'} backdrop-blur-sm z-40`} />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto z-50">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className={`w-full max-w-md transform overflow-hidden rounded-2xl p-6 text-left align-middle shadow-xl transition-all ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                                    <Dialog.Title
                                        as="h3"
                                        className={`text-lg font-bold ${isDarkMode ? 'text-yellow-100' : 'text-gray-900'} mb-4`}
                                    >
                                        Generate PDF Report
                                    </Dialog.Title>
                                    <div className="space-y-4">
                                        <button
                                            onClick={() => generateFilteredPDF()}
                                            className={`w-full p-4 rounded-lg border transition-colors flex items-center space-x-3 text-left ${isDarkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'}`}
                                        >
                                            <Printer className="w-5 h-5 text-gray-600" />
                                            <div className="text-left">
                                                <p className={`font-medium ${isDarkMode ? 'text-yellow-100' : 'text-gray-900'}`}>Complete Report</p>
                                                <p className={`text-sm ${isDarkMode ? 'text-yellow-200' : 'text-gray-500'}`}>Generate PDF with all expenses</p>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => generateFilteredPDF('Balu')}
                                            className={`w-full p-4 rounded-lg border transition-colors flex items-center space-x-3 text-left ${isDarkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'}`}
                                        >
                                            <User className="w-5 h-5 text-yellow-600" />
                                            <div className="text-left">
                                                <p className={`font-medium ${isDarkMode ? 'text-yellow-100' : 'text-gray-900'}`}>Balu's Expenses</p>
                                                <p className={`text-sm ${isDarkMode ? 'text-yellow-200' : 'text-gray-500'}`}>Generate PDF with Balu's expenses only</p>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => generateFilteredPDF('Mani')}
                                            className={`w-full p-4 rounded-lg border transition-colors flex items-center space-x-3 text-left ${isDarkMode ? 'border-gray-700 hover:bg-gray-800' : 'border-gray-200 hover:bg-gray-50'}`}
                                        >
                                            <User className="w-5 h-5 text-yellow-600" />
                                            <div className="text-left">
                                                <p className={`font-medium ${isDarkMode ? 'text-yellow-100' : 'text-gray-900'}`}>Mani's Expenses</p>
                                                <p className={`text-sm ${isDarkMode ? 'text-yellow-200' : 'text-gray-500'}`}>Generate PDF with Mani's expenses only</p>
                                            </div>
                                        </button>
                                    </div>
                                    <div className="mt-6">
                                        <button
                                            type="button"
                                            className={`w-full inline-flex justify-center rounded-lg border font-medium transition-all focus:outline-none ${isDarkMode ? 'bg-gray-800 text-yellow-200 border-gray-700 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                            onClick={() => setIsPdfModalOpen(false)}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* Edit Expense Modal */}
            <Transition appear show={isEditExpenseOpen} as={Fragment}>
                <Dialog as="div" className="relative z-50" onClose={() => setIsEditExpenseOpen(false)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className={`fixed inset-0 ${isDarkMode ? 'bg-black/70' : 'bg-black/30'} backdrop-blur-sm z-40`} />
                    </Transition.Child>
                    <div className="fixed inset-0 overflow-y-auto z-50">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className={`w-full max-w-md transform overflow-hidden rounded-2xl p-4 sm:p-6 text-left align-middle shadow-xl transition-all mx-4 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                                    <div className="flex items-center justify-between mb-6">
                                        <Dialog.Title as="h3" className={`text-xl font-bold ${isDarkMode ? 'text-yellow-100' : 'text-gray-900'}`}>
                                            Edit Expense
                                        </Dialog.Title>
                                        <button
                                            onClick={() => setIsEditExpenseOpen(false)}
                                            className={`transition-colors ${isDarkMode ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-500'}`}
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                    {editingExpense && (
                                        <div className="space-y-5">
                                            <div className="mb-2">
                                                <div className={`flex items-center text-sm font-medium mb-1 ${isDarkMode ? 'text-yellow-200' : 'text-gray-700'}`}> <ClipboardList className="w-4 h-4 mr-2 text-yellow-500" /> Expense Type </div>
                                                <div className={`px-4 py-2.5 rounded-lg border font-semibold ${isDarkMode ? 'bg-gray-800 text-yellow-200 border-gray-700' : 'bg-gray-50 text-gray-800 border-gray-200'}`}>{editingExpense.expenseType}</div>
                                            </div>
                                            {editingExpense.expenseType === 'Miscellaneous' && (
                                                <div className="mb-2">
                                                    <div className="flex items-center text-sm font-medium mb-1">
                                                        <FileText className="w-4 h-4 mr-2 text-yellow-500" />
                                                        Description
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={editExpenseForm.description ?? editingExpense.description ?? ''}
                                                        onChange={e => setEditExpenseForm({ ...editExpenseForm, description: e.target.value })}
                                                        className={`w-full px-4 py-2.5 rounded-lg border focus:outline-none transition-all ${isDarkMode ? 'bg-gray-800 text-yellow-200 border-gray-700 focus:border-yellow-600 focus:ring-2 focus:ring-yellow-700' : 'bg-white border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200'}`}
                                                        placeholder="Enter expense description"
                                                    />
                                                </div>
                                            )}
                                            <div>
                                                <label className={`flex items-center text-sm font-medium mb-2 ${isDarkMode ? 'text-yellow-200' : 'text-gray-700'}`}> <Banknote className="w-4 h-4 mr-2 text-yellow-500" /> Amount </label>
                                                <div className="relative">
                                                    <span className={`absolute inset-y-0 left-0 flex items-center pl-3 font-bold ${isDarkMode ? 'text-yellow-400' : 'text-gray-400'}`}>₹</span>
                                                    <input
                                                        type="number"
                                                        value={editExpenseForm.amount}
                                                        onChange={e => setEditExpenseForm({ ...editExpenseForm, amount: e.target.value })}
                                                        className={`w-full pl-8 pr-4 py-2.5 rounded-lg border focus:outline-none transition-all ${isDarkMode ? 'bg-gray-800 text-yellow-200 border-gray-700 focus:border-yellow-600 focus:ring-2 focus:ring-yellow-700' : 'bg-white border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200'}`}
                                                        placeholder="0.00"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className={`flex items-center text-sm font-medium mb-2 ${isDarkMode ? 'text-yellow-200' : 'text-gray-700'}`}> <Wallet className="w-4 h-4 mr-2 text-yellow-500" /> Transaction Mode </label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditExpenseForm({ ...editExpenseForm, transactionMode: 'Cash' })}
                                                        className={`flex items-center justify-center px-4 py-2.5 rounded-lg border transition-all ${editExpenseForm.transactionMode === 'Cash' ? isDarkMode ? 'bg-yellow-900 border-yellow-600 text-yellow-200' : 'bg-yellow-50 border-yellow-500 text-yellow-700' : isDarkMode ? 'bg-gray-800 border-gray-700 text-yellow-200 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                                    >
                                                        <DollarSign className="w-4 h-4 mr-2" /> Cash
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditExpenseForm({ ...editExpenseForm, transactionMode: 'UPI' })}
                                                        className={`flex items-center justify-center px-4 py-2.5 rounded-lg border transition-all ${editExpenseForm.transactionMode === 'UPI' ? isDarkMode ? 'bg-yellow-900 border-yellow-600 text-yellow-200' : 'bg-yellow-50 border-yellow-500 text-yellow-700' : isDarkMode ? 'bg-gray-800 border-gray-700 text-yellow-200 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                                    >
                                                        <CreditCard className="w-4 h-4 mr-2" /> UPI
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <label className={`flex items-center text-sm font-medium mb-2 ${isDarkMode ? 'text-yellow-200' : 'text-gray-700'}`}> <Calendar className="w-4 h-4 mr-2 text-yellow-500" /> Date </label>
                                                <input
                                                    type="date"
                                                    value={editExpenseForm.transactionDate}
                                                    onChange={e => setEditExpenseForm({ ...editExpenseForm, transactionDate: e.target.value })}
                                                    className={`w-full px-4 py-2.5 rounded-lg border focus:outline-none transition-all ${isDarkMode ? 'bg-gray-800 text-yellow-200 border-gray-700 focus:border-yellow-600 focus:ring-2 focus:ring-yellow-700' : 'bg-white border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200'}`}
                                                />
                                            </div>
                                            <div>
                                                <label className={`flex items-center text-sm font-medium mb-2 ${isDarkMode ? 'text-yellow-200' : 'text-gray-700'}`}> <Users className="w-4 h-4 mr-2 text-yellow-500" /> Spent By </label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditExpenseForm({ ...editExpenseForm, spentBy: 'Balu' })}
                                                        className={`flex items-center justify-center px-4 py-2.5 rounded-lg border transition-all ${editExpenseForm.spentBy === 'Balu' ? isDarkMode ? 'bg-yellow-900 border-yellow-600 text-yellow-200' : 'bg-yellow-50 border-yellow-500 text-yellow-700' : isDarkMode ? 'bg-gray-800 border-gray-700 text-yellow-200 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                                    >
                                                        <User className="w-4 h-4 mr-2" /> Balu
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditExpenseForm({ ...editExpenseForm, spentBy: 'Mani' })}
                                                        className={`flex items-center justify-center px-4 py-2.5 rounded-lg border transition-all ${editExpenseForm.spentBy === 'Mani' ? isDarkMode ? 'bg-yellow-900 border-yellow-600 text-yellow-200' : 'bg-yellow-50 border-yellow-500 text-yellow-700' : isDarkMode ? 'bg-gray-800 border-gray-700 text-yellow-200 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                                    >
                                                        <User className="w-4 h-4 mr-2" /> Mani
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="mt-8 flex justify-end gap-3">
                                        <button
                                            type="button"
                                            className={`px-4 py-2.5 rounded-lg border font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'border-gray-700 text-yellow-200 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                            onClick={() => setIsEditExpenseOpen(false)}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            className={`px-6 py-2.5 rounded-lg font-medium transition-all flex items-center disabled:opacity-50 disabled:cursor-not-allowed ${isDarkMode ? 'bg-yellow-700 text-white hover:bg-yellow-800' : 'bg-yellow-500 text-white hover:bg-yellow-600'}`}
                                            onClick={handleSaveEditExpense}
                                        >
                                            Save
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
                </div>
            </div>
        </div>
    );
}

export default ExpensesDashboard; 