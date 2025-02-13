import { useState, useEffect } from 'react';
import { 
    DollarSign, 
    Calendar,
    Printer,
    Car,
    ChevronDown,
    Search,
    CreditCard,
    ArrowUp,
    ArrowDown
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function AdvanceDashboard() {
    const [vehicles, setVehicles] = useState([]);
    const [filteredVehicles, setFilteredVehicles] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [stats, setStats] = useState({
        totalAdvance: 0,
        vehicleCount: 0,
        totalRefund: 0
    });
    const [totalAdvance, setTotalAdvance] = useState(0);

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June', 
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    useEffect(() => {
        fetchVehicles();
        fetchTotalAdvance();
    }, [selectedMonth, selectedYear]);

    useEffect(() => {
        const filtered = vehicles.filter(vehicle => 
            vehicle.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            vehicle.vehicleDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
            vehicle.ownerName.toUpperCase().includes(searchQuery)
        );
        setFilteredVehicles(filtered);
    }, [searchQuery, vehicles]);

    const fetchVehicles = async () => {
        try {
            const response = await fetch(`https://spcarparkingbknd.onrender.com/advances?month=${selectedMonth}&year=${selectedYear}`);
            const data = await response.json();

            setVehicles(data);
            setFilteredVehicles(data);

            // Calculate stats
            const statsData = {
                incomingVehicles: calculateIncomingVehicles(data),
                outgoingVehicles: calculateOutgoingVehicles(data),
                monthlyAdvance: calculateMonthlyAdvance(data),
                totalAdvanceTillDate: calculateTotalAdvanceTillDate(data)
            };
            setStats(statsData);
        } catch (error) {
            toast.error('Failed to fetch advances');
        }
    };

    const fetchTotalAdvance = async () => {
        try {
            const response = await fetch(`https://spcarparkingbknd.onrender.com/advances/total?month=${selectedMonth}&year=${selectedYear}`);
            const data = await response.json();
            setTotalAdvance(data.totalAmount);
            setStats(prev => ({
                ...prev,
                incomingCount: data.incomingCount,
                outgoingCount: data.outgoingCount
            }));
        } catch (error) {
            console.error('Failed to fetch total advance:', error);
        }
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });

        const sortedData = [...vehicles].sort((a, b) => {
            if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
            if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        setVehicles(sortedData);
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
        doc.text(`${monthNames[selectedMonth]} ${selectedYear} Advance Payment Statement`, pageWidth / 2, 28, { align: 'center' });

        // Summary cards section - 4 cards in a row
        const summaryY = 45;
        const cardWidth = (pageWidth - 70) / 4; // 4 cards with margins
        const cardHeight = 35;
        
        // Card 1 - Incoming Vehicles
        doc.setFillColor(246, 246, 252);
        doc.roundedRect(14, summaryY, cardWidth, cardHeight, 2, 2, 'F');
        doc.setTextColor(79, 70, 229);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Incoming Vehicles', 20, summaryY + 12);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(`${stats.incomingCount}`, 20, summaryY + 28);

        // Card 2 - Outgoing Vehicles
        doc.setFillColor(246, 246, 252);
        doc.roundedRect(cardWidth + 24, summaryY, cardWidth, cardHeight, 2, 2, 'F');
        doc.setTextColor(79, 70, 229);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Outgoing Vehicles', cardWidth + 30, summaryY + 12);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(`${stats.outgoingCount}`, cardWidth + 30, summaryY + 28);

        // Card 3 - Monthly Advance (Net)
        doc.setFillColor(246, 246, 252);
        doc.roundedRect((cardWidth * 2) + 34, summaryY, cardWidth, cardHeight, 2, 2, 'F');
        doc.setTextColor(79, 70, 229);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Monthly Advance (Net)', (cardWidth * 2) + 40, summaryY + 12);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        if (stats.monthlyAdvance < 0) {
            doc.setTextColor(239, 68, 68); // text-red-500
            doc.text(`-INR ${Math.abs(stats.monthlyAdvance).toFixed(2)}`, (cardWidth * 2) + 40, summaryY + 28);
        } else {
            doc.text(`INR ${stats.monthlyAdvance.toFixed(2)}`, (cardWidth * 2) + 40, summaryY + 28);
        }

        // Card 4 - Total Advance Till Date
        doc.setFillColor(246, 246, 252);
        doc.roundedRect((cardWidth * 3) + 44, summaryY, cardWidth, cardHeight, 2, 2, 'F');
        doc.setTextColor(79, 70, 229);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Total Advance (Till Date)', (cardWidth * 3) + 50, summaryY + 12);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(`INR ${totalAdvance.toFixed(2)}`, (cardWidth * 3) + 50, summaryY + 28);

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
            { header: 'Mode', dataKey: 'mode' },
            { header: 'Date', dataKey: 'date' },
            { header: 'Amount', dataKey: 'amount' }
        ];

        // First, calculate the total table width and margins
        const totalTableWidth = 35 + 50 + 20 + 35 + 30 + 35; // Sum of column widths
        const leftMargin = (pageWidth - totalTableWidth) / 2;

        // Update the tableRows to better handle refund information
        const tableRows = vehicles.map(vehicle => {
            const isRefund = !!vehicle.advanceRefund;
            const amount = isRefund 
                ? vehicle.advanceRefund 
                : (vehicle.advanceAmount || 0);

            return {
                vehicleNumber: vehicle.vehicleNumber || '',
                description: vehicle.vehicleDescription || '',
                lot: vehicle.lotNumber || '',
                mode: vehicle.transactionMode || 'Cash',
                date: formatDateForPDF(vehicle.refundDate || vehicle.startDate),
                amount: `${isRefund ? '(-) ' : '(+) '}INR ${amount.toFixed(2)}`,
                isRefund: isRefund,
                rawAmount: isRefund ? -amount : amount // Store raw amount for sorting
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
    
    const calculateIncomingVehicles = (vehicles) => {
        return vehicles.filter(v => {
            const startDate = new Date(v.startDate);
            return startDate.getMonth() === selectedMonth && 
                   startDate.getFullYear() === selectedYear &&
                   v.advanceAmount > 0 && // Only count new advances
                   !v.advanceRefund; // Exclude refund records
        }).length;
    };

    const calculateOutgoingVehicles = (vehicles) => {
        return vehicles.filter(v => {
            const refundDate = v.refundDate;
            return refundDate && // Only count vehicles with refund date
                   new Date(refundDate).getMonth() === selectedMonth && 
                   new Date(refundDate).getFullYear() === selectedYear;
        }).length;
    };

    const calculateTotalAdvanceTillDate = (vehicles) => {
        // Sum all advances
        const totalAdvances = vehicles
            .filter(v => !v.advanceRefund) // Exclude refund records
            .reduce((total, vehicle) => total + (vehicle.advanceAmount || 0), 0);

        // Sum all refunds
        const totalRefunds = vehicles
            .filter(v => v.advanceRefund) // Only include refund records
            .reduce((total, vehicle) => total + (vehicle.advanceRefund || 0), 0);

        return totalAdvances - totalRefunds;
    };

    return (
        <div className="relative">
            <Toaster position="bottom-right" />
            
            <div className="min-h-screen bg-gray-50 p-2 sm:p-6 transition-all duration-300">
                <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
                    {/* First Main Div - Header, Filters and Stats */}
                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                        <div className="bg-gradient-to-r from-orange-500 to-amber-600 p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center sm:text-left">
                                    Advance Payment Dashboard
                                </h1>
                                <button 
                                    onClick={generatePDF} 
                                    className="w-full sm:w-auto bg-white text-orange-600 px-4 py-2 rounded-lg flex items-center justify-center space-x-2 hover:bg-gray-50 transition-colors duration-200 shadow-md"
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
                            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4 sm:p-6 border border-white shadow-md hover:shadow-lg transition-all duration-200">
                                <div className="flex items-center space-x-4">
                                    <div className="p-3 rounded-xl bg-white shadow-sm">
                                        <ArrowUp className="w-8 h-8 text-green-600" />
                                    </div>
                                    <div>
                                        <p className="text-gray-600 text-sm font-medium">Incoming Vehicles</p>
                                        <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.incomingCount}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl p-4 sm:p-6 border border-white shadow-md hover:shadow-lg transition-all duration-200">
                                <div className="flex items-center space-x-4">
                                    <div className="p-3 rounded-xl bg-white shadow-sm">
                                        <ArrowDown className="w-8 h-8 text-red-600" />
                                    </div>
                                    <div>
                                        <p className="text-gray-600 text-sm font-medium">Outgoing Vehicles</p>
                                        <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.outgoingCount}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-4 sm:p-6 border border-white shadow-md hover:shadow-lg transition-all duration-200">
                                <div className="flex items-center space-x-4">
                                    <div className="p-3 rounded-xl bg-white shadow-sm">
                                        <DollarSign className="w-8 h-8 text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="text-gray-600 text-sm font-medium">Monthly Advance (Net)</p>
                                        <p className={`text-lg sm:text-2xl font-bold ${stats.monthlyAdvance < 0 ? 'text-red-500' : 'text-gray-900'}`}>
                                            {stats.monthlyAdvance < 0 ? '-₹' : '₹'}
                                            {Math.abs(stats.monthlyAdvance).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 sm:p-6 border border-white shadow-md hover:shadow-lg transition-all duration-200">
                                <div className="flex items-center space-x-4">
                                    <div className="p-3 rounded-xl bg-white shadow-sm">
                                        <DollarSign className="w-8 h-8 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="text-gray-600 text-sm font-medium">Total Advance (Till {monthNames[selectedMonth]} {selectedYear})</p>
                                        <p className="text-lg sm:text-2xl font-bold text-gray-900">₹{totalAdvance.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Second Main Div - Transaction History and Table */}
                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                        <div className="p-4 sm:p-6">
                            <div className="flex flex-col space-y-4">
                                <h2 className="text-lg sm:text-xl font-bold text-gray-800 text-center sm:text-left">
                                    Transaction History
                                </h2>
                                <div className="w-full relative">
                                    <input
                                        type="text"
                                        placeholder="Search Vehicle..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full px-4 py-2 pr-10 rounded-lg border border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none"
                                    />
                                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                </div>
                            </div>
                        </div>

                        {/* Table section remains the same */}
                        <div className="overflow-x-auto">
                            <div className="max-w-[1400px] mx-auto">
                                <div className="inline-block min-w-full align-middle">
                                    <div className="overflow-hidden">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead>
                                                <tr className="bg-gray-50">
                                                    {[
                                                        'vehicleNumber',
                                                        'vehicleDescription',
                                                        'lotNumber',
                                                        'parkingType',
                                                        'transactionMode',
                                                        'startDate',
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
                                                {filteredVehicles.map((vehicle) => (
                                                    <tr 
                                                        key={vehicle._id} 
                                                        className={`transition-colors duration-150 ${
                                                            vehicle.advanceRefund ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                                                            {vehicle.vehicleNumber}
                                                        </td>
                                                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600 max-w-[150px] truncate">
                                                            {vehicle.vehicleDescription}
                                                        </td>
                                                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">
                                                            {vehicle.lotNumber}
                                                        </td>
                                                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">
                                                            {vehicle.parkingType === 'private' ? 'Private' : 'Open'}
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
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdvanceDashboard; 