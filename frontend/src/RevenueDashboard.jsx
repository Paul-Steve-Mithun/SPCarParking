import { useEffect, useState } from 'react';
import { 
    DollarSign, 
    Calendar, 
    Clock,
    Printer,
    Car,
    ChevronDown,
    Trash2,
    AlertCircle,
    ArrowUp,
    ArrowDown,
    CreditCard,
    Search,
    User,
    Edit2,
    Wallet,
    MapPin
} from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function RevenueDashboard() {
    const [revenueData, setRevenueData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [error, setError] = useState('');
    const [sortConfig, setSortConfig] = useState({ 
        key: 'transactionDate', 
        direction: 'asc' 
    });
    const [stats, setStats] = useState({
        totalRevenue: 0,
        monthlyRentalRevenue: 0,
        dailyRentalRevenue: 0,
        vehicleCount: 0,
        baluCollection: 0,
        maniCollection: 0
    });
    const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState(null);
    const [editForm, setEditForm] = useState({
        transactionDate: '',
        transactionMode: 'Cash',
        receivedBy: 'Balu'
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const filtered = revenueData
            .filter(record => {
                // First filter out records with zero, null, or 0.00 revenue amounts
                if (!record.revenueAmount || record.revenueAmount === 0 || record.revenueAmount === 0.00) {
                    return false;
                }
                // Then apply search query filter
                const query = searchQuery.toLowerCase();
                return (
                    record.vehicleNumber.toLowerCase().includes(query) ||
                    (record.vehicleDescription || '').toLowerCase().includes(query) ||
                    (record.lotNumber || '').toLowerCase().includes(query)
                );
            });
        setFilteredData(filtered);
    }, [searchQuery, revenueData]);


    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June', 
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    useEffect(() => {
        fetchRevenueData();
    }, [selectedMonth, selectedYear]);

    const sortByDate = (data) => {
        return [...data].sort((a, b) => {
            const dateA = new Date(a.transactionDate);
            const dateB = new Date(b.transactionDate);
            return dateB - dateA; // Changed to show latest first
        });
    };

    const fetchRevenueData = async () => {
        try {
            const [dataResponse, statsResponse] = await Promise.all([
                fetch(`https://spcarparkingbknd.onrender.com/revenue?month=${selectedMonth}&year=${selectedYear}`),
                fetch(`https://spcarparkingbknd.onrender.com/revenueStats?month=${selectedMonth}&year=${selectedYear}`)
            ]);

            const data = await dataResponse.json();
            const statsData = await statsResponse.json();

            const sortedData = sortByDate(data);
            setRevenueData(sortedData);
            setError('');

            const totalRevenue = statsData.reduce((sum, item) => sum + item.totalRevenue, 0);
            const monthlyStats = statsData.find(item => item._id === 'monthly') || { totalRevenue: 0 };
            const dailyStats = statsData.find(item => item._id === 'daily') || { totalRevenue: 0 };
            const vehicleCount = statsData.reduce((sum, item) => sum + item.count, 0);

            // Calculate collections by receiver
            const baluCollection = data
                .filter(record => record.receivedBy === 'Balu')
                .reduce((sum, record) => sum + record.revenueAmount, 0);

            const maniCollection = data
                .filter(record => record.receivedBy === 'Mani')
                .reduce((sum, record) => sum + record.revenueAmount, 0);

            setStats({
                totalRevenue,
                monthlyRentalRevenue: monthlyStats.totalRevenue,
                dailyRentalRevenue: dailyStats.totalRevenue,
                vehicleCount,
                baluCollection,
                maniCollection
            });
        } catch (error) {
            setError('Failed to fetch revenue data');
            toast.error('Failed to fetch revenue data');
            console.error('Error fetching revenue data:', error);
        }
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });

        const sortedData = [...revenueData].sort((a, b) => {
            if (key === 'transactionDate') {
                const dateA = new Date(a.transactionDate);
                const dateB = new Date(b.transactionDate);
                return direction === 'asc' ? dateA - dateB : dateB - dateA;
            }
            if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
            if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        setRevenueData(sortedData);
    };

    const handleDeleteTransaction = async (transactionId) => {
        try {
            const response = await fetch(`https://spcarparkingbknd.onrender.com/revenue/${transactionId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete transaction');
            }

            await fetchRevenueData();
            toast.success('Transaction deleted successfully');
        } catch (error) {
            toast.error('Failed to delete transaction');
            console.error('Error deleting transaction:', error);
        } finally {
            setIsDeleteDialogOpen(false);
            setSelectedTransaction(null);
        }
    };

    const generateFilteredPDF = (filterBy = null) => {
        const doc = new jsPDF('landscape');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        // Filter data based on selection
        const filteredData = filterBy 
            ? revenueData.filter(record => record.receivedBy === filterBy)
            : revenueData;

        // Calculate totals for filtered data
        const filteredStats = {
            monthlyRevenue: filteredData
                .filter(record => record.rentalType === 'monthly' && 
                                 record.revenueAmount && 
                                 record.revenueAmount !== 0 && 
                                 record.revenueAmount !== 0.00)
                .reduce((sum, record) => sum + record.revenueAmount, 0),
            dailyRevenue: filteredData
                .filter(record => record.rentalType === 'daily' && 
                                 record.revenueAmount && 
                                 record.revenueAmount !== 0 && 
                                 record.revenueAmount !== 0.00)
                .reduce((sum, record) => sum + record.revenueAmount, 0),
            totalRevenue: filteredData
                .filter(record => record.revenueAmount && 
                                 record.revenueAmount !== 0 && 
                                 record.revenueAmount !== 0.00)
                .reduce((sum, record) => sum + record.revenueAmount, 0)
        };

        // Calculate total table width based on column widths
        const columnWidths = {
            sno: 15,
            vehicleNumber: 30,
            description: 40,
            lot: 20,
            rentalType: 25,
            transaction: 25,
            mode: 20,
            receivedBy: 25,
            date: 25,
            amount: 35
        };
        
        const totalTableWidth = Object.values(columnWidths).reduce((sum, width) => sum + width, 0);
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
            ? `${monthNames[selectedMonth]} ${selectedYear} Revenue Statement - ${filterBy}'s Collection (Generated: ${formattedDate})`
            : `${monthNames[selectedMonth]} ${selectedYear} Revenue Statement (Generated: ${formattedDate})`;
        doc.text(titleText, pageWidth / 2, 28, { align: 'center' });

        // Format date function
        const formatDateForPDF = (date) => {
            const d = new Date(date);
            return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        };

        // Updated table columns with S.No
        const tableColumn = [
            { header: 'S.No', dataKey: 'sno' },
            { header: 'Vehicle Number', dataKey: 'vehicleNumber' },
            { header: 'Description', dataKey: 'description' },
            { header: 'Lot', dataKey: 'lot' },
            { header: 'Rental Type', dataKey: 'rentalType' },
            { header: 'Transaction', dataKey: 'transaction' },
            { header: 'Mode', dataKey: 'mode' },
            { header: 'Received By', dataKey: 'receivedBy' },
            { header: 'Date', dataKey: 'date' },
            { header: 'Amount', dataKey: 'amount' }
        ];

        // Modify sortedTableRows to filter out zero/null amounts
        const sortedTableRows = filteredData
            .filter(record => {
                // Filter out records with zero, null, or 0.00 revenue amounts
                return record.revenueAmount && 
                       record.revenueAmount !== 0 && 
                       record.revenueAmount !== 0.00;
            })
            .sort((a, b) => {
                const dateA = new Date(a.transactionDate);
                const dateB = new Date(b.transactionDate);
                return dateA - dateB;
            })
            .map((record, index) => ({
                sno: (index + 1).toString(), // Re-number after filtering
                vehicleNumber: record.vehicleNumber || '',
                description: record.vehicleDescription || '',
                lot: record.lotNumber || 'Open',
                rentalType: capitalizeFirst(record.rentalType),
                transaction: record.transactionType || 'N/A',
                receivedBy: record.receivedBy || 'N/A',
                mode: record.transactionMode,
                date: formatDateForPDF(record.transactionDate),
                amount: `INR ${record.revenueAmount.toFixed(2)}`
            }));

        doc.autoTable({
            columns: tableColumn,
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
                fontSize: 9,
                cellPadding: 2,
                lineColor: [237, 237, 237],
                valign: 'middle'
            },
            columnStyles: {
                sno: { cellWidth: columnWidths.sno, halign: 'center' },
                vehicleNumber: { cellWidth: columnWidths.vehicleNumber, halign: 'center' },
                description: { cellWidth: columnWidths.description, halign: 'left' },
                lot: { cellWidth: columnWidths.lot, halign: 'center' },
                rentalType: { cellWidth: columnWidths.rentalType, halign: 'center' },
                transaction: { cellWidth: columnWidths.transaction, halign: 'center' },
                receivedBy: { cellWidth: columnWidths.receivedBy, halign: 'center' },
                mode: { cellWidth: columnWidths.mode, halign: 'center' },
                date: { cellWidth: columnWidths.date, halign: 'center' },
                amount: { cellWidth: columnWidths.amount, halign: 'center' }
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

                    // Draw Monthly Revenue box
                    drawTotalBox(
                        finalY, 
                        'Monthly Revenue:', 
                        `INR ${filteredStats.monthlyRevenue.toFixed(2)}`
                    );

                    // Draw Daily Revenue box
                    drawTotalBox(
                        finalY + lineSpacing, 
                        'Daily Revenue:', 
                        `INR ${filteredStats.dailyRevenue.toFixed(2)}`
                    );

                    // Only show Balu's and Mani's collection in the complete report
                    if (!filterBy) {
                        // Calculate collections by receiver with zero amount filtering
                        const baluCollection = filteredData
                            .filter(record => 
                                record.receivedBy === 'Balu' && 
                                record.revenueAmount && 
                                record.revenueAmount !== 0 && 
                                record.revenueAmount !== 0.00
                            )
                            .reduce((sum, record) => sum + record.revenueAmount, 0);

                        const maniCollection = filteredData
                            .filter(record => 
                                record.receivedBy === 'Mani' && 
                                record.revenueAmount && 
                                record.revenueAmount !== 0 && 
                                record.revenueAmount !== 0.00
                            )
                            .reduce((sum, record) => sum + record.revenueAmount, 0);

                        // Draw Balu's Collection box
                        drawTotalBox(
                            finalY + (lineSpacing * 2), 
                            'Balu\'s Collection:', 
                            `INR ${baluCollection.toFixed(2)}`
                        );

                        // Draw Mani's Collection box
                        drawTotalBox(
                            finalY + (lineSpacing * 3), 
                            'Mani\'s Collection:', 
                            `INR ${maniCollection.toFixed(2)}`
                        );

                        // Draw Grand Total box after collections
                        drawTotalBox(
                            finalY + (lineSpacing * 4), 
                            'Grand Total:', 
                            `INR ${filteredStats.totalRevenue.toFixed(2)}`,
                            true
                        );
                    } else {
                        // For filtered reports (Balu's or Mani's), show grand total directly after daily revenue
                        drawTotalBox(
                            finalY + (lineSpacing * 2), 
                            'Grand Total:', 
                            `INR ${filteredStats.totalRevenue.toFixed(2)}`,
                            true
                        );
                    }
                }
            }
        });

        const filename = filterBy 
            ? `SP_Parking_Revenue_${filterBy}_${monthNames[selectedMonth]}_${selectedYear}.pdf`
            : `SP_Parking_Revenue_${monthNames[selectedMonth]}_${selectedYear}.pdf`;
        doc.save(filename);
        setIsPdfModalOpen(false);
    };

    const revenueStats = [
        {
            icon: <DollarSign className="w-8 h-8 text-indigo-600" />, 
            label: "Total Revenue", 
            value: `₹${stats.totalRevenue.toFixed(2)}`,
            bgGradient: "from-indigo-50 to-indigo-100"
        },
        {
            icon: <Calendar className="w-8 h-8 text-blue-600" />, 
            label: "Monthly Revenue", 
            value: `₹${stats.monthlyRentalRevenue.toFixed(2)}`,
            bgGradient: "from-blue-50 to-blue-100"
        },
        {
            icon: <Clock className="w-8 h-8 text-cyan-600" />, 
            label: "Daily Revenue", 
            value: `₹${stats.dailyRentalRevenue.toFixed(2)}`,
            bgGradient: "from-cyan-50 to-cyan-100"
        },
        {
            icon: <User className="w-8 h-8 text-emerald-600" />,
            label: "Balu's Collection",
            value: `₹${stats.baluCollection.toFixed(2)}`,
            bgGradient: "from-emerald-50 to-emerald-100"
        },
        {
            icon: <User className="w-8 h-8 text-teal-600" />,
            label: "Mani's Collection",
            value: `₹${stats.maniCollection.toFixed(2)}`,
            bgGradient: "from-teal-50 to-teal-100"
        }
    ];

    const SortIcon = ({ column }) => {
        if (sortConfig.key !== column) return null;
        return sortConfig.direction === 'asc' ? 
            <ArrowUp className="w-4 h-4 inline ml-1" /> : 
            <ArrowDown className="w-4 h-4 inline ml-1" />;
    };

    const capitalizeFirst = (str) => {
        return str.charAt(0).toUpperCase() + str.slice(1);
    };

    const handleEditClick = (transaction) => {
        setEditingTransaction(transaction);
        setEditForm({
            transactionDate: new Date(transaction.transactionDate).toISOString().split('T')[0],
            transactionMode: transaction.transactionMode,
            receivedBy: transaction.receivedBy
        });
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = async () => {
        if (isSaving) return; // Prevent double submission
        setIsSaving(true);
        try {
            const response = await fetch(`https://spcarparkingbknd.onrender.com/revenue/${editingTransaction._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(editForm)
            });

            if (!response.ok) {
                throw new Error('Failed to update transaction');
            }

            await fetchRevenueData();
            toast.success('Transaction updated successfully');
            setIsEditModalOpen(false);
            setEditingTransaction(null);
        } catch (error) {
            toast.error('Failed to update transaction');
            console.error('Error updating transaction:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="relative">
            <Toaster position="bottom-right" />
            
            <div className={`min-h-screen bg-gray-50 p-2 sm:p-6 transition-all duration-300 ${
                isDeleteDialogOpen ? 'blur-sm' : ''
            }`}>
                <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 flex items-center">
                            <AlertCircle className="h-5 w-5 mr-2 text-red-600" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center sm:text-left">
                                    Rent Payment Dashboard
                                </h1>
                                <button 
                                    onClick={() => setIsPdfModalOpen(true)}
                                    className="w-full sm:w-auto bg-white text-green-600 px-4 py-2 rounded-lg flex items-center justify-center space-x-2 hover:bg-gray-50 transition-colors duration-200 shadow-md"
                                >
                                    <Printer className="w-5 h-5" />
                                    <span className="font-semibold">Export PDF</span>
                                </button>
                            </div>
                            
                            <div className="mt-6 flex flex-col sm:flex-row gap-4">
                                <div className="relative flex-1 sm:flex-none">
                                    <select 
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                        className="w-full appearance-none bg-white bg-opacity-20 text-indigo-900 px-4 py-3 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 font-medium"
                                    >
                                        {monthNames.map((month, index) => (
                                            <option key={index} value={index}>{month}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-black" />
                                </div>
                                <div className="relative flex-1 sm:flex-none">
                                    <select 
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                        className="w-full appearance-none bg-white bg-opacity-20 text-indigo-900 px-4 py-3 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 font-medium"
                                    >
                                        {Array.from({ length: 5 }, (_, i) => selectedYear - 2 + i).map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-black" />
                                </div>
                            </div>
                        </div>

                        <div className="p-4 sm:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {revenueStats.map((stat, index) => (
                                <div 
                                    key={index} 
                                    className={`rounded-2xl p-4 sm:p-6 bg-gradient-to-br ${stat.bgGradient} border border-white shadow-md hover:shadow-lg transition-all duration-200`}
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className="p-3 rounded-xl bg-white shadow-sm">{stat.icon}</div>
                                        <div>
                                            <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                                            <p className="text-lg sm:text-2xl font-bold text-gray-900">{stat.value}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                        <div className="p-4 sm:p-6">
                            <div className="flex flex-col space-y-4">
                                <h2 className="text-xl font-bold text-gray-900 mb-4 text-center sm:text-left">
                                    Transaction History
                                </h2>
                                <div className="relative w-full mb-6">
                                    <input
                                        type="text"
                                        placeholder="Search by vehicle number, description, or lot number..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                    />
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <div className="max-w-[1400px] mx-auto">
                                    <div className="inline-block min-w-full align-middle">
                                        <div className="overflow-hidden">
                                            {filteredData.length === 0 ? (
                                                <div className="text-center py-8 text-gray-500">
                                                    No transactions found matching your search
                                                </div>
                                            ) : (
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead>
                                                        <tr className="bg-gray-50">
                                                            <th className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wider">
                                                                S.No
                                                            </th>
                                                            {[
                                                                'vehicleNumber',
                                                                'vehicleDescription',
                                                                'lotNumber',
                                                                'rentalType',
                                                                'transactionType',
                                                                'receivedBy',
                                                                'transactionMode',
                                                                'transactionDate',
                                                                'revenueAmount'
                                                            ].map((column) => (
                                                                <th 
                                                                    key={column}
                                                                    onClick={() => handleSort(column)}
                                                                    className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                                                >
                                                                    <div className="flex items-center">
                                                                        <span className="hidden sm:inline">
                                                                            {column.replace(/([A-Z])/g, ' $1').trim()}
                                                                        </span>
                                                                        <span className="sm:hidden">
                                                                            {column.replace(/([A-Z])/g, ' $1').trim().slice(0, 3)}
                                                                        </span>
                                                                        <SortIcon column={column} />
                                                                    </div>
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200">
                                                        {filteredData.map((record, index) => (
                                                            <tr 
                                                                key={record._id} 
                                                                onClick={() => handleEditClick(record)}
                                                                className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer group"
                                                            >
                                                                <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-900 font-medium group-hover:bg-gray-50">
                                                                    {index + 1}
                                                                </td>
                                                                <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-900 font-medium group-hover:bg-gray-50">
                                                                    <span title={record.vehicleNumber}>
                                                                        {record.vehicleNumber.length > 10 
                                                                            ? `${record.vehicleNumber.slice(0, 10)}...` 
                                                                            : record.vehicleNumber}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-600 group-hover:bg-gray-50">
                                                                    {record.vehicleDescription}
                                                                </td>
                                                                <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-600 group-hover:bg-gray-50">
                                                                    {record.lotNumber || 'Open'}
                                                                </td>
                                                                <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-600 group-hover:bg-gray-50">
                                                                    {capitalizeFirst(record.rentalType)}
                                                                </td>
                                                                <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-600 group-hover:bg-gray-50">
                                                                    {record.transactionType}
                                                                </td>
                                                                <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-600 group-hover:bg-gray-50">
                                                                    <span className="inline-flex items-center gap-1">
                                                                        <User className="w-4 h-4 text-gray-500" />
                                                                        {record.receivedBy || 'N/A'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-600 group-hover:bg-gray-50">
                                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                                        record.transactionMode === 'UPI' 
                                                                            ? 'bg-blue-100 text-blue-800' 
                                                                            : 'bg-green-100 text-green-800'
                                                                    }`}>
                                                                        {record.transactionMode === 'UPI' ? (
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
                                                                <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-600 group-hover:bg-gray-50">
                                                                    {new Date(record.transactionDate).toLocaleDateString('en-GB')}
                                                                </td>
                                                                <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-900 font-medium group-hover:bg-gray-50">
                                                                    ₹{record.revenueAmount.toFixed(2)}
                                                                </td>
                                                                <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm group-hover:bg-gray-50">
                                                                    <Edit2 className="w-4 h-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <Transition appear show={isDeleteDialogOpen} as={Fragment}>
                <Dialog 
                    as="div" 
                    className="relative z-50" 
                    onClose={() => setIsDeleteDialogOpen(false)}
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
                        <div className="fixed inset-0 bg-black/25" />
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
                                        className="text-lg font-bold leading-6 text-gray-900"
                                    >
                                        Delete Transaction
                                    </Dialog.Title>
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-500">
                                            Are you sure you want to delete this transaction? This action cannot be undone.
                                        </p>
                                        {selectedTransaction && (
                                            <div className="mt-4 bg-gray-50 p-4 rounded-lg">
                                                <p className="text-sm font-medium text-gray-700">Transaction Details:</p>
                                                <div className="mt-2 text-sm text-gray-600">
                                                    <p>Vehicle Number: {selectedTransaction.vehicleNumber}</p>
                                                    <p>Amount: ₹{selectedTransaction.revenueAmount.toFixed(2)}</p>
                                                    <p>Type: {selectedTransaction.transactionType}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                                            onClick={() => setIsDeleteDialogOpen(false)}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-lg border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                                            onClick={() => selectedTransaction && handleDeleteTransaction(selectedTransaction._id)}
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

            {/* PDF Generation Modal */}
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
                        <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
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
                                                <p className="text-sm text-gray-500">Generate PDF with all transactions</p>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => generateFilteredPDF('Balu')}
                                            className="w-full p-4 text-left rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors flex items-center space-x-3"
                                        >
                                            <User className="w-5 h-5 text-blue-600" />
                                            <div>
                                                <p className="font-medium text-gray-900">Balu's Collection</p>
                                                <p className="text-sm text-gray-500">Generate PDF with Balu's transactions only</p>
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => generateFilteredPDF('Mani')}
                                            className="w-full p-4 text-left rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors flex items-center space-x-3"
                                        >
                                            <User className="w-5 h-5 text-green-600" />
                                            <div>
                                                <p className="font-medium text-gray-900">Mani's Collection</p>
                                                <p className="text-sm text-gray-500">Generate PDF with Mani's transactions only</p>
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

            {/* Edit Modal */}
            <Transition appear show={isEditModalOpen} as={Fragment}>
                <Dialog 
                    as="div" 
                    className="relative z-50" 
                    onClose={() => setIsEditModalOpen(false)}
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
                        <div className="fixed inset-0 bg-black/25" />
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
                                        className="text-lg font-bold leading-6 text-gray-900 mb-4"
                                    >
                                        Edit Transaction
                                    </Dialog.Title>
                                    
                                    {editingTransaction && (
                                        <div className="space-y-4">
                                            {/* Vehicle Details Section */}
                                            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-5 rounded-xl border border-gray-200 shadow-sm">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="p-2 bg-white rounded-lg shadow-sm">
                                                        <Car className="w-6 h-6 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-semibold text-gray-400">Vehicle Number</h4>
                                                        <p className="text-lg font-bold text-gray-900">
                                                            {editingTransaction.vehicleNumber}
                                                        </p>
                                                    </div>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-white p-3 rounded-lg shadow-sm">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <AlertCircle className="w-4 h-4 text-purple-600" />
                                                            <span className="text-xs font-medium text-gray-500">Description</span>
                                                        </div>
                                                        <p className="text-sm font-semibold text-gray-900 line-clamp-2">
                                                            {editingTransaction.vehicleDescription || 'No description'}
                                                        </p>
                                                    </div>

                                                    <div className="bg-white p-3 rounded-lg shadow-sm">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <MapPin className="w-4 h-4 text-red-600" />
                                                            <span className="text-xs font-medium text-gray-500">Lot Number</span>
                                                        </div>
                                                        <p className="text-sm font-semibold text-gray-900">
                                                            {editingTransaction.lotNumber || 'Open'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Transaction Date
                                                </label>
                                                <input
                                                    type="date"
                                                    value={editForm.transactionDate}
                                                    onChange={(e) => setEditForm({
                                                        ...editForm,
                                                        transactionDate: e.target.value
                                                    })}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>

                                            {/* Transaction Mode Buttons */}
                                            <div>
                                                <label className="block text-gray-700 font-medium mb-2">Transaction Mode</label>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditForm({
                                                            ...editForm,
                                                            transactionMode: 'Cash'
                                                        })}
                                                        className={`relative px-4 py-2 rounded-lg flex items-center justify-center transition-all duration-200 ${
                                                            editForm.transactionMode === 'Cash'
                                                                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/50 transform scale-[1.02]'
                                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                        }`}
                                                    >
                                                        <Wallet className="h-5 w-5 mr-2" />
                                                        Cash
                                                        {editForm.transactionMode === 'Cash' && (
                                                            <span className="absolute -right-1 -top-1 w-3 h-3 bg-green-500 rounded-full"></span>
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditForm({
                                                            ...editForm,
                                                            transactionMode: 'UPI'
                                                        })}
                                                        className={`relative px-4 py-2 rounded-lg flex items-center justify-center transition-all duration-200 ${
                                                            editForm.transactionMode === 'UPI'
                                                                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/50 transform scale-[1.02]'
                                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                        }`}
                                                    >
                                                        <CreditCard className="h-5 w-5 mr-2" />
                                                        UPI
                                                        {editForm.transactionMode === 'UPI' && (
                                                            <span className="absolute -right-1 -top-1 w-3 h-3 bg-green-500 rounded-full"></span>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Received By Buttons */}
                                            <div>
                                                <label className="block text-gray-700 font-medium mb-2">Received By</label>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditForm({
                                                            ...editForm,
                                                            receivedBy: 'Balu'
                                                        })}
                                                        className={`relative px-4 py-2 rounded-lg flex items-center justify-center transition-all duration-200 ${
                                                            editForm.receivedBy === 'Balu'
                                                                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/50 transform scale-[1.02]'
                                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                        }`}
                                                    >
                                                        <User className="h-5 w-5 mr-2" />
                                                        Balu
                                                        {editForm.receivedBy === 'Balu' && (
                                                            <span className="absolute -right-1 -top-1 w-3 h-3 bg-green-500 rounded-full"></span>
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditForm({
                                                            ...editForm,
                                                            receivedBy: 'Mani'
                                                        })}
                                                        className={`relative px-4 py-2 rounded-lg flex items-center justify-center transition-all duration-200 ${
                                                            editForm.receivedBy === 'Mani'
                                                                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/50 transform scale-[1.02]'
                                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                        }`}
                                                    >
                                                        <User className="h-5 w-5 mr-2" />
                                                        Mani
                                                        {editForm.receivedBy === 'Mani' && (
                                                            <span className="absolute -right-1 -top-1 w-3 h-3 bg-green-500 rounded-full"></span>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-6 flex flex-col sm:flex-row justify-end gap-3">
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                                            onClick={() => setIsEditModalOpen(false)}
                                            disabled={isSaving}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-lg border border-transparent bg-gradient-to-r from-green-500 to-green-600 px-4 py-2 text-sm font-medium text-white hover:opacity-90 focus:outline-none disabled:opacity-50"
                                            onClick={handleEditSubmit}
                                            disabled={isSaving}
                                        >
                                            {isSaving ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                                    Saving...
                                                </>
                                            ) : (
                                                'Save Changes'
                                            )}
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
}

export default RevenueDashboard;