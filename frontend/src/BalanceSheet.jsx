import { useEffect, useState } from 'react';
import { 
    DollarSign, 
    Calendar,
    ChevronDown,
    ArrowUp,
    ArrowDown,
    Wallet,
    Receipt,
    IndianRupee,
    Download,
    X,
    ArrowRight
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export function BalanceSheet() {
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [takeHomeAmount, setTakeHomeAmount] = useState('');
    const [balanceData, setBalanceData] = useState({
        balu: {
            revenue: 0,
            expenses: 0,
            netProfit: 0,
            previousMonthTakeHome: 0,
            thisMonthTakeHome: 0
        },
        mani: {
            revenue: 0,
            expenses: 0,
            netProfit: 0,
            previousMonthTakeHome: 0,
            thisMonthTakeHome: 0
        }
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [transferFrom, setTransferFrom] = useState('Balu');
    const [transferTo, setTransferTo] = useState('Mani');
    const [transferAmount, setTransferAmount] = useState('');

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June', 
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    useEffect(() => {
        fetchBalanceData();
    }, [selectedMonth, selectedYear]);

    const fetchBalanceData = async () => {
        try {
            const [revenueRes, expensesRes, balanceSheetRes] = await Promise.all([
                fetch(`https://spcarparkingbknd.onrender.com/revenue?month=${selectedMonth}&year=${selectedYear}`),
                fetch(`https://spcarparkingbknd.onrender.com/expenses?month=${selectedMonth}&year=${selectedYear}`),
                fetch(`https://spcarparkingbknd.onrender.com/balancesheet?month=${selectedMonth}&year=${selectedYear}`)
            ]);

            const revenueData = await revenueRes.json();
            const expensesData = await expensesRes.json();
            const balanceSheetData = await balanceSheetRes.json();

            // Calculate totals for Balu
            const baluRevenue = revenueData
                .filter(record => record.receivedBy === 'Balu')
                .reduce((sum, record) => sum + (record.revenueAmount || 0), 0);

            const baluExpenses = expensesData
                .filter(record => record.spentBy === 'Balu')
                .reduce((sum, record) => sum + (record.amount || 0), 0);

            // Calculate totals for Mani
            const maniRevenue = revenueData
                .filter(record => record.receivedBy === 'Mani')
                .reduce((sum, record) => sum + (record.revenueAmount || 0), 0);

            const maniExpenses = expensesData
                .filter(record => record.spentBy === 'Mani')
                .reduce((sum, record) => sum + (record.amount || 0), 0);

            // Calculate transfer amounts for this month
            const baluTransfers = balanceSheetData
                .filter(record => record.userName === 'Balu' && record.type === 'transfer')
                .reduce((sum, record) => sum + (record.amount || 0), 0);
            const maniTransfers = balanceSheetData
                .filter(record => record.userName === 'Mani' && record.type === 'transfer')
                .reduce((sum, record) => sum + (record.amount || 0), 0);

            // Calculate previous month's take home for each user (still use previous month for this)
            const prevMonth = selectedMonth - 1 < 0 ? 11 : selectedMonth - 1;
            const prevYear = selectedMonth - 1 < 0 ? selectedYear - 1 : selectedYear;
            const prevBalanceSheetRes = await fetch(`https://spcarparkingbknd.onrender.com/balancesheet?month=${prevMonth}&year=${prevYear}`);
            const prevBalanceSheetData = await prevBalanceSheetRes.json();
            const baluPreviousMonthTakeHome = prevBalanceSheetData
                .filter(record => record.userName === 'Balu' && (record.type === undefined || record.type === 'normal'))
                .reduce((sum, record) => sum + (record.amount || 0), 0);
            const maniPreviousMonthTakeHome = prevBalanceSheetData
                .filter(record => record.userName === 'Mani' && (record.type === undefined || record.type === 'normal'))
                .reduce((sum, record) => sum + (record.amount || 0), 0);

            // Calculate net profit for each user (without advances)
            const baluNetProfit = baluRevenue - baluExpenses;
            const maniNetProfit = maniRevenue - maniExpenses;

            // Calculate this month's total take home
            const baluThisMonthTakeHome = baluPreviousMonthTakeHome + baluNetProfit + baluTransfers;
            const maniThisMonthTakeHome = maniPreviousMonthTakeHome + maniNetProfit + maniTransfers;

            setBalanceData({
                balu: {
                    revenue: baluRevenue,
                    expenses: baluExpenses,
                    netProfit: baluNetProfit,
                    previousMonthTakeHome: baluPreviousMonthTakeHome,
                    thisMonthTakeHome: baluThisMonthTakeHome,
                    transfers: balanceSheetData.filter(record => record.userName === 'Balu' && record.type === 'transfer')
                },
                mani: {
                    revenue: maniRevenue,
                    expenses: maniExpenses,
                    netProfit: maniNetProfit,
                    previousMonthTakeHome: maniPreviousMonthTakeHome,
                    thisMonthTakeHome: maniThisMonthTakeHome,
                    transfers: balanceSheetData.filter(record => record.userName === 'Mani' && record.type === 'transfer')
                }
            });
        } catch (error) {
            toast.error('Failed to fetch balance data');
            console.error('Error fetching balance data:', error);
        }
    };

    const handleTakeHome = async (user) => {
        setSelectedUser(user);
        setTakeHomeAmount('');  // Start with empty input
        setIsModalOpen(true);
    };

    const handleSubmitTakeHome = async () => {
        if (!takeHomeAmount) return;
        
        setIsLoading(true);
        try {
            // Check if a record exists for this month and user
            const checkResponse = await fetch(`https://spcarparkingbknd.onrender.com/balancesheet?month=${selectedMonth}&year=${selectedYear}`);
            const existingRecords = await checkResponse.json();
            
            const existingRecord = existingRecords.find(
                record => record.userName === selectedUser && 
                record.month === selectedMonth && 
                record.year === selectedYear &&
                (record.type === undefined || record.type === 'normal')
            );

            const endpoint = existingRecord 
                ? `https://spcarparkingbknd.onrender.com/balancesheet/${existingRecord._id}`
                : 'https://spcarparkingbknd.onrender.com/balancesheet';

            const method = existingRecord ? 'PUT' : 'POST';

            const response = await fetch(endpoint, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userName: selectedUser,
                    amount: parseFloat(takeHomeAmount),
                    date: new Date(),
                    month: selectedMonth,
                    year: selectedYear,
                    type: 'normal'
                }),
            });

            if (!response.ok) throw new Error('Failed to record Withdraw amount');

            toast.success(`Successfully updated Withdraw amount for ${selectedUser}`);
            setIsModalOpen(false);
            setTakeHomeAmount('');
            await fetchBalanceData();
        } catch (error) {
            toast.error(`Failed to update Withdraw amount for ${selectedUser}`);
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const generateDetailedPDF = async (user) => {
        setIsLoading(true);
        try {
            // Fetch revenue and expense data
            const [revenueRes, expensesRes, balanceSheetRes] = await Promise.all([
                fetch(`https://spcarparkingbknd.onrender.com/revenue?month=${selectedMonth}&year=${selectedYear}`),
                fetch(`https://spcarparkingbknd.onrender.com/expenses?month=${selectedMonth}&year=${selectedYear}`),
                fetch(`https://spcarparkingbknd.onrender.com/balancesheet?month=${selectedMonth}&year=${selectedYear}`)
            ]);

            const revenueData = await revenueRes.json();
            const expensesData = await expensesRes.json();
            const balanceSheetData = await balanceSheetRes.json();

            // Filter data for the specific user
            const userRevenue = revenueData.filter(record => record.receivedBy === user);
            const userExpenses = expensesData.filter(record => record.spentBy === user);
            const userTransfers = balanceSheetData.filter(record => record.userName === user && record.type === 'transfer');

            // Filter out transactions with zero/null amounts and prepare data
            const combinedTransactions = [
                ...userRevenue
                    .filter(rev => rev.revenueAmount && rev.revenueAmount !== 0 && rev.revenueAmount !== 0.00)
                    .map(rev => ({
                        ...rev,
                        type: 'revenue',
                        date: new Date(rev.transactionDate)
                    })),
                ...userExpenses
                    .filter(exp => exp.amount && exp.amount !== 0 && exp.amount !== 0.00)
                    .map(exp => ({
                        ...exp,
                        type: 'expense',
                        date: new Date(exp.transactionDate)
                    })),
                ...userTransfers
                    .map(tr => ({
                        ...tr,
                        type: 'transfer',
                        date: new Date(tr.date)
                    }))
            ].sort((a, b) => a.date - b.date);

            const doc = new jsPDF('landscape');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            // Header styling
            doc.setFillColor(79, 70, 229);
            doc.rect(0, 0, pageWidth, 35, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(24);
            doc.setFont('helvetica', 'bold');
            doc.text('SP CAR PARKING', pageWidth / 2, 18, { align: 'center' });
            
            doc.setFontSize(14);
            const today = new Date();
            const formattedDate = today.toLocaleDateString('en-gb', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            const titleText = `${user}'s Transaction Statement - ${monthNames[selectedMonth]} ${selectedYear} (Generated: ${formattedDate})`;
            doc.text(titleText, pageWidth / 2, 28, { align: 'center' });

            // Updated column definitions with removed person column
            const columnWidths = {
                sno: 15,
                date: 25,
                type: 50,
                description: 55,
                mode: 25,
                expense: 35,
                revenue: 35
            };

            const totalTableWidth = Object.values(columnWidths).reduce((sum, width) => sum + width, 0);
            const leftMargin = (pageWidth - totalTableWidth) / 2;

            // Format date function
            const formatDateForPDF = (date) => {
                return date.toLocaleDateString('en-gb', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
            };

            // Update the formatAmount function - remove the font setting
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

            // Updated table data preparation with brought forward as first row
            const tableRows = [
                {
                    sno: "1",
                    date: `01/${(selectedMonth + 1).toString().padStart(2, '0')}/${selectedYear}`,
                    type: "-",
                    description: `${monthNames[(selectedMonth - 1 + 12) % 12].toUpperCase()} BROUGHT FORWARD`,
                    mode: "-",
                    expense: "-",
                    revenue: { 
                        content: formatAmount(balanceData[user.toLowerCase()].previousMonthTakeHome),
                        styles: { fontStyle: 'bold' }
                    }
                },
                ...combinedTransactions.map((record, index) => ({
                    sno: (index + 2).toString(),
                    date: formatDateForPDF(record.date),
                    type: record.type === 'revenue' ? (record.vehicleNumber || 'N/A') : (record.type === 'expense' ? record.expenseType : 'Transfer'),
                    description: record.type === 'revenue' 
                        ? (record.vehicleDescription || '-').toUpperCase() 
                        : (record.type === 'expense' 
                            ? (record.description || '-').toUpperCase() 
                            : (record.description || '-').toUpperCase()),
                    mode: record.transactionMode || '-',
                    expense: record.type === 'expense' ? formatAmount(record.amount) : (record.type === 'transfer' && record.amount < 0 ? formatAmount(Math.abs(record.amount)) : '-'),
                    revenue: record.type === 'revenue' ? formatAmount(record.revenueAmount) : (record.type === 'transfer' && record.amount > 0 ? formatAmount(record.amount) : '-')
                }))
            ];

            // Calculate transfer totals for this user
            const transferIn = userTransfers
                .filter(tr => tr.amount > 0)
                .reduce((sum, tr) => sum + tr.amount, 0);
            const transferOut = userTransfers
                .filter(tr => tr.amount < 0)
                .reduce((sum, tr) => sum + Math.abs(tr.amount), 0);

            const totalExpense = userExpenses.reduce((sum, exp) => sum + exp.amount, 0) + transferOut;
            const totalRevenue = userRevenue.reduce((sum, rev) => sum + rev.revenueAmount, 0) + 
                               balanceData[user.toLowerCase()].previousMonthTakeHome + transferIn;
            const cashInHand = totalRevenue - totalExpense;

            let isLastCellProcessed = false;

            // Add variables to track pages and overflow status
            let totalPages = 1;
            let hasStatsOverflow = false;
            let lastTablePage = 1;
            let pageNumbers = [];  // Store page numbers for later

            doc.autoTable({
                startY: 45,
                head: [[
                    { content: 'S.No', styles: { halign: 'center' } },
                    { content: 'Date', styles: { halign: 'center' } },
                    { content: 'Vehicle/Expense', styles: { halign: 'center' } },
                    { content: 'Description', styles: { halign: 'center' } },
                    { content: 'Mode', styles: { halign: 'center' } },
                    { content: 'Expense', styles: { halign: 'center' } },
                    { content: 'Revenue', styles: { halign: 'center' } }
                ]],
                body: tableRows,
                columns: [
                    { header: 'S.No', dataKey: 'sno' },
                    { header: 'Date', dataKey: 'date' },
                    { header: 'Vehicle/Expense', dataKey: 'type' },
                    { header: 'Description', dataKey: 'description' },
                    { header: 'Mode', dataKey: 'mode' },
                    { header: 'Expense', dataKey: 'expense' },
                    { header: 'Revenue', dataKey: 'revenue' }
                ],
                theme: 'grid',
                headStyles: {
                    fillColor: [79, 70, 229],
                    textColor: [255, 255, 255],
                    fontSize: 11,
                    fontStyle: 'bold',
                    cellPadding: 3,
                    lineWidth: 0.1
                },
                columnStyles: {
                    sno: { cellWidth: columnWidths.sno, halign: 'center' },
                    date: { cellWidth: columnWidths.date, halign: 'center' },
                    type: { cellWidth: columnWidths.type, halign: 'center' },
                    description: { cellWidth: columnWidths.description, halign: 'left' },
                    mode: { cellWidth: columnWidths.mode, halign: 'center' },
                    expense: { cellWidth: columnWidths.expense, halign: 'right' },
                    revenue: { cellWidth: columnWidths.revenue, halign: 'right' }
                },
                margin: { left: leftMargin },
                didDrawPage: function(data) {
                    // Store current page info for later
                    pageNumbers.push({
                        pageNumber: doc.internal.getCurrentPageInfo().pageNumber,
                        y: pageHeight - 10
                    });
                },
                didParseCell: function(data) {
                    // For amount columns, use monospace font and bold style
                    if (data.column.dataKey === 'expense' || data.column.dataKey === 'revenue') {
                        data.cell.styles.font = 'courier';
                        data.cell.styles.fontStyle = 'bold';  // Make all amounts bold
                        
                        // Handle different data types
                        if (data.cell.raw !== '-') {
                            let amount;
                            if (typeof data.cell.raw === 'object' && data.cell.raw.content) {
                                // Handle object format (like the first row revenue)
                                amount = parseFloat(data.cell.raw.content.replace('INR', '').trim());
                            } else if (typeof data.cell.raw === 'string') {
                                // Handle string format
                                amount = parseFloat(data.cell.raw.replace('INR', '').trim());
                            } else if (typeof data.cell.raw === 'number') {
                                // Handle number format
                                amount = data.cell.raw;
                            }

                            if (!isNaN(amount)) {
                                data.cell.text = [formatAmount(amount)];
                            }
                        }
                    }

                    // Set flag when we reach the last cell
                    if (data.row.index === tableRows.length - 1 && data.column.index === 6) {
                        isLastCellProcessed = true;
                    }
                },
                didDrawCell: function(data) {
                    if (data.row.index === tableRows.length - 1 && data.column.index === 6) {
                        let finalY = data.cell.y + data.cell.height + 10;
                        const requiredHeight = 50;
                        
                        if (pageHeight - finalY < requiredHeight) {
                            hasStatsOverflow = true;
                            lastTablePage = doc.internal.getCurrentPageInfo().pageNumber;
                            doc.addPage();
                            finalY = 40;
                            totalPages = doc.internal.getNumberOfPages();
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

                        // Calculate column positions with right alignment
                        const totalWidth = columnWidths.description + columnWidths.mode + columnWidths.expense + columnWidths.revenue;
                        const descriptionWidth = totalWidth * 0.4;
                        const rightMargin = leftMargin + columnWidths.sno + columnWidths.date + columnWidths.type + 
                                          columnWidths.description + columnWidths.mode + columnWidths.expense + columnWidths.revenue;
                        
                        const revenueX = rightMargin - columnWidths.revenue;
                        const expenseX = revenueX - columnWidths.expense;
                        const startX = expenseX - descriptionWidth;

                        // Update the drawTotalRow function
                        const drawTotalRow = (y, description, expense = null, revenue = null, isHighlighted = false) => {
                            if (isHighlighted) {
                                doc.setFillColor(246, 246, 252);
                                doc.rect(startX, y - 7, descriptionWidth + columnWidths.expense + columnWidths.revenue, rowHeight, 'F');
                            }

                            doc.rect(startX, y - 7, descriptionWidth, rowHeight);
                            doc.rect(expenseX, y - 7, columnWidths.expense, rowHeight);
                            doc.rect(revenueX, y - 7, columnWidths.revenue, rowHeight);

                            // Set bold font for description
                            doc.setFont('helvetica', 'bold');
                            doc.text(description, startX + 2, y);
                            
                            // Set monospace bold font for amounts
                            doc.setFont('courier', 'bold');
                            
                            if (expense !== null) {
                                doc.text(
                                    formatAmount(expense),
                                    expenseX + columnWidths.expense - 2,
                                    y, 
                                    { align: 'right' }
                                );
                            }
                            
                            if (revenue !== null) {
                                doc.text(
                                    formatAmount(revenue),
                                    revenueX + columnWidths.revenue - 2,
                                    y, 
                                    { align: 'right' }
                                );
                            }
                        };

                        // Draw total rows with cell formatting
                        drawTotalRow(finalY, 'Total:', totalExpense, totalRevenue);
                        drawTotalRow(
                            finalY + (lineSpacing * 1),
                            `${monthNames[selectedMonth]} - Cash in Hand:`,
                            null,
                            cashInHand,
                            true
                        );
                    }
                },
                styles: {
                    overflow: 'linebreak',
                    cellPadding: 3,
                    fontSize: 10,
                    cellWidth: 'auto',
                    lineColor: [200, 200, 200],
                    lineWidth: 0.1
                }
            });

            // After autoTable, update totalPages before adding page numbers
            totalPages = doc.internal.getNumberOfPages();

            // After everything is drawn, add page numbers
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(10);
                doc.setTextColor(0, 0, 0);
                doc.text(
                    `Page ${i} of ${totalPages}`,
                    pageWidth / 2,
                    pageHeight - 10,
                    { align: 'center' }
                );
            }

            // Add a small delay before saving to ensure everything is drawn
            setTimeout(() => {
                const filename = `SP_Parking_${user}_Statement_${monthNames[selectedMonth]}_${selectedYear}.pdf`;
                doc.save(filename);
                toast.success(`PDF generated successfully for ${user}`);
                setIsLoading(false);
            }, 100);
        } catch (error) {
            console.error('Error generating PDF:', error);
            toast.error(`Failed to generate PDF for ${user}`);
        }
    };

    const handleTransfer = (fromUser) => {
        setTransferFrom(fromUser);
        setTransferTo(fromUser === 'Balu' ? 'Mani' : 'Balu');
        setIsTransferModalOpen(true);
    };

    const BalanceCard = ({ title, icon, value, bgGradient }) => (
        <div className={`rounded-xl p-2 sm:p-3 bg-gradient-to-br ${bgGradient} border border-white/50 shadow-sm hover:shadow-md transition-all duration-200`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-white/90 shadow-sm">
                        {icon}
                    </div>
                    <div>
                        <p className="text-[10px] sm:text-xs text-gray-600 font-medium">{title}</p>
                        <p className="text-sm sm:text-base font-bold text-gray-900">₹{value.toFixed(2)}</p>
                    </div>
                </div>
            </div>
        </div>
    );

    const UserSection = ({ user, data, onTakeHome, isLoading }) => {
        // Calculate transfer out for this user (amounts sent to the other user)
        const transferOut = (data.transfers || [])
            .filter(tr => tr.amount < 0)
            .reduce((sum, tr) => sum + Math.abs(tr.amount), 0);
        const transferTitle = user === 'Balu' ? 'Transfer to Mani' : 'Transfer to Balu';
        return (
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-3 sm:p-4">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 sm:mb-4 gap-3 sm:gap-0">
                        <div className="flex items-center gap-3">
                            <div className={`rounded-full w-10 h-10 flex items-center justify-center text-xl font-bold ${user === 'Balu' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{user[0]}</div>
                            <span className="text-lg sm:text-xl font-extrabold tracking-wide">{user === 'Balu' ? 'Balu' : 'Mani'}</span>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                            <button
                                onClick={() => generateDetailedPDF(user)}
                                disabled={isLoading}
                                className="w-full sm:w-auto bg-blue-500 text-white px-2 sm:px-3 py-2 rounded-lg flex items-center space-x-1 sm:space-x-2 hover:bg-blue-600 transition-colors disabled:opacity-50 text-xs sm:text-sm font-semibold justify-center"
                                title="Download Statement"
                            >
                                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span>Statement</span>
                            </button>
                            <button
                                onClick={() => onTakeHome(user)}
                                disabled={isLoading}
                                className="w-full sm:w-auto bg-blue-500 text-white px-2 sm:px-3 py-2 rounded-lg flex items-center space-x-1 sm:space-x-2 hover:bg-blue-600 transition-colors disabled:opacity-50 text-xs sm:text-sm font-semibold justify-center"
                                title="Take Home"
                            >
                                <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span>Withdraw</span>
                            </button>
                            <button
                                onClick={() => handleTransfer(user)}
                                disabled={isLoading}
                                className="w-full sm:w-auto bg-blue-500 text-white px-2 sm:px-3 py-2 rounded-lg flex items-center space-x-1 sm:space-x-2 hover:bg-blue-600 transition-colors disabled:opacity-50 text-xs sm:text-sm font-semibold justify-center"
                                title="Transfer Cash"
                            >
                                <ArrowUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span>Transfer Cash</span>
                            </button>
                        </div>
                    </div>

                    {/* Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                        <div className="col-span-2">
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                <div className="flex-1 min-w-0">
                                    <BalanceCard
                                        title="Revenue"
                                        icon={<IndianRupee className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />}
                                        value={data.revenue}
                                        bgGradient="from-green-50 to-green-100"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <BalanceCard
                                        title="Expenses"
                                        icon={<Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />}
                                        value={data.expenses}
                                        bgGradient="from-red-50 to-red-100"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="col-span-2">
                            <BalanceCard
                                title="Net Income"
                                icon={<DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />}
                                value={data.netProfit}
                                bgGradient="from-indigo-50 to-indigo-100"
                            />
                        </div>
                        <div className="col-span-2">
                            <BalanceCard
                                title={`${monthNames[(selectedMonth - 1 + 12) % 12]} - Brought Forward`}
                                icon={<Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />}
                                value={data.previousMonthTakeHome}
                                bgGradient="from-purple-50 to-purple-100"
                            />
                        </div>
                        {/* New Transfer Out Card */}
                        <div className="col-span-2">
                            <BalanceCard
                                title={transferTitle}
                                icon={<ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />}
                                value={transferOut}
                                bgGradient="from-blue-50 to-blue-100"
                            />
                        </div>
                        <div className="col-span-2">
                            <BalanceCard
                                title={`${monthNames[selectedMonth]} - Cash in Hand`}
                                icon={<ArrowUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />}
                                value={data.thisMonthTakeHome}
                                bgGradient="from-emerald-50 to-emerald-100"
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-[1920px] mx-auto px-2 py-2 sm:px-4">
            <Toaster position="top-right" />
            
            {/* Header Section */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-4 sm:mb-6">
                <div className="bg-gradient-to-r from-blue-600 to-blue-600 p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center sm:text-left">
                            Balance Sheet Dashboard
                        </h1>
                        <div className="flex flex-col gap-3 w-full sm:flex-row sm:gap-4 sm:w-auto items-center">
                            <div className="relative w-full sm:w-48">
                                <select 
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                    className="w-full appearance-none bg-white text-blue-600 px-4 py-3 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 font-medium shadow-md hover:bg-gray-50 transition-colors duration-200"
                                >
                                    {monthNames.map((month, index) => (
                                        <option key={index} value={index}>{month}</option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-600" />
                            </div>
                            <div className="relative w-full sm:w-32">
                                <select 
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                    className="w-full appearance-none bg-white text-blue-600 px-4 py-3 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 font-medium shadow-md hover:bg-gray-50 transition-colors duration-200"
                                >
                                    {Array.from({ length: 5 }, (_, i) => selectedYear - 2 + i).map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-600" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Balance Sheets Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <UserSection 
                    user="Balu"
                    data={balanceData.balu}
                    onTakeHome={handleTakeHome}
                    isLoading={isLoading}
                />
                <UserSection 
                    user="Mani"
                    data={balanceData.mani}
                    onTakeHome={handleTakeHome}
                    isLoading={isLoading}
                />
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50">
                    <div 
                        className="fixed inset-0 backdrop-blur-sm bg-black/30"
                        onClick={() => setIsModalOpen(false)}
                    />
                    <div className="fixed inset-0 flex items-center justify-center p-4">
                        <div 
                            className="bg-white rounded-2xl p-6 w-full max-w-xs sm:max-w-md shadow-xl"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex justify-between items-center mb-8">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-indigo-100 rounded-xl">
                                        <Wallet className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            Withdraw Amount
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            {selectedUser ? (selectedUser === 'Balu' ? 'Balu' : 'Mani') : ''}'s Withdraw for {monthNames[selectedMonth]} {selectedYear}
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-3 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X className="w-6 h-6 text-gray-500" />
                                </button>
                            </div>
                            
                            {/* Amount Input */}
                            <div className="mb-8">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Enter Amount
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <IndianRupee className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={takeHomeAmount}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            if (value === '' || /^-?\d*\.?\d*$/.test(value)) {
                                                setTakeHomeAmount(value);
                                            }
                                        }}
                                        className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-border-500 outline-none text-base transition-shadow"
                                        placeholder="0.00"
                                        autoFocus
                                    />
                                </div>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                                >
                                    <X className="w-4 h-4" />
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmitTakeHome}
                                    disabled={isLoading || !takeHomeAmount}
                                    className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                >
                                    {isLoading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-4 h-4" />
                                            Withdraw
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isTransferModalOpen && (
                <div className="fixed inset-0 z-50">
                    <div className="fixed inset-0 backdrop-blur-sm bg-black/30" onClick={() => setIsTransferModalOpen(false)} />
                    <div className="fixed inset-0 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-xs sm:max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
                            {/* Header */}
                            <div className="flex justify-between items-center mb-8">
                                <div className="flex items-center space-x-3">
                                    <div className="p-2 bg-blue-100 rounded-xl">
                                        <ArrowUp className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">
                                            Transfer Cash
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            Transfer between {transferFrom === 'Balu' ? 'Balu' : 'Mani'} and {transferTo === 'Balu' ? 'Balu' : 'Mani'} for {monthNames[selectedMonth]} {selectedYear}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setIsTransferModalOpen(false)} className="p-3 hover:bg-gray-100 rounded-full transition-colors">
                                    <X className="w-6 h-6 text-gray-500" />
                                </button>
                            </div>
                            {/* From Dropdown */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
                                <select
                                    value={transferFrom}
                                    onChange={e => setTransferFrom(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base transition-shadow"
                                >
                                    <option value="Balu">Balu</option>
                                    <option value="Mani">Mani</option>
                                </select>
                            </div>
                            {/* To Dropdown */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
                                <select
                                    value={transferTo}
                                    onChange={e => setTransferTo(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base transition-shadow"
                                >
                                    <option value="Balu">Balu</option>
                                    <option value="Mani">Mani</option>
                                </select>
                            </div>
                            {/* Amount Input */}
                            <div className="mb-8">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <IndianRupee className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={transferAmount}
                                        onChange={e => {
                                            const value = e.target.value;
                                            if (value === '' || /^\d*\.?\d*$/.test(value)) setTransferAmount(value);
                                        }}
                                        className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-base transition-shadow"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            {/* Action Buttons */}
                            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
                                <button
                                    onClick={() => setIsTransferModalOpen(false)}
                                    className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                                >
                                    <X className="w-4 h-4" />
                                    Cancel
                                </button>
                                <button
                                    onClick={async () => {
                                        if (!transferAmount || transferFrom === transferTo) {
                                            toast.error('Invalid transfer');
                                            return;
                                        }
                                        try {
                                            const res = await fetch('https://spcarparkingbknd.onrender.com/balancesheet/transfer', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    fromUser: transferFrom,
                                                    toUser: transferTo,
                                                    amount: parseFloat(transferAmount),
                                                    date: new Date(),
                                                    month: selectedMonth,
                                                    year: selectedYear
                                                })
                                            });
                                            if (!res.ok) throw new Error('Transfer failed');
                                            toast.success('Transfer successful!');
                                            setIsTransferModalOpen(false);
                                            setTransferAmount('');
                                            await fetchBalanceData();
                                        } catch (err) {
                                            toast.error('Transfer failed');
                                        }
                                    }}
                                    disabled={!transferAmount || transferFrom === transferTo}
                                    className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                                >
                                    Transfer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default BalanceSheet; 