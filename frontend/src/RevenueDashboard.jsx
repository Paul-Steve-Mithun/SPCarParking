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
    Search
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
        vehicleCount: 0
    });

    useEffect(() => {
        const filtered = revenueData.filter(record => {
            const query = searchQuery.toLowerCase();
            return (
                record.vehicleNumber.toLowerCase().includes(query) ||
                (record.vehicleDescription || '').toLowerCase().includes(query)
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

            setStats({
                totalRevenue,
                monthlyRentalRevenue: monthlyStats.totalRevenue,
                dailyRentalRevenue: dailyStats.totalRevenue,
                vehicleCount
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
        const totalTableWidth = 35 + 50 + 20 + 40 + 35 + 25 + 30 + 35; // Sum of all column widths
        
        // Calculate left margin to center the table
        const leftMargin = (pageWidth - totalTableWidth) / 2;

        // Modern header with gradient-like effect
        doc.setFillColor(79, 70, 229);
        doc.rect(0, 0, pageWidth, 35, 'F');
        
        // Company name
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('SP CAR PARKING', pageWidth / 2, 18, { align: 'center' });
        
        // Statement title
        doc.setFontSize(14);
        doc.text(`${monthNames[selectedMonth]} ${selectedYear} Revenue Statement`, pageWidth / 2, 28, { align: 'center' });
    
        // Summary cards section
        const summaryY = 45;
        const cardWidth = (pageWidth - 40) / 2;
        
        // Modern card styling
        doc.setFillColor(246, 246, 252);
        doc.roundedRect(14, summaryY, cardWidth, 30, 2, 2, 'F');
        doc.roundedRect(cardWidth + 26, summaryY, cardWidth, 30, 2, 2, 'F');
        
        // Card content
        doc.setTextColor(79, 70, 229);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Total Revenue', 20, summaryY + 12);
        doc.text('Total Transactions', cardWidth + 32, summaryY + 12);
        
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(`INR ${stats.totalRevenue.toFixed(2)}`, 20, summaryY + 25);
        doc.text(`${stats.vehicleCount}`, cardWidth + 32, summaryY + 25);
    
        // Format date function
        const formatDateForPDF = (date) => {
            const d = new Date(date);
            return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        };
    
        // Updated table columns with better spacing
        const tableColumn = [
            { header: 'Vehicle Number', dataKey: 'vehicleNumber' },
            { header: 'Description', dataKey: 'description' },
            { header: 'Lot', dataKey: 'lot' },
            { header: 'Rental Type', dataKey: 'rentalType' },
            { header: 'Transaction', dataKey: 'transaction' },
            { header: 'Mode', dataKey: 'mode' },
            { header: 'Date', dataKey: 'date' },
            { header: 'Amount', dataKey: 'amount' }
        ];
    
        // Sort the table rows by date before adding to PDF
        const sortedTableRows = revenueData
            .sort((a, b) => {
                const dateA = new Date(a.transactionDate);
                const dateB = new Date(b.transactionDate);
                return dateA - dateB; // Always ascending order for PDF
            })
            .map(record => ({
                vehicleNumber: record.vehicleNumber || '',
                description: record.vehicleDescription || '',
                lot: record.lotNumber || 'Open',
                rentalType: capitalizeFirst(record.rentalType),
                transaction: record.transactionType || 'N/A',
                mode: record.transactionMode,
                date: formatDateForPDF(record.transactionDate),
                amount: `INR ${record.revenueAmount.toFixed(2)}`
            }));
    
        doc.autoTable({
            columns: tableColumn,
            body: sortedTableRows,
            startY: summaryY + 40,
            theme: 'grid',
            headStyles: {
                fillColor: [79, 70, 229],
                textColor: [255, 255, 255],
                fontSize: 10,
                fontStyle: 'bold',
                cellPadding: 6,
                halign: 'center',
                valign: 'middle',
                lineWidth: 0.1,
                minCellHeight: 14
            },
            bodyStyles: {
                fontSize: 9,
                cellPadding: 4,
                lineColor: [237, 237, 237],
                valign: 'middle'
            },
            columnStyles: {
                vehicleNumber: { cellWidth: 35, halign: 'center' },
                description: { cellWidth: 50, halign: 'left' },
                lot: { cellWidth: 20, halign: 'center' },
                rentalType: { cellWidth: 40, halign: 'center' },
                transaction: { cellWidth: 35, halign: 'center' },
                mode: { cellWidth: 25, halign: 'center' },
                date: { cellWidth: 30, halign: 'center' },
                amount: { cellWidth: 35, halign: 'center' }
            },
            alternateRowStyles: {
                fillColor: [250, 250, 255]
            },
            margin: { 
                left: leftMargin,
                right: leftMargin,
                top: 10,
                bottom: 10
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
            icon: <Car className="w-8 h-8 text-purple-600" />,
            label: "Total Transactions",
            value: stats.vehicleCount,
            bgGradient: "from-purple-50 to-purple-100"
        },
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

                        <div className="p-4 sm:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                                <h2 className="text-lg sm:text-xl font-bold text-gray-800 text-center sm:text-left">
                                    Transaction History
                                </h2>
                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <div className="w-full relative">
                                        <input
                                            type="text"
                                            placeholder="Search vehicle..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full px-4 py-2 pr-10 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                                        />
                                        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    </div>
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
                                                            {[
                                                                'vehicleNumber',
                                                                'vehicleDescription',
                                                                'lotNumber',
                                                                'rentalType',
                                                                'transactionType',
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
                                                        {revenueData.map((record) => (
                                                            <tr key={record._id} className="hover:bg-gray-50 transition-colors duration-150">
                                                                <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-900 font-medium">
                                                                    {record.vehicleNumber}
                                                                </td>
                                                                <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-600">
                                                                    {record.vehicleDescription}
                                                                </td>
                                                                <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-600">
                                                                    {record.lotNumber}
                                                                </td>
                                                                <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-600">
                                                                    {capitalizeFirst(record.rentalType)}
                                                                </td>
                                                                <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-600">
                                                                    {record.transactionType}
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