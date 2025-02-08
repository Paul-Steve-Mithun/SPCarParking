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
    ArrowDown
} from 'lucide-react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function RevenueDashboard() {
    const [revenueData, setRevenueData] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [error, setError] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [stats, setStats] = useState({
        totalRevenue: 0,
        monthlyRentalRevenue: 0,
        dailyRentalRevenue: 0,
        vehicleCount: 0
    });

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June', 
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    useEffect(() => {
        fetchRevenueData();
    }, [selectedMonth, selectedYear]);

    const fetchRevenueData = async () => {
        try {
            const [dataResponse, statsResponse] = await Promise.all([
                fetch(`http://localhost:5000/revenue?month=${selectedMonth}&year=${selectedYear}`),
                fetch(`http://localhost:5000/revenueStats?month=${selectedMonth}&year=${selectedYear}`)
            ]);

            const data = await dataResponse.json();
            const statsData = await statsResponse.json();

            setRevenueData(data);
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
            if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
            if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        setRevenueData(sortedData);
    };

    const handleDeleteTransaction = async (transactionId) => {
        try {
            const response = await fetch(`http://localhost:5000/revenue/${transactionId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete transaction');
            }

            await fetchRevenueData();
            setError('');
        } catch (error) {
            setError('Failed to delete transaction');
            console.error('Error deleting transaction:', error);
        } finally {
            setIsDeleteDialogOpen(false);
            setSelectedTransaction(null);
        }
    };

    const generatePDF = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        
        // Modern header with gradient-like effect
        doc.setFillColor(79, 70, 229); // Primary color
        doc.rect(0, 0, pageWidth, 35, 'F'); // Reduced header height
        
        // Company name
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24); // Slightly larger font
        doc.setFont('helvetica', 'bold');
        doc.text('SP CAR PARKING', pageWidth / 2, 18, { align: 'center' });
        
        // Statement title
        doc.setFontSize(14);
        doc.text(`${monthNames[selectedMonth]} ${selectedYear} Revenue Statement`, pageWidth / 2, 28, { align: 'center' });
    
        // Summary cards section
        const summaryY = 45; // Reduced gap between header and cards
        const cardWidth = (pageWidth - 40) / 2;
        
        // Modern card styling
        doc.setFillColor(246, 246, 252); // Lighter purple/blue tint
        doc.roundedRect(14, summaryY, cardWidth, 30, 2, 2, 'F'); // Slightly taller cards
        doc.roundedRect(cardWidth + 26, summaryY, cardWidth, 30, 2, 2, 'F');
        
        // Card content with improved typography
        doc.setTextColor(79, 70, 229); // Match header color for labels
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Total Revenue', 20, summaryY + 12);
        doc.text('Total Transactions', cardWidth + 32, summaryY + 12);
        
        // Bold values with black color
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(`INR ${stats.totalRevenue.toFixed(2)}`, 20, summaryY + 25);
        doc.text(`${stats.vehicleCount}`, cardWidth + 32, summaryY + 25);
    
        // Table with modern styling
        const tableColumn = ['Vehicle Number', 'Description', 'Lot', 'Rental Type', 'Transaction', 'Amount'];
        const tableRows = revenueData.map(record => [
            record.vehicleNumber,
            record.vehicleDescription,
            record.lotNumber,
            record.rentalType,
            record.transactionType,
            `INR ${record.revenueAmount.toFixed(2)}`
        ]);
    
        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: summaryY + 40,
            theme: 'grid',
            headStyles: {
                fillColor: [79, 70, 229],
                textColor: [255, 255, 255],
                fontSize: 11,
                fontStyle: 'bold',
                cellPadding: 8,
                lineWidth: 0, // Remove border for modern look
            },
            bodyStyles: {
                fontSize: 10,
                cellPadding: 6,
                lineColor: [237, 237, 237], // Lighter grid lines
            },
            alternateRowStyles: {
                fillColor: [250, 250, 255], // Very subtle alternate row color
            },
            margin: { 
                top: 80,
                left: 10,  // Reduced left margin
                right: 10  // Reduced right margin
            },
            styles: {
                fontSize: 10,
                font: 'helvetica',
                cellWidth: 'auto',
                lineWidth: 0.1, // Thinner lines for grid
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

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 flex items-center">
                        <AlertCircle className="h-5 w-5 mr-2 text-red-600" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    <div className="bg-gradient-to-r from-green-500 to-green-600 p-6">
                        <div className="flex justify-between items-center">
                            <h1 className="text-4xl font-bold text-white">Revenue Dashboard</h1>
                            <button 
                                onClick={generatePDF} 
                                className="bg-white text-green-600 px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-50 transition-colors duration-200 shadow-md"
                            >
                                <Printer className="w-5 h-5" />
                                <span className="font-semibold">Export PDF</span>
                            </button>
                        </div>
                        
                        <div className="mt-8 flex gap-4">
                            <div className="relative">
                                <select 
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                    className="appearance-none bg-white bg-opacity-20 text-indigo-900 px-6 py-3 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 font-medium"
                                >
                                    {monthNames.map((month, index) => (
                                        <option key={index} value={index} className="text-gray-900">
                                            {month}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-black" />
                            </div>
                            <div className="relative">
                                <select 
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                    className="appearance-none bg-white bg-opacity-20 text-indigo-900 px-6 py-3 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 font-medium"
                                >
                                    {Array.from({ length: 5 }, (_, i) => selectedYear - 2 + i).map(year => (
                                        <option key={year} value={year} className="text-gray-900">
                                            {year}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-black" />
                            </div>
                        </div>
                    </div>

                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {revenueStats.map((stat, index) => (
                            <div 
                                key={index} 
                                className={`rounded-2xl p-6 bg-gradient-to-br ${stat.bgGradient} border border-white shadow-md hover:shadow-lg transition-all duration-200`}
                            >
                                <div className="flex items-center space-x-4">
                                    <div className="p-3 rounded-xl bg-white shadow-sm">{stat.icon}</div>
                                    <div>
                                        <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                                        <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    <div className="p-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Transaction History</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50">
                                        {['vehicleNumber', 'vehicleDescription', 'lotNumber', 'rentalType', 'transactionType', 'revenueAmount'].map((column) => (
                                            <th 
                                                key={column}
                                                onClick={() => handleSort(column)}
                                                className="px-6 py-4 text-left text-sm font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                            >
                                                {column.replace(/([A-Z])/g, ' $1').trim()}
                                                <SortIcon column={column} />
                                            </th>
                                        ))}
                                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {revenueData.map((record) => (
                                        <tr key={record._id} className="hover:bg-gray-50 transition-colors duration-150">
                                            <td className="px-6 py-4 text-sm text-gray-900 font-medium">{record.vehicleNumber}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{record.vehicleDescription}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{record.lotNumber}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{record.rentalType}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{record.transactionType}</td>
                                            <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                                                ₹{record.revenueAmount.toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button
                                                    onClick={() => {
                                                        setSelectedTransaction(record);
                                                        setIsDeleteDialogOpen(true);
                                                    }}
                                                    className="text-red-500 hover:text-red-700 transition-colors duration-200 p-2 rounded-lg hover:bg-red-50"
                                                >
                                                    <Trash2 className="w-5 h-5" />
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
                        <div className="fixed inset-0 bg-black bg-opacity-25" />
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
                                    </div>

                                    <div className="mt-6 flex justify-end space-x-4">
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