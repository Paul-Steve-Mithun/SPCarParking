import { useState, useEffect, Fragment } from 'react';
import { 
    DollarSign, 
    Calendar,
    Printer,
    Car,
    ChevronDown,
    Search,
    CreditCard,
    ArrowUp,
    ArrowDown,
    User,
    MapPin,
    IndianRupee,
    Wallet,
    Edit2,
    Save
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Dialog, Transition } from '@headlessui/react';

export function AdvanceDashboard() {
    const [vehicles, setVehicles] = useState([]);
    const [filteredVehicles, setFilteredVehicles] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [sortConfig, setSortConfig] = useState({ 
        key: 'startDate', 
        direction: 'asc' 
    });
    const [stats, setStats] = useState({
        totalAdvance: 0,
        monthlyAdvance: 0
    });
    const [showPayAdvanceModal, setShowPayAdvanceModal] = useState(false);
    const [zeroAdvanceVehicles, setZeroAdvanceVehicles] = useState([]);
    const [searchZeroAdvance, setSearchZeroAdvance] = useState('');
    const [selectedZeroAdvanceVehicle, setSelectedZeroAdvanceVehicle] = useState(null);
    const [isEditingAdvance, setIsEditingAdvance] = useState(false);
    const [newAdvanceAmount, setNewAdvanceAmount] = useState('');
    const [advanceTransactionMode, setAdvanceTransactionMode] = useState('Cash');
    const [isSavingAdvance, setIsSavingAdvance] = useState(false);
    const [receivedBy, setReceivedBy] = useState('Balu');

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June', 
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const sortVehiclesByDate = (data) => {
        return [...data].sort((a, b) => {
            const dateA = new Date(a.startDate || a.refundDate);
            const dateB = new Date(b.startDate || b.refundDate);
            return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
        });
    };

    const fetchData = async () => {
        try {
            const [vehiclesResponse, totalsResponse] = await Promise.all([
                fetch(`https://spcarparkingbknd.onrender.com/advances?month=${selectedMonth}&year=${selectedYear}`),
                fetch(`https://spcarparkingbknd.onrender.com/advances/total?month=${selectedMonth}&year=${selectedYear}`)
            ]);

            const vehiclesData = await vehiclesResponse.json();
            const totalsData = await totalsResponse.json();

            // Filter out zero advance transactions
            const nonZeroTransactions = vehiclesData.filter(v => 
                v.advanceAmount > 0 || v.advanceRefund > 0
            );

            // Sort transactions by date (latest first)
            const sortedData = nonZeroTransactions.sort((a, b) => {
                const dateA = new Date(a.refundDate || a.startDate);
                const dateB = new Date(b.refundDate || b.startDate);
                return dateB - dateA; // Sort in descending order (latest first)
            });

            setVehicles(sortedData);
            setFilteredVehicles(sortedData);

            setStats({
                totalAdvance: totalsData.totalAmount || 0,
                monthlyAdvance: calculateMonthlyAdvance(vehiclesData)
            });

        } catch (error) {
            console.error('Failed to fetch data:', error);
            toast.error('Failed to fetch data');
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedMonth, selectedYear]);

    useEffect(() => {
        const filtered = vehicles
            .filter(vehicle => 
                // First filter out zero advance transactions
                (vehicle.advanceAmount > 0 || vehicle.advanceRefund > 0) &&
                // Then apply search filter
                (vehicle.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (vehicle.vehicleDescription || '').toLowerCase().includes(searchQuery.toLowerCase()))
            );
        setFilteredVehicles(filtered);
    }, [searchQuery, vehicles]);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });

        const sortedData = [...vehicles].sort((a, b) => {
            if (key === 'TransactionDate') {
                const dateA = new Date(a.refundDate || a.startDate);
                const dateB = new Date(b.refundDate || b.startDate);
                return direction === 'asc' ? dateA - dateB : dateB - dateA;
            }
            if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
            if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        setVehicles(sortedData);
        setFilteredVehicles(sortedData);
    };

    const SortIcon = ({ column }) => {
        if (sortConfig.key !== column) {
            return <ChevronDown className="w-4 h-4 ml-1" />;
        }
        return sortConfig.direction === 'asc' ? 
            <ArrowUp className="w-4 h-4 ml-1" /> : 
            <ArrowDown className="w-4 h-4 ml-1" />;
    };

    const generatePDF = () => {
        const doc = new jsPDF('landscape');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        // Header section
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
        doc.text(`${monthNames[selectedMonth]} ${selectedYear} Advance Payment Statement (Generated: ${formattedDate})`, pageWidth / 2, 28, { align: 'center' });

        // Summary cards section - 2 cards centered
        const summaryY = 45;
        const cardWidth = (pageWidth - 100) / 2; // 2 cards with margins
        const cardHeight = 35;
        const centerOffset = 50; // Margin from left to center the cards

        // Card 1 - Monthly Advance (Net)
        doc.setFillColor(246, 246, 252);
        doc.roundedRect(centerOffset, summaryY, cardWidth, cardHeight, 2, 2, 'F');
        doc.setTextColor(79, 70, 229);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Monthly Advance (Net)', centerOffset + 6, summaryY + 12);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        if (stats.monthlyAdvance < 0) {
            doc.setTextColor(239, 68, 68);
            doc.text(`-INR ${Math.abs(stats.monthlyAdvance).toFixed(2)}`, centerOffset + 6, summaryY + 28);
        } else {
            doc.text(`INR ${stats.monthlyAdvance.toFixed(2)}`, centerOffset + 6, summaryY + 28);
        }

        // Card 2 - Total Advance Till Date
        doc.setFillColor(246, 246, 252);
        doc.roundedRect(centerOffset + cardWidth + 10, summaryY, cardWidth, cardHeight, 2, 2, 'F');
        doc.setTextColor(79, 70, 229);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Total Advance (Till Date)', centerOffset + cardWidth + 16, summaryY + 12);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(`INR ${stats.totalAdvance.toFixed(2)}`, centerOffset + cardWidth + 16, summaryY + 28);

        // Format date function
        const formatDateForPDF = (date) => {
            const d = new Date(date);
            return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        };

        // Updated table columns with better spacing
        const tableColumn = [
            { header: 'S.No', dataKey: 'sno' },
            { header: 'Vehicle Number', dataKey: 'vehicleNumber' },
            { header: 'Description', dataKey: 'description' },
            { header: 'Lot', dataKey: 'lot' },
            { header: 'Mode', dataKey: 'mode' },
            { header: 'Date', dataKey: 'date' },
            { header: 'Amount', dataKey: 'amount' }
        ];

        // First, calculate the total table width and margins
        const totalTableWidth = 20 + 35 + 50 + 20 + 35 + 30 + 35; // Sum of column widths including S.No
        const leftMargin = (pageWidth - totalTableWidth) / 2;

        // Update the tableRows to include S.No
        const tableRows = vehicles.map((vehicle, index) => {
            const isRefund = !!vehicle.advanceRefund;
            const amount = isRefund 
                ? vehicle.advanceRefund 
                : (vehicle.advanceAmount || 0);

            return {
                sno: (index + 1).toString(),
                vehicleNumber: vehicle.vehicleNumber || '',
                description: vehicle.vehicleDescription || '',
                lot: vehicle.lotNumber || 'Open',
                mode: vehicle.transactionMode || 'Cash',
                date: formatDateForPDF(vehicle.refundDate || vehicle.startDate),
                amount: `${isRefund ? '(-) ' : '(+) '}INR ${amount.toFixed(2)}`,
                isRefund: isRefund,
                rawAmount: isRefund ? -amount : amount
            };
        });

        // Update the autoTable configuration
        doc.autoTable({
            columns: tableColumn,
            body: tableRows,
            startY: summaryY + cardHeight + 20,
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
                sno: { cellWidth: 20, halign: 'center' },
                vehicleNumber: { cellWidth: 35, halign: 'center' },
                description: { cellWidth: 50, halign: 'left' },
                lot: { cellWidth: 20, halign: 'center' },
                mode: { cellWidth: 35, halign: 'center' },
                date: { cellWidth: 30, halign: 'center' },
                amount: { cellWidth: 35, halign: 'center' }
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
            willDrawCell: function(data) {
                if (data.section === 'body') {
                    const row = data.row.raw;
                    const isNegativeAmount = row.rawAmount < 0;
                    
                    if (isNegativeAmount || row.isRefund) {
                        data.cell.styles.fillColor = [255, 235, 235];
                        data.cell.styles.textColor = [220, 50, 50];
                    } else {
                        data.cell.styles.fillColor = data.row.index % 2 === 0 ? [255, 255, 255] : [250, 250, 255];
                        data.cell.styles.textColor = [0, 0, 0];
                    }
                }
            },
            didDrawPage: function(data) {
                doc.setFontSize(10);
                doc.text(
                    `Page ${data.pageNumber}`, 
                    pageWidth / 2, 
                    pageHeight - 10, 
                    { align: 'center' }
                );
            }
        });

        doc.save(`SP_Parking_Advance_${monthNames[selectedMonth]}_${selectedYear}.pdf`);
    };

    const calculateMonthlyAdvance = (vehicles) => {
        // Calculate incoming advances (new vehicles)
        const incomingAmount = vehicles
            .filter(v => {
                const startDate = new Date(v.startDate);
                return startDate.getMonth() === selectedMonth && 
                       startDate.getFullYear() === selectedYear &&
                       v.advanceAmount > 0 && // Only count positive advance amounts
                       !v.advanceRefund; // Exclude refund records
            })
            .reduce((total, vehicle) => total + (vehicle.advanceAmount || 0), 0);

        // Calculate outgoing refunds
        const outgoingAmount = vehicles
            .filter(v => {
                const refundDate = v.refundDate;
                return refundDate && // Only include records with refund date
                       new Date(refundDate).getMonth() === selectedMonth && 
                       new Date(refundDate).getFullYear() === selectedYear &&
                       v.advanceRefund; // Only include records with refund amount
            })
            .reduce((total, vehicle) => total + (vehicle.advanceRefund || 0), 0);

        return incomingAmount - outgoingAmount;
    };

    const fetchVehicles = async (searchTerm = '') => {
        try {
            const response = await fetch(`https://spcarparkingbknd.onrender.com/vehicles/search?query=${searchTerm}`);
            const data = await response.json();
            setZeroAdvanceVehicles(data);
        } catch (error) {
            toast.error('Failed to fetch vehicles');
        }
    };

    useEffect(() => {
        fetchVehicles(searchZeroAdvance);
    }, [searchZeroAdvance]);

    const handlePayAdvance = async () => {
        if (isSavingAdvance) return; // Prevent double submission
        setIsSavingAdvance(true);
        try {
            const response = await fetch(`https://spcarparkingbknd.onrender.com/vehicles/update-advance/${selectedZeroAdvanceVehicle._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    advanceAmount: Number(newAdvanceAmount),
                    transactionMode: advanceTransactionMode,
                    receivedBy: receivedBy
                }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success(data.message || 'Advance payment updated successfully');
                setShowPayAdvanceModal(false);
                setSelectedZeroAdvanceVehicle(null);
                setIsEditingAdvance(false);
                setNewAdvanceAmount('');
                await fetchData(); // Wait for data refresh
                await fetchVehicles(); // Refresh the vehicles list
            } else {
                throw new Error(data.error || 'Failed to update advance payment');
            }
        } catch (error) {
            toast.error(error.message || 'Error updating advance payment');
        } finally {
            setIsSavingAdvance(false);
        }
    };

    return (
        <div className="relative">
            <Toaster position="bottom-right" />
            
            <div className="min-h-screen bg-gray-50 p-2 sm:p-6 transition-all duration-300">
                <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
                    {/* First Main Div - Header, Filters and Stats */}
                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6">
                        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center sm:text-left">
                                    Advance Payment Dashboard
                                </h1>
                                <button 
                                    onClick={generatePDF} 
                                    className="w-full sm:w-auto bg-white text-orange-600 px-4 py-2.5 rounded-lg flex items-center justify-center space-x-2 hover:bg-gray-50 transition-colors duration-200 shadow-md"
                                >
                                    <Printer className="w-5 h-5" />
                                    <span className="font-semibold">Export PDF</span>
                                </button>
                            </div>
                            
                            <div className="mt-6 flex flex-col sm:flex-row gap-4">
                                <div className="relative w-full sm:w-48">
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
                                <div className="relative w-full sm:w-32">
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
                                <div className="w-full sm:w-auto">
                                    <button
                                        onClick={() => {
                                            setShowPayAdvanceModal(true);
                                            fetchVehicles();
                                        }}
                                        className="w-full px-4 py-3 bg-white text-orange-600 rounded-xl hover:bg-gray-50 flex items-center justify-center gap-2 font-medium shadow-md transition-colors duration-200"
                                    >
                                        <IndianRupee className="w-5 h-5" />
                                        Pay Advance
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Stats Cards */}
                        <div className="p-4 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Monthly Advance Card */}
                            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-4 sm:p-6 border border-white shadow-md hover:shadow-lg transition-all duration-200">
                                <div className="flex items-center space-x-4">
                                    <div className="p-3 rounded-xl bg-white shadow-sm">
                                        <Calendar className="w-6 h-6 text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="text-gray-600 text-sm font-medium">Monthly Advance (Net)</p>
                                        <p className={`text-lg sm:text-2xl font-bold ${stats.monthlyAdvance < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                            {stats.monthlyAdvance < 0 ? '-' : ''}₹{Math.abs(stats.monthlyAdvance).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Total Advance Card */}
                            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-4 sm:p-6 border border-white shadow-md hover:shadow-lg transition-all duration-200">
                                <div className="flex items-center space-x-4">
                                    <div className="p-3 rounded-xl bg-white shadow-sm">
                                        <DollarSign className="w-6 h-6 text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="text-gray-600 text-sm font-medium">Total Advance (Till Date)</p>
                                        <p className="text-lg sm:text-2xl font-bold text-gray-900">₹{stats.totalAdvance.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Second Main Div - Transaction History and Table */}
                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                        <div className="p-4 sm:p-6">
                            <div className="flex flex-col space-y-4">
                                <h2 className="text-xl font-bold text-gray-900 mb-4 text-center sm:text-left">
                                    Transaction History
                                </h2>
                                
                                <div className="relative w-full mb-6">
                                    <input
                                        type="text"
                                        placeholder="Search transactions..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    />
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                </div>
                            </div>

                            <div className="overflow-x-auto -mx-6 sm:mx-0">
                                <div className="max-w-[1400px] mx-auto">
                                    <div className="inline-block min-w-full align-middle">
                                        <div className="overflow-hidden">
                                            {filteredVehicles.length === 0 ? (
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
                                                                'parkingType',
                                                                'receivedBy',
                                                                'transactionMode',
                                                                'TransactionDate',
                                                                'advanceAmount'
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
                                                    <tbody className="bg-white divide-y divide-gray-200">
                                                        {filteredVehicles.map((vehicle, index) => (
                                                            <tr 
                                                                key={vehicle._id} 
                                                                className={`transition-colors duration-150 ${
                                                                    vehicle.advanceRefund ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'
                                                                }`}
                                                            >
                                                                <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                                                                    {index + 1}
                                                                </td>
                                                                <td className="px-4 sm:px-6 py-4 text-xs sm:text-sm text-gray-900 font-medium">
                                                                    {vehicle.vehicleNumber}
                                                                </td>
                                                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600 max-w-[150px] truncate">
                                                                    {vehicle.vehicleDescription}
                                                                </td>
                                                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">
                                                                    {vehicle.lotNumber || 'Open'}
                                                                </td>
                                                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">
                                                                    {vehicle.parkingType === 'private' ? 'Private' : 'Open'}
                                                                </td>
                                                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">
                                                                    <span className="inline-flex items-center gap-1">
                                                                        <User className="w-4 h-4 text-gray-500" />
                                                                        {vehicle.receivedBy || 'N/A'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-3 sm:px-6 py-3 sm:py-4">
                                                                    <span className={`inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium ${
                                                                        vehicle.transactionMode === 'UPI' 
                                                                            ? 'bg-blue-100 text-blue-800' 
                                                                            : 'bg-green-100 text-green-800'
                                                                    }`}>
                                                                        {vehicle.transactionMode === 'UPI' ? (
                                                                            <>
                                                                                <CreditCard className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
                                                                                <span>UPI</span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-1.5" />
                                                                                <span>Cash</span>
                                                                            </>
                                                                        )}
                                                                    </span>
                                                                </td>
                                                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">
                                                                    {vehicle.advanceRefund 
                                                                        ? new Date(vehicle.refundDate).toLocaleDateString('en-GB')
                                                                        : new Date(vehicle.startDate).toLocaleDateString('en-GB')}
                                                                </td>
                                                                <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium">
                                                                    <span className={vehicle.advanceRefund ? 'text-red-600' : 'text-gray-900'}>
                                                                        {vehicle.advanceRefund 
                                                                            ? `-₹${vehicle.advanceRefund}`
                                                                            : `₹${vehicle.advanceAmount}`}
                                                                    </span>
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

            <Transition appear show={showPayAdvanceModal} as={Fragment}>
                <Dialog 
                    as="div" 
                    className="relative z-50" 
                    onClose={() => {
                        setShowPayAdvanceModal(false);
                        setSelectedZeroAdvanceVehicle(null);
                        setIsEditingAdvance(false);
                        setNewAdvanceAmount('');
                    }}
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
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                                    <Dialog.Title as="h3" className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                                        {selectedZeroAdvanceVehicle ? (
                                            <>
                                                <Car className="w-6 h-6 text-blue-600" />
                                                Vehicle Details
                                            </>
                                        ) : (
                                            <>
                                                <IndianRupee className="w-6 h-6 text-green-600" />
                                                Pay Advance
                                            </>
                                        )}
                                    </Dialog.Title>
                                    <div className="h-0.5 bg-gray-200 w-full mb-4"></div>

                                    {!selectedZeroAdvanceVehicle ? (
                                        <>
                                            <div className="relative mb-4">
                                                <input
                                                    type="text"
                                                    placeholder="Search any vehicle..."
                                                    value={searchZeroAdvance}
                                                    onChange={(e) => setSearchZeroAdvance(e.target.value)}
                                                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                            </div>

                                            <div className="max-h-[400px] overflow-y-auto">
                                                {zeroAdvanceVehicles.map(vehicle => (
                                                    <button
                                                        key={vehicle._id}
                                                        onClick={() => setSelectedZeroAdvanceVehicle(vehicle)}
                                                        className="w-full text-left p-4 hover:bg-gray-50 border-b flex items-center gap-4"
                                                    >
                                                        <div className="p-2 rounded-full bg-gray-100">
                                                            <Car className="text-blue-500 w-6 h-6" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <p className="font-medium">{vehicle.vehicleNumber}</p>
                                                                {vehicle.advanceAmount > 0 && (
                                                                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                                                                        ₹{vehicle.advanceAmount} paid
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-gray-500">{vehicle.vehicleDescription}</p>
                                                        </div>
                                                        <ChevronDown className="w-5 h-5 text-gray-400" />
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Vehicle Number</label>
                                                    <input
                                                        type="text"
                                                        value={selectedZeroAdvanceVehicle.vehicleNumber}
                                                        disabled
                                                        className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Description</label>
                                                    <input
                                                        type="text"
                                                        value={selectedZeroAdvanceVehicle.vehicleDescription}
                                                        disabled
                                                        className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Owner Name</label>
                                                    <input
                                                        type="text"
                                                        value={selectedZeroAdvanceVehicle.ownerName}
                                                        disabled
                                                        className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700">Lot Number</label>
                                                    <input
                                                        type="text"
                                                        value={selectedZeroAdvanceVehicle.lotNumber}
                                                        disabled
                                                        className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-2">
                                                        <label className="block text-sm font-medium text-gray-700">Advance Amount</label>
                                                        {selectedZeroAdvanceVehicle.advanceAmount > 0 && (
                                                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                                                                ₹{selectedZeroAdvanceVehicle.advanceAmount} already paid
                                                            </span>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={() => setIsEditingAdvance(!isEditingAdvance)}
                                                        className="text-blue-600 hover:text-blue-700 p-1 hover:bg-blue-50 rounded-full transition-colors"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <input
                                                    type="number"
                                                    value={newAdvanceAmount}
                                                    onChange={(e) => setNewAdvanceAmount(e.target.value)}
                                                    disabled={!isEditingAdvance}
                                                    className={`mt-1 block w-full px-3 py-2 ${!isEditingAdvance ? 'bg-gray-50' : 'bg-white'} border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
                                                    placeholder="Enter additional advance amount"
                                                />

                                                <div className="grid grid-cols-2 gap-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => setAdvanceTransactionMode('Cash')}
                                                        className={`relative px-4 py-2 rounded-lg flex items-center justify-center transition-all duration-200 ${
                                                            advanceTransactionMode === 'Cash'
                                                                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/50 transform scale-[1.02]'
                                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                        }`}
                                                    >
                                                        <Wallet className="h-5 w-5 mr-2" />
                                                        Cash
                                                        {advanceTransactionMode === 'Cash' && (
                                                            <span className="absolute -right-1 -top-1 w-3 h-3 bg-green-500 rounded-full"></span>
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setAdvanceTransactionMode('UPI')}
                                                        className={`relative px-4 py-2 rounded-lg flex items-center justify-center transition-all duration-200 ${
                                                            advanceTransactionMode === 'UPI'
                                                                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/50 transform scale-[1.02]'
                                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                        }`}
                                                    >
                                                        <CreditCard className="h-5 w-5 mr-2" />
                                                        UPI
                                                        {advanceTransactionMode === 'UPI' && (
                                                            <span className="absolute -right-1 -top-1 w-3 h-3 bg-green-500 rounded-full"></span>
                                                        )}
                                                    </button>
                                                </div>

                                                <div className="mt-4">
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Received By</label>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <button
                                                            type="button"
                                                            onClick={() => setReceivedBy('Balu')}
                                                            className={`relative px-4 py-2 rounded-lg flex items-center justify-center transition-all duration-200 ${
                                                                receivedBy === 'Balu'
                                                                    ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/50 transform scale-[1.02]'
                                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                            }`}
                                                        >
                                                            <User className="h-5 w-5 mr-2" />
                                                            Balu
                                                            {receivedBy === 'Balu' && (
                                                                <span className="absolute -right-1 -top-1 w-3 h-3 bg-green-500 rounded-full"></span>
                                                            )}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setReceivedBy('Mani')}
                                                            className={`relative px-4 py-2 rounded-lg flex items-center justify-center transition-all duration-200 ${
                                                                receivedBy === 'Mani'
                                                                    ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/50 transform scale-[1.02]'
                                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                            }`}
                                                        >
                                                            <User className="h-5 w-5 mr-2" />
                                                            Mani
                                                            {receivedBy === 'Mani' && (
                                                                <span className="absolute -right-1 -top-1 w-3 h-3 bg-green-500 rounded-full"></span>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-6 flex justify-end gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedZeroAdvanceVehicle(null);
                                                        setIsEditingAdvance(false);
                                                        setNewAdvanceAmount('');
                                                    }}
                                                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handlePayAdvance}
                                                    disabled={!isEditingAdvance || !newAdvanceAmount || isSavingAdvance}
                                                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                >
                                                    {isSavingAdvance ? (
                                                        <>
                                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                            <span>Saving...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Save className="w-4 h-4" />
                                                            <span>Pay Advance</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </div>
    );
}

export default AdvanceDashboard; 