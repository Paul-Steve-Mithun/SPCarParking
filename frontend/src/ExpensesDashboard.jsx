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

export function ExpensesDashboard() {
    const [expenses, setExpenses] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [expenseToDelete, setExpenseToDelete] = useState(null);
    const [isAddingExpense, setIsAddingExpense] = useState(false);
    const [newExpense, setNewExpense] = useState({
        expenseType: 'Watchman Night',
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
        direction: 'asc' 
    });
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

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
                expenseType: 'Watchman Night',
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
                    amount: `INR ${record.amount.toFixed(2)}`
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
                amount: { cellWidth: columnWidths.amount, halign: 'right' }
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
            didDrawCell: function(data) {
                // Add totals after the last row
                if (data.row.index === sortedTableRows.length - 1 && data.column.index === 0) {
                    const finalY = data.cell.y + data.cell.height + 10;
                    
                    // Set bold font for totals
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(10);
                    doc.setTextColor(0, 0, 0);

                    // Calculate positions
                    const boxWidth = 70; // Width of the box
                    const boxHeight = 10; // Height of each box
                    const boxX = pageWidth - leftMargin - boxWidth; // Box starting from right
                    const textPadding = 5; // Padding inside the box
                    const lineSpacing = 10; // Spacing between lines

                    // Function to draw a box with text
                    const drawTotalBox = (y, label, amount, isGrandTotal = false) => {
                        // Draw box
                        doc.setDrawColor(200, 200, 200);
                        doc.setFillColor(isGrandTotal ? 246 : 255, isGrandTotal ? 246 : 255, isGrandTotal ? 252 : 255);
                        doc.setLineWidth(0.1);
                        doc.roundedRect(boxX, y - boxHeight + 5, boxWidth, boxHeight, 1, 1, 'FD');

                        // Draw text
                        doc.setFontSize(isGrandTotal ? 11 : 10);
                        
                        // Calculate text positions for better alignment
                        const labelX = boxX + textPadding;
                        const amountX = boxX + boxWidth - textPadding;
                        
                        // Draw label and amount with reduced space between them
                        doc.text(label, labelX, y);
                        doc.text(amount, amountX, y, { align: 'right' });
                    };

                    if (!filterBy) {
                        // Calculate individual expenses
                        const baluExpenses = filteredData
                            .filter(record => record.spentBy === 'Balu')
                            .reduce((sum, record) => sum + record.amount, 0);

                        const maniExpenses = filteredData
                            .filter(record => record.spentBy === 'Mani')
                            .reduce((sum, record) => sum + record.amount, 0);

                        // Draw Balu's Expenses box
                        drawTotalBox(
                            finalY, 
                            'Balu\'s Expenses:', 
                            `INR ${baluExpenses.toFixed(2)}`
                        );

                        // Draw Mani's Expenses box
                        drawTotalBox(
                            finalY + lineSpacing, 
                            'Mani\'s Expenses:', 
                            `INR ${maniExpenses.toFixed(2)}`
                        );

                        // Draw Grand Total box
                        drawTotalBox(
                            finalY + (lineSpacing * 2), 
                            'Grand Total:', 
                            `INR ${filteredStats.totalExpenses.toFixed(2)}`,
                            true
                        );
                    } else {
                        // For filtered reports (Balu's or Mani's), show only grand total
                        drawTotalBox(
                            finalY, 
                            'Total Expenses:', 
                            `INR ${filteredStats.totalExpenses.toFixed(2)}`,
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

    return (
        <div className="relative">
            <Toaster position="bottom-right" />
            <div className="min-h-screen bg-gray-50 p-2 sm:p-6 transition-all duration-300">
                <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
                <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center sm:text-left">
                            Expenses Dashboard
                        </h1>
                        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                            <button
                                onClick={() => setIsAddExpenseOpen(true)}
                                className="w-full sm:w-auto bg-white text-yellow-600 px-4 py-2.5 rounded-lg flex items-center justify-center space-x-2 hover:bg-gray-50 transition-colors duration-200 shadow-md"
                            >
                                <Plus className="w-5 h-5" />
                                <span className="font-semibold">Add Expense</span>
                            </button>
                            <button 
                                onClick={() => setIsPdfModalOpen(true)}
                                className="w-full sm:w-auto bg-white text-yellow-600 px-4 py-2.5 rounded-lg flex items-center justify-center space-x-2 hover:bg-gray-50 transition-colors duration-200 shadow-md"
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
                                className="w-full appearance-none bg-white bg-opacity-20 text-indigo-900 px-4 py-3 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 font-medium"                            >
                                {monthNames.map((month, index) => (
                                    <option key={index} value={index}>{month}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-black" />
                        </div>
                        <div className="relative w-full sm:w-32">
                            <select 
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="w-full appearance-none bg-white bg-opacity-20 text-indigo-900 px-4 py-3 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 font-medium"                            >
                                {Array.from({ length: 5 }, (_, i) => selectedYear - 2 + i).map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-black" />
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="p-4 sm:p-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-2xl p-4 sm:p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 border border-white shadow-md hover:shadow-lg transition-all duration-200">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 rounded-xl bg-white shadow-sm">
                                <DollarSign className="w-6 h-6 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Total Expenses</p>
                                <p className="text-lg sm:text-2xl font-bold text-gray-900">₹{stats.totalExpenses.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-2xl p-4 sm:p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 border border-white shadow-md hover:shadow-lg transition-all duration-200">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 rounded-xl bg-white shadow-sm">
                                <User className="w-6 h-6 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Balu's Expenses</p>
                                <p className="text-lg sm:text-2xl font-bold text-gray-900">₹{stats.baluExpenses.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-2xl p-4 sm:p-6 bg-gradient-to-br from-yellow-50 to-yellow-100 border border-white shadow-md hover:shadow-lg transition-all duration-200">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 rounded-xl bg-white shadow-sm">
                                <User className="w-6 h-6 text-yellow-600" />
                            </div>
                            <div>
                                <p className="text-gray-600 text-sm font-medium">Mani's Expenses</p>
                                <p className="text-lg sm:text-2xl font-bold text-gray-900">₹{stats.maniExpenses.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transaction History section */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="p-4 sm:p-6">
                    <div className="flex flex-col space-y-4">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 text-center sm:text-left">
                            Transaction History
                        </h2>
                        <div className="relative w-full mb-6">
                            <input
                                type="text"
                                placeholder="Search expenses..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                            />
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <div className="max-w-[1400px] mx-auto">
                            <div className="inline-block min-w-full align-middle">
                                <div className="overflow-hidden">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    S.NO
                                                </th>
                                                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Date
                                                </th>
                                                {[
                                                    { key: 'expenseType', label: 'Type' },
                                                    { key: 'description', label: 'Description' },
                                                    { key: 'transactionMode', label: 'Mode' },
                                                    { key: 'spentBy', label: 'Spent By' },
                                                    { key: 'amount', label: 'Amount' },
                                                    { key: 'actions', label: 'Actions' }
                                                ].map((column) => (
                                                    <th 
                                                        key={column.key}
                                                        onClick={() => column.key !== 'actions' && handleSort(column.key)}
                                                        className={`px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.key !== 'actions' ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                                                    >
                                                        <div className="flex items-center">
                                                            {column.label}
                                                            {column.key !== 'actions' && <SortIcon column={column.key} />}
                                                        </div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {filteredData.map((expense, index) => (
                                                <tr key={expense._id} className="hover:bg-gray-50">
                                                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {index + 1}
                                                    </td>
                                                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {new Date(expense.transactionDate).toLocaleDateString('en-GB')}
                                                    </td>
                                                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        {expense.expenseType}
                                                    </td>
                                                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {expense.description || '-'}
                                                    </td>
                                                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                            expense.transactionMode === 'UPI' 
                                                                ? 'bg-blue-100 text-blue-800' 
                                                                : 'bg-green-100 text-green-800'
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
                                                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        <div className="flex items-center gap-1">
                                                            <User className="w-4 h-4 text-gray-400" />
                                                            {expense.spentBy}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        ₹{expense.amount.toFixed(2)}
                                                    </td>
                                                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        <button
                                                            onClick={() => handleDeleteExpense(expense._id, expense)}
                                                            className="text-red-600 hover:text-red-800 transition-colors p-1 rounded-full hover:bg-red-50"
                                                            title="Delete expense"
                                                        >
                                                            <TrashIcon className="w-5 h-5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
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
                <Dialog as="div" className="relative z-10" onClose={() => setIsAddExpenseOpen(false)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
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
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-4 sm:p-6 text-left align-middle shadow-xl transition-all mx-4">
                                    <div className="flex items-center justify-between mb-6">
                                        <Dialog.Title as="h3" className="text-xl font-bold text-gray-900">
                                            Add New Expense
                                        </Dialog.Title>
                                        <button
                                            onClick={() => setIsAddExpenseOpen(false)}
                                            className="text-gray-400 hover:text-gray-500 transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div className="space-y-5">
                                        <div>
                                            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                                <ClipboardList className="w-4 h-4 mr-2 text-yellow-500" />
                                                Expense Type
                                            </label>
                                            <select
                                                value={newExpense.expenseType}
                                                onChange={(e) => setNewExpense({...newExpense, expenseType: e.target.value})}
                                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all"
                                            >
                                                <option value="Watchman Night">Watchman Night</option>
                                                <option value="Watchman Day">Watchman Day</option>
                                                <option value="Electricity Bill">Electricity Bill</option>
                                                <option value="Wi-Fi">Wi-Fi</option>
                                                <option value="Sweeper">Sweeper</option>
                                                <option value="Telephone">Telephone</option>
                                                <option value="Miscellaneous">Miscellaneous</option>
                                            </select>
                                        </div>

                                        {newExpense.expenseType === 'Miscellaneous' && (
                                            <div>
                                                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                                    <FileText className="w-4 h-4 mr-2 text-yellow-500" />
                                                    Description
                                                </label>
                                                <input
                                                    type="text"
                                                    value={newExpense.description}
                                                    onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all"
                                                    placeholder="Enter expense description"
                                                    required
                                                />
                                            </div>
                                        )}

                                        <div>
                                            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                                <Banknote className="w-4 h-4 mr-2 text-yellow-500" />
                                                Amount
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                                                <input
                                                    type="number"
                                                    value={newExpense.amount}
                                                    onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                                                    className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all"
                                                    placeholder="0.00"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                                <Wallet className="w-4 h-4 mr-2 text-yellow-500" />
                                                Transaction Mode
                                            </label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setNewExpense({...newExpense, transactionMode: 'Cash'})}
                                                    className={`flex items-center justify-center px-4 py-2.5 rounded-lg border ${
                                                        newExpense.transactionMode === 'Cash'
                                                            ? 'bg-yellow-50 border-yellow-500 text-yellow-700'
                                                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                                    } transition-all`}
                                                >
                                                    <DollarSign className="w-4 h-4 mr-2" />
                                                    Cash
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setNewExpense({...newExpense, transactionMode: 'UPI'})}
                                                    className={`flex items-center justify-center px-4 py-2.5 rounded-lg border ${
                                                        newExpense.transactionMode === 'UPI'
                                                            ? 'bg-yellow-50 border-yellow-500 text-yellow-700'
                                                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                                    } transition-all`}
                                                >
                                                    <CreditCard className="w-4 h-4 mr-2" />
                                                    UPI
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                                <Calendar className="w-4 h-4 mr-2 text-yellow-500" />
                                                Date
                                            </label>
                                            <input
                                                type="date"
                                                value={newExpense.transactionDate}
                                                onChange={(e) => setNewExpense({...newExpense, transactionDate: e.target.value})}
                                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 transition-all"
                                            />
                                        </div>

                                        <div>
                                            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                                <Users className="w-4 h-4 mr-2 text-yellow-500" />
                                                Spent By
                                            </label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setNewExpense({...newExpense, spentBy: 'Balu'})}
                                                    className={`flex items-center justify-center px-4 py-2.5 rounded-lg border ${
                                                        newExpense.spentBy === 'Balu'
                                                            ? 'bg-yellow-50 border-yellow-500 text-yellow-700'
                                                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                                    } transition-all`}
                                                >
                                                    <User className="w-4 h-4 mr-2" />
                                                    Balu
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setNewExpense({...newExpense, spentBy: 'Mani'})}
                                                    className={`flex items-center justify-center px-4 py-2.5 rounded-lg border ${
                                                        newExpense.spentBy === 'Mani'
                                                            ? 'bg-yellow-50 border-yellow-500 text-yellow-700'
                                                            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                                                    } transition-all`}
                                                >
                                                    <User className="w-4 h-4 mr-2" />
                                                    Mani
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8 flex justify-end gap-3">
                                        <button
                                            type="button"
                                            className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            onClick={() => setIsAddExpenseOpen(false)}
                                            disabled={isAddingExpense}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            className="px-6 py-2.5 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600 font-medium transition-all flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
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
                <Dialog as="div" className="relative z-10" onClose={() => setIsDeleteModalOpen(false)}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
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
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-4 sm:p-6 text-left align-middle shadow-xl transition-all mx-4">
                                    <div className="flex items-center justify-center mb-6">
                                        <div className="bg-red-100 rounded-full p-3">
                                            <AlertCircle className="h-6 w-6 text-red-600" />
                                        </div>
                                    </div>
                                    
                                    <Dialog.Title
                                        as="h3"
                                        className="text-lg font-bold text-center text-gray-900 mb-4"
                                    >
                                        Delete Expense
                                    </Dialog.Title>

                                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                                        <div className="space-y-2">
                                            <p className="text-sm text-gray-600">
                                                <span className="font-medium">Type:</span> {expenseToDelete?.expenseType}
                                            </p>
                                            {expenseToDelete?.description && (
                                                <p className="text-sm text-gray-600">
                                                    <span className="font-medium">Description:</span> {expenseToDelete.description}
                                                </p>
                                            )}
                                            <p className="text-sm text-gray-600">
                                                <span className="font-medium">Amount:</span> ₹{expenseToDelete?.amount.toFixed(2)}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                <span className="font-medium">Date:</span> {new Date(expenseToDelete?.transactionDate).toLocaleDateString('en-GB')}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                <span className="font-medium">Spent By:</span> {expenseToDelete?.spentBy}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row justify-end gap-3">
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                                            onClick={() => setIsDeleteModalOpen(false)}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-lg border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none"
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
                    className="relative z-10" 
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
                        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
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
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                    <Dialog.Title
                                        as="h3"
                                        className="text-lg font-bold text-gray-900 mb-4"
                                    >
                                        Generate PDF Report
                                    </Dialog.Title>
                                    <div className="space-y-4">
                                        <button
                                            onClick={() => generateFilteredPDF()}
                                            className="w-full p-4 text-left rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors flex items-center space-x-3"
                                        >
                                            <Printer className="w-5 h-5 text-gray-600" />
                                            <div>
                                                <p className="font-medium text-gray-900">Complete Report</p>
                                                <p className="text-sm text-gray-500">Generate PDF with all expenses</p>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => generateFilteredPDF('Balu')}
                                            className="w-full p-4 text-left rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors flex items-center space-x-3"
                                        >
                                            <User className="w-5 h-5 text-yellow-600" />
                                            <div>
                                                <p className="font-medium text-gray-900">Balu's Expenses</p>
                                                <p className="text-sm text-gray-500">Generate PDF with Balu's expenses only</p>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => generateFilteredPDF('Mani')}
                                            className="w-full p-4 text-left rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors flex items-center space-x-3"
                                        >
                                            <User className="w-5 h-5 text-yellow-600" />
                                            <div>
                                                <p className="font-medium text-gray-900">Mani's Expenses</p>
                                                <p className="text-sm text-gray-500">Generate PDF with Mani's expenses only</p>
                                            </div>
                                        </button>
                                    </div>
                                    <div className="mt-6">
                                        <button
                                            type="button"
                                            className="w-full inline-flex justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
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
                </div>
            </div>
        </div>
    );
}

export default ExpensesDashboard; 