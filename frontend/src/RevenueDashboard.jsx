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
    User
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

    useEffect(() => {
        const filtered = revenueData.filter(record => {
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
            return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
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

    const generatePDF = () => {
        const doc = new jsPDF('landscape');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        // Calculate total table width based on column widths
        const columnWidths = {
            sno: 15,
            vehicleNumber: 25,
            description: 35,
            lot: 15,
            rentalType: 25,
            transaction: 25,
            receivedBy: 25,
            mode: 20,
            date: 25,
            amount: 25
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
        doc.text(`${monthNames[selectedMonth]} ${selectedYear} Revenue Statement (Generated: ${formattedDate})`, pageWidth / 2, 28, { align: 'center' });
    
        // Summary cards section - Updated layout for 5 cards in 2 rows
        const summaryY = 45;
        const cardWidth = (pageWidth - 80) / 3; // Reduced width
        const cardHeight = 25; // Reduced height from 30 to 25
        const cardGap = 8; // Reduced gap from 10 to 8
        
        // First Row of Cards
        const createCard = (x, y, label, value, color) => {
            doc.setFillColor(...color);
            doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'F');
            doc.setTextColor(79, 70, 229);
            doc.setFontSize(9); // Reduced from 10
            doc.setFont('helvetica', 'normal');
            doc.text(label, x + 5, y + 10); // Adjusted y position
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12); // Reduced from 14
            doc.text(value, x + 5, y + 20); // Adjusted y position
        };

        // First Row - Adjusted x positions
        createCard(30, summaryY, 'Total Revenue', `INR ${stats.totalRevenue.toFixed(2)}`, [246, 246, 252]);
        createCard(30 + cardWidth + cardGap, summaryY, 'Monthly Revenue', `INR ${stats.monthlyRentalRevenue.toFixed(2)}`, [239, 246, 255]);
        createCard(30 + (cardWidth + cardGap) * 2, summaryY, 'Daily Revenue', `INR ${stats.dailyRentalRevenue.toFixed(2)}`, [236, 254, 255]);

        // Second Row - Adjusted x positions and y position
        createCard(30 + cardWidth/2, summaryY + cardHeight + cardGap, "Balu's Collection", `INR ${stats.baluCollection.toFixed(2)}`, [236, 253, 245]);
        createCard(30 + cardWidth * 1.5 + cardGap, summaryY + cardHeight + cardGap, "Mani's Collection", `INR ${stats.maniCollection.toFixed(2)}`, [240, 253, 250]);
    
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
            { header: 'Received By', dataKey: 'receivedBy' },
            { header: 'Mode', dataKey: 'mode' },
            { header: 'Date', dataKey: 'date' },
            { header: 'Amount', dataKey: 'amount' }
        ];
    
        // Sort the table rows by date and add S.No
        const sortedTableRows = revenueData
            .sort((a, b) => {
                const dateA = new Date(a.transactionDate);
                const dateB = new Date(b.transactionDate);
                return dateA - dateB;
            })
            .map((record, index) => ({
                sno: (index + 1).toString(),
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
            startY: summaryY + (cardHeight + cardGap) * 2 + 10,
            theme: 'grid',
            headStyles: {
                fillColor: [79, 70, 229],
                textColor: [255, 255, 255],
                fontSize: 9,
                fontStyle: 'bold',
                cellPadding: 3,
                halign: 'center',
                valign: 'middle',
                lineWidth: 0.1,
                minCellHeight: 12
            },
            bodyStyles: {
                fontSize: 8,
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
                right: leftMargin
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
                doc.setFontSize(10);
                doc.text(
                    `Page ${data.pageNumber}`, 
                    pageWidth / 2, 
                    pageHeight - 10, 
                    { align: 'center' }
                );
            }
        });
    
        doc.save(`SP_Parking_Revenue_${monthNames[selectedMonth]}_${selectedYear}.pdf`);
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
                                    onClick={generatePDF} 
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
                                                        {revenueData.map((record, index) => (
                                                            <tr key={record._id} className="hover:bg-gray-50 transition-colors duration-150">
                                                                <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-900 font-medium">
                                                                    {index + 1}
                                                                </td>
                                                                <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-900 font-medium">
                                                                    {record.vehicleNumber}
                                                                </td>
                                                                <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-600">
                                                                    {record.vehicleDescription}
                                                                </td>
                                                                <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-600">
                                                                    {record.lotNumber || 'Open'}
                                                                </td>
                                                                <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-600">
                                                                    {capitalizeFirst(record.rentalType)}
                                                                </td>
                                                                <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-600">
                                                                    {record.transactionType}
                                                                </td>
                                                                <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-600">
                                                                    <span className="inline-flex items-center gap-1">
                                                                        <User className="w-4 h-4 text-gray-500" />
                                                                        {record.receivedBy || 'N/A'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-600">
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
                                                                <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-600">
                                                                    {new Date(record.transactionDate).toLocaleDateString('en-GB')}
                                                                </td>
                                                                <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-900 font-medium">
                                                                    ₹{record.revenueAmount.toFixed(2)}
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
        </div>
    );
}

export default RevenueDashboard;