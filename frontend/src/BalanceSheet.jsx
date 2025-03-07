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
    X
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
                fetch(`https://spcarparkingbknd.onrender.com/balancesheet?month=${selectedMonth - 1}&year=${selectedYear}`)
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

            // Calculate previous month's take home for each user
            const baluPreviousMonthTakeHome = balanceSheetData
                .filter(record => record.userName === 'Balu')
                .reduce((sum, record) => sum + (record.amount || 0), 0);

            const maniPreviousMonthTakeHome = balanceSheetData
                .filter(record => record.userName === 'Mani')
                .reduce((sum, record) => sum + (record.amount || 0), 0);

            // Calculate net profit for each user (without advances)
            const baluNetProfit = baluRevenue - baluExpenses;
            const maniNetProfit = maniRevenue - maniExpenses;

            // Calculate this month's total take home
            const baluThisMonthTakeHome = baluPreviousMonthTakeHome + baluNetProfit;
            const maniThisMonthTakeHome = maniPreviousMonthTakeHome + maniNetProfit;

            setBalanceData({
                balu: {
                    revenue: baluRevenue,
                    expenses: baluExpenses,
                    netProfit: baluNetProfit,
                    previousMonthTakeHome: baluPreviousMonthTakeHome,
                    thisMonthTakeHome: baluThisMonthTakeHome
                },
                mani: {
                    revenue: maniRevenue,
                    expenses: maniExpenses,
                    netProfit: maniNetProfit,
                    previousMonthTakeHome: maniPreviousMonthTakeHome,
                    thisMonthTakeHome: maniThisMonthTakeHome
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
                record.year === selectedYear
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
                    year: selectedYear
                }),
            });

            if (!response.ok) throw new Error('Failed to record take home amount');

            toast.success(`Successfully updated take home amount for ${selectedUser}`);
            setIsModalOpen(false);
            setTakeHomeAmount('');
            await fetchBalanceData();
        } catch (error) {
            toast.error(`Failed to update take home amount for ${selectedUser}`);
            console.error('Error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const generateDetailedPDF = async (user) => {
        setIsLoading(true);
        try {
            // Fetch revenue and expense data
            const [revenueRes, expensesRes] = await Promise.all([
                fetch(`https://spcarparkingbknd.onrender.com/revenue?month=${selectedMonth}&year=${selectedYear}`),
                fetch(`https://spcarparkingbknd.onrender.com/expenses?month=${selectedMonth}&year=${selectedYear}`)
            ]);

            const revenueData = await revenueRes.json();
            const expensesData = await expensesRes.json();

            // Filter data for the specific user
            const userRevenue = revenueData.filter(record => record.receivedBy === user);
            const userExpenses = expensesData.filter(record => record.spentBy === user);

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

            // Updated table data preparation with capitalized description
            const tableRows = combinedTransactions.map((record, index) => ({
                sno: (index + 1).toString(),
                date: formatDateForPDF(record.date),
                type: record.type === 'revenue' ? (record.vehicleNumber || 'N/A') : record.expenseType,
                description: record.type === 'revenue' 
                    ? (record.vehicleDescription || '-').toUpperCase() 
                    : (record.description || '-').toUpperCase(),
                mode: record.transactionMode,
                expense: record.type === 'expense' ? `INR ${record.amount.toFixed(2)}` : '-',
                revenue: record.type === 'revenue' ? `INR ${record.revenueAmount.toFixed(2)}` : '-'
            }));

            // Calculate totals
            const totalExpense = userExpenses.reduce((sum, exp) => sum + exp.amount, 0);
            const totalRevenue = userRevenue.reduce((sum, rev) => sum + rev.revenueAmount, 0);
            const netAmount = totalRevenue - totalExpense;

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
                    description: { cellWidth: columnWidths.description, halign: 'center' },
                    mode: { cellWidth: columnWidths.mode, halign: 'center' },
                    expense: { cellWidth: columnWidths.expense, halign: 'left' },
                    revenue: { cellWidth: columnWidths.revenue, halign: 'left' }
                },
                margin: { left: leftMargin },
                didDrawPage: (data) => {
                    doc.setFontSize(10);
                    doc.setTextColor(0, 0, 0);
                    doc.text(
                        `Page ${data.pageNumber}`,
                        pageWidth / 2,
                        pageHeight - 10,
                        { align: 'center' }
                    );
                },
                didDrawCell: function(data) {
                    if (data.row.index === tableRows.length - 1 && data.column.index === 0) {
                        const finalY = data.cell.y + data.cell.height + 10;
                        
                        // Set styles for totals
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(10);
                        doc.setTextColor(0, 0, 0);
                        doc.setDrawColor(200, 200, 200);
                        doc.setLineWidth(0.1);

                        const lineSpacing = 12;
                        const textPadding = 5;
                        const rowHeight = 10;

                        // Calculate column positions with right alignment
                        const totalWidth = columnWidths.description + columnWidths.mode + columnWidths.expense + columnWidths.revenue;
                        const descriptionWidth = totalWidth * 0.4; // Reduced width for description
                        const rightMargin = leftMargin + columnWidths.sno + columnWidths.date + columnWidths.type + 
                                          columnWidths.description + columnWidths.mode + columnWidths.expense + columnWidths.revenue;
                        
                        // Calculate starting positions from right to left
                        const revenueX = rightMargin - columnWidths.revenue;
                        const expenseX = revenueX - columnWidths.expense;
                        const startX = expenseX - descriptionWidth;

                        // Function to draw cell borders and content
                        const drawTotalRow = (y, description, expense = null, revenue = null, isHighlighted = false) => {
                            // Draw background if highlighted
                            if (isHighlighted) {
                                doc.setFillColor(246, 246, 252);
                                doc.rect(startX, y - 7, descriptionWidth + columnWidths.expense + columnWidths.revenue, rowHeight, 'F');
                            }

                            // Draw cell borders
                            // Description cell (reduced width)
                            doc.rect(startX, y - 7, descriptionWidth, rowHeight);
                            // Expense cell
                            doc.rect(expenseX, y - 7, columnWidths.expense, rowHeight);
                            // Revenue cell
                            doc.rect(revenueX, y - 7, columnWidths.revenue, rowHeight);

                            // Fill cells with text
                            doc.text(description, startX + textPadding, y);
                            
                            if (expense !== null) {
                                doc.text(`INR ${expense.toFixed(2)}`, expenseX + 2, y, { align: 'left' });
                            }
                            
                            if (revenue !== null) {
                                doc.text(`INR ${revenue.toFixed(2)}`, revenueX + 2, y, { align: 'left' });
                            }
                        };

                        // Draw total rows with cell formatting
                        drawTotalRow(finalY, 'Total:', totalExpense, totalRevenue);
                        drawTotalRow(
                            finalY + lineSpacing,
                            `${monthNames[(selectedMonth - 1 + 12) % 12]} Brought Forward:`,
                            null,
                            balanceData[user.toLowerCase()].previousMonthTakeHome
                        );
                        drawTotalRow(
                            finalY + (lineSpacing * 2),
                            `${monthNames[selectedMonth]} Take Home:`,
                            null,
                            balanceData[user.toLowerCase()].thisMonthTakeHome,
                            true
                        );
                    }
                }
            });

            // Save the PDF
            const filename = `SP_Parking_${user}_Statement_${monthNames[selectedMonth]}_${selectedYear}.pdf`;
            doc.save(filename);
            toast.success(`PDF generated successfully for ${user}`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            toast.error(`Failed to generate PDF for ${user}`);
        } finally {
            setIsLoading(false);
        }
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

    const UserSection = ({ user, data, onTakeHome, isLoading }) => (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-3 sm:p-4">
                {/* Header */}
                <div className="flex justify-between items-center mb-3 sm:mb-4">
                    <h2 className="text-lg font-bold text-gray-900">{user}</h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => generateDetailedPDF(user)}
                            disabled={isLoading}
                            className="bg-blue-500 text-white px-2 sm:px-3 py-2 rounded-lg flex items-center space-x-1 sm:space-x-2 hover:bg-blue-600 transition-colors disabled:opacity-50 text-xs sm:text-sm"
                            title="Download Statement"
                        >
                            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span>Statement</span>
                        </button>
                        <button
                            onClick={() => onTakeHome(user)}
                            disabled={isLoading}
                            className="bg-blue-500 text-white px-2 sm:px-3 py-2 rounded-lg flex items-center space-x-1 sm:space-x-2 hover:bg-blue-600 transition-colors disabled:opacity-50 text-xs sm:text-sm"
                            title="Take Home"
                        >
                            <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            <span>Take Home</span>
                        </button>
                    </div>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div className="col-span-2">
                        <div className="flex gap-2 sm:gap-3">
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
                            title="Net Profit"
                            icon={<DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />}
                            value={data.netProfit}
                            bgGradient="from-indigo-50 to-indigo-100"
                        />
                    </div>
                    <div className="col-span-2">
                        <BalanceCard
                            title={`${monthNames[(selectedMonth - 1 + 12) % 12]} Brought Forward`}
                            icon={<Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />}
                            value={data.previousMonthTakeHome}
                            bgGradient="from-purple-50 to-purple-100"
                        />
                    </div>
                    <div className="col-span-2">
                        <BalanceCard
                            title={`${monthNames[selectedMonth]} Take Home`}
                            icon={<ArrowUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />}
                            value={data.thisMonthTakeHome}
                            bgGradient="from-emerald-50 to-emerald-100"
                        />
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="max-w-[1920px] mx-auto px-2 py-2">
            <Toaster position="top-right" />
            
            {/* Header Section */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-4 sm:mb-6">
                <div className="bg-gradient-to-r from-blue-600 to-blue-600 p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center sm:text-left">
                            Balance Sheet Dashboard
                        </h1>
                        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-48">
                                <select 
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                    className="w-full appearance-none bg-white bg-opacity-20 text-black px-4 py-3 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 font-medium"
                                >
                                    {monthNames.map((month, index) => (
                                        <option key={index} value={index}>{month}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-black" />
                            </div>
                            <div className="relative flex-1 sm:w-32">
                                <select 
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                    className="w-full appearance-none bg-white bg-opacity-20 text-black px-4 py-3 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 font-medium"
                                >
                                    {Array.from({ length: 5 }, (_, i) => selectedYear - 2 + i).map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-black" />
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
                            className="bg-white rounded-2xl p-6 w-full max-w-[90%] sm:max-w-md shadow-xl"
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
                                            Take Home Amount
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            {selectedUser}'s Take Home for {monthNames[selectedMonth]} {selectedYear}
                                        </p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-gray-500" />
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
                                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
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
                                            Take Home
                                        </>
                                    )}
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