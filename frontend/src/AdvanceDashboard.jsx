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
        vehicleCount: 0
    });

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June', 
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    useEffect(() => {
        fetchVehicles();
    }, [selectedMonth, selectedYear]);

    useEffect(() => {
        const filtered = vehicles.filter(vehicle => 
            vehicle.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            vehicle.vehicleDescription.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredVehicles(filtered);
    }, [searchQuery, vehicles]);

    const fetchVehicles = async () => {
        try {
            const response = await fetch('https://spcarparkingbknd.onrender.com/vehicles');
            const data = await response.json();
            // Filter monthly rental vehicles
            const monthlyVehicles = data.filter(v => {
                const vehicleDate = new Date(v.startDate);
                return v.rentalType === 'monthly' && 
                       vehicleDate.getMonth() === selectedMonth &&
                       vehicleDate.getFullYear() === selectedYear;
            });
            setVehicles(monthlyVehicles);
            setFilteredVehicles(monthlyVehicles);

            // Calculate stats
            const statsData = {
                totalAdvance: monthlyVehicles.reduce((sum, v) => sum + (v.advanceAmount || 0), 0),
                vehicleCount: monthlyVehicles.length
            };
            setStats(statsData);
        } catch (error) {
            toast.error('Failed to fetch vehicles');
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
        
        // Calculate total table width based on column widths
        const totalTableWidth = 35 + 50 + 20 + 35 + 30 + 35; // Sum of all column widths
        
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
        doc.text(`${monthNames[selectedMonth]} ${selectedYear} Advance Payment Statement`, pageWidth / 2, 28, { align: 'center' });

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
        doc.text('Total Advance Amount', 20, summaryY + 12);
        doc.text('Total Vehicles', cardWidth + 32, summaryY + 12);
        
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(`INR ${stats.totalAdvance.toFixed(2)}`, 20, summaryY + 25);
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
            { header: 'Mode', dataKey: 'mode' },
            { header: 'Date', dataKey: 'date' },
            { header: 'Amount', dataKey: 'amount' }
        ];

        const tableRows = vehicles.map(vehicle => ({
            vehicleNumber: vehicle.vehicleNumber || '',
            description: vehicle.vehicleDescription || '',
            lot: vehicle.lotNumber || '',
            mode: vehicle.transactionMode || 'Cash',
            date: formatDateForPDF(vehicle.startDate),
            amount: `INR ${(vehicle.advanceAmount || 0).toFixed(2)}`
        }));

        doc.autoTable({
            columns: tableColumn,
            body: tableRows,
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
                mode: { cellWidth: 35, halign: 'center' },
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

        doc.save(`SP_Parking_Advance_${monthNames[selectedMonth]}_${selectedYear}.pdf`);
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

                        <div className="p-4 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-4 sm:p-6 border border-white shadow-md hover:shadow-lg transition-all duration-200">
                                <div className="flex items-center space-x-4">
                                    <div className="p-3 rounded-xl bg-white shadow-sm">
                                        <Car className="w-8 h-8 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-gray-600 text-sm font-medium">Total Vehicles</p>
                                        <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.vehicleCount}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-2xl p-4 sm:p-6 border border-white shadow-md hover:shadow-lg transition-all duration-200">
                                <div className="flex items-center space-x-4">
                                    <div className="p-3 rounded-xl bg-white shadow-sm">
                                        <DollarSign className="w-8 h-8 text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="text-gray-600 text-sm font-medium">Total Advance Amount</p>
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
                                <h2 className="text-lg sm:text-xl font-bold text-gray-800 text-center sm:text-left">
                                    Transaction History
                                </h2>
                                <div className="w-full relative">
                                    <input
                                        type="text"
                                        placeholder="Search by vehicle number or description..."
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
                                                    <tr key={vehicle._id} className="hover:bg-gray-50 transition-colors duration-150">
                                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                                                            {vehicle.vehicleNumber}
                                                        </td>
                                                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600 max-w-[150px] truncate">
                                                            {vehicle.vehicleDescription}
                                                        </td>
                                                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">
                                                            {vehicle.lotNumber}
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
                                                            {new Date(vehicle.startDate).toLocaleDateString('en-GB')}
                                                        </td>
                                                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium text-gray-900">
                                                            ₹{vehicle.advanceAmount || 0}
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
