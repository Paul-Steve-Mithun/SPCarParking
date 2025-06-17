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
        key: 'TransactionDate', 
        direction: 'desc' 
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
            // Get monthly data (for the selected month only)
            const monthlyResponse = await fetch(`https://spcarparkingbknd.onrender.com/advances?month=${selectedMonth}&year=${selectedYear}`);
            const monthlyData = await monthlyResponse.json();

            // Get all advances data up to the selected month (for total calculation)
            const endDate = new Date(selectedYear, selectedMonth + 1, 0); // Last day of selected month
            const allAdvancesResponse = await fetch(`https://spcarparkingbknd.onrender.com/advances/allUpToDate?date=${endDate.toISOString()}`);
            const allAdvancesData = await allAdvancesResponse.json();

            // Filter and sort transactions for display
            const nonZeroTransactions = monthlyData.filter(v => 
                v.advanceAmount > 0 || v.advanceRefund > 0
            );

            const sortedData = nonZeroTransactions.sort((a, b) => {
                const dateA = new Date(a.refundDate || a.startDate);
                const dateB = new Date(b.refundDate || b.startDate);
                return dateB - dateA;
            });

            setVehicles(sortedData);
            setFilteredVehicles(sortedData);

            // Calculate monthly net (only for selected month)
            const monthlyNet = monthlyData.reduce((total, vehicle) => {
                if (vehicle.advanceRefund) {
                    return total - vehicle.advanceRefund;
                }
                return total + (vehicle.advanceAmount || 0);
            }, 0);

            // Calculate total advance (cumulative up to selected month)
            const totalAdvance = allAdvancesData.reduce((total, vehicle) => {
                if (vehicle.advanceRefund) {
                    return total - vehicle.advanceRefund;
                }
                return total + (vehicle.advanceAmount || 0);
            }, 0);

            setStats({
                totalAdvance: totalAdvance || 0,
                monthlyAdvance: monthlyNet || 0
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
        doc.text(`${monthNames[selectedMonth]} ${selectedYear} Advance Payment Statement (Generated: ${formattedDate})`, pageWidth / 2, 28, { align: 'center' });

        // Format date function
        const formatDateForPDF = (date) => {
            const d = new Date(date);
            return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        };

        // Add the formatAmount function after formatDateForPDF
        const formatAmount = (amount, isRefund = false) => {
            if (amount === '-') return '-';
            
            // Convert amount to string with 2 decimal places
            const amountStr = Math.abs(amount).toFixed(2);
            
            // Calculate spaces needed (for maximum 100000.00)
            const spaceNeeded = 12 - amountStr.length;
            const spaces = ' '.repeat(spaceNeeded);
            
            // Add refund indicator and format with consistent spacing
            const prefix = isRefund ? '(-) ' : '(+) ';
            return `${prefix}INR${spaces}${amountStr}`;
        };

        // Calculate total table width based on column widths
        const columnWidths = {
            sno: 15,
            vehicleNumber: 30,
            description: 40,
            lot: 20,
            mode: 25,
            receivedBy: 25,
            date: 25,
            amount: 45
        };

        const totalTableWidth = Object.values(columnWidths).reduce((sum, width) => sum + width, 0);
        const leftMargin = (pageWidth - totalTableWidth) / 2;

        // Table columns
        const baseColumns = [
            { header: 'S.No', dataKey: 'sno' },
            { header: 'Date', dataKey: 'date' },
            { header: 'Vehicle Number', dataKey: 'vehicleNumber' },
            { header: 'Description', dataKey: 'description' },
            { header: 'Lot', dataKey: 'lot' },
            { header: 'Mode', dataKey: 'mode' },
            { header: 'Received By', dataKey: 'receivedBy' },
            { header: 'Amount', dataKey: 'amount' }
        ];

        // Prepare table rows with oldest first
        const sortedTableRows = vehicles
            .sort((a, b) => {
                const dateA = new Date(a.refundDate || a.startDate);
                const dateB = new Date(b.refundDate || b.startDate);
                return dateA - dateB;
            })
            .map((vehicle, index) => {
                const isRefund = !!vehicle.advanceRefund;
                const amount = isRefund ? vehicle.advanceRefund : (vehicle.advanceAmount || 0);

                return {
                    sno: (index + 1).toString(),
                    vehicleNumber: vehicle.vehicleNumber || '',
                    description: vehicle.vehicleDescription || '',
                    lot: vehicle.lotNumber || 'Open',
                    mode: vehicle.transactionMode || 'Cash',
                    receivedBy: vehicle.receivedBy || 'N/A',
                    date: formatDateForPDF(vehicle.refundDate || vehicle.startDate),
                    amount: formatAmount(amount, isRefund),
                    isRefund: isRefund,
                    rawAmount: isRefund ? -amount : amount
                };
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
                vehicleNumber: { cellWidth: columnWidths.vehicleNumber, halign: 'center' },
                description: { cellWidth: columnWidths.description, halign: 'left' },
                lot: { cellWidth: columnWidths.lot, halign: 'center' },
                mode: { cellWidth: columnWidths.mode, halign: 'center' },
                receivedBy: { cellWidth: columnWidths.receivedBy, halign: 'center' },
                date: { cellWidth: columnWidths.date, halign: 'center' },
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
            willDrawCell: function(data) {
                if (data.section === 'body') {
                    const row = data.row.raw;
                    if (row.isRefund) {
                        data.cell.styles.fillColor = [255, 235, 235];
                        data.cell.styles.textColor = [220, 50, 50];
                    }
                }
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
                if (data.row.index === sortedTableRows.length - 1 && data.column.index === 0) {
                    const finalY = data.cell.y + data.cell.height + 10;
                    
                    // Set styles for totals
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(10);
                    doc.setTextColor(0, 0, 0);
                    doc.setDrawColor(200, 200, 200);
                    doc.setLineWidth(0.1);

                    // Calculate positions
                    const boxWidth = 110;
                    const boxHeight = 10;
                    const boxX = pageWidth - leftMargin - boxWidth;
                    const textPadding = 2;
                    const lineSpacing = 10;

                    // Function to draw a box with text
                    const drawTotalBox = (y, label, amount, isNegative = false) => {
                        doc.setDrawColor(200, 200, 200);
                        doc.setFillColor(isNegative ? 255 : 246, isNegative ? 235 : 246, isNegative ? 235 : 252);
                        doc.setLineWidth(0.1);
                        doc.roundedRect(boxX, y - boxHeight + 5, boxWidth, boxHeight, 1, 1, 'FD');

                        // Set fonts
                        doc.setFont('helvetica', 'bold');
                        const labelX = boxX + textPadding;
                        doc.text(label, labelX, y);

                        // Set monospace bold for amount
                        doc.setFont('courier', 'bold');
                        const amountX = boxX + boxWidth - textPadding;
                        doc.text(
                            formatAmount(amount, isNegative),
                            amountX,
                            y,
                            { align: 'right' }
                        );
                    };

                    // Draw Monthly Advance (Net)
                    drawTotalBox(
                        finalY,
                        'Monthly Advance (Net) :', 
                        stats.monthlyAdvance,
                        stats.monthlyAdvance < 0
                    );

                    // Draw Total Advance
                    drawTotalBox(
                        finalY + lineSpacing,
                        'Total Advance (Till Date) :', 
                        stats.totalAdvance,
                        false
                    );
                }
            },
            didParseCell: function(data) {
                // For amount column, use monospace font and bold style
                if (data.column.dataKey === 'amount') {
                    data.cell.styles.font = 'courier';
                    data.cell.styles.fontStyle = 'bold';
                }
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
        if (isSavingAdvance) return;
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
                        <div className="bg-gradient-to-r from-teal-500 to-teal-600 p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
                                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white text-center sm:text-left">
                                    Advance Payment Dashboard
                                </h1>
                                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                    <button 
                                        onClick={() => {
                                            setShowPayAdvanceModal(true);
                                            fetchVehicles();
                                        }}
                                        className="w-full sm:w-auto bg-white text-teal-600 px-4 py-2.5 rounded-lg flex items-center justify-center space-x-2 hover:bg-gray-50 transition-colors duration-200 shadow-md"
                                    >
                                        <IndianRupee className="w-5 h-5" />
                                        <span className="font-semibold">Pay Advance</span>
                                    </button>
                                    <button 
                                        onClick={generatePDF} 
                                        className="w-full sm:w-auto bg-white text-teal-600 px-4 py-2.5 rounded-lg flex items-center justify-center space-x-2 hover:bg-gray-50 transition-colors duration-200 shadow-md"
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
                                        className="w-full appearance-none bg-white text-teal-600 px-4 py-3 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-medium shadow-md hover:bg-gray-50 transition-colors duration-200"
                                    >
                                        {monthNames.map((month, index) => (
                                            <option key={index} value={index}>{month}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-teal-600" />
                                </div>
                                <div className="relative w-full sm:w-32">
                                    <select 
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                        className="w-full appearance-none bg-white text-teal-600 px-4 py-3 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-medium shadow-md hover:bg-gray-50 transition-colors duration-200"
                                    >
                                        {Array.from({ length: 5 }, (_, i) => selectedYear - 2 + i).map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-teal-600" />
                                </div>
                            </div>
                        </div>

                        {/* Stats Cards */}
                        <div className="p-4 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Monthly Advance Card */}
                            <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl p-4 sm:p-6 border border-white shadow-md hover:shadow-lg transition-all duration-200">
                                <div className="flex items-center space-x-4">
                                    <div className="p-3 rounded-xl bg-white shadow-sm">
                                        <Calendar className="w-6 h-6 text-teal-600" />
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
                            <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-2xl p-4 sm:p-6 border border-white shadow-md hover:shadow-lg transition-all duration-200">
                                <div className="flex items-center space-x-4">
                                    <div className="p-3 rounded-xl bg-white shadow-sm">
                                        <DollarSign className="w-6 h-6 text-cyan-600" />
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
                            <h2 className="text-xl font-bold text-gray-900 mb-4 text-center sm:text-left">
                                Transaction History
                            </h2>
                            
                            <div className="relative w-full mb-6">
                                <input
                                    type="text"
                                    placeholder="Search transactions..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                                />
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            </div>

                            <div className="overflow-x-auto">
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
                                                        <th 
                                                            onClick={() => handleSort('TransactionDate')}
                                                            className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                                        >
                                                            <div className="flex items-center">
                                                                <span className="hidden sm:inline">Date</span>
                                                                <span className="sm:hidden">Date</span>
                                                                {sortConfig.key === 'TransactionDate' ? (
                                                                    sortConfig.direction === 'asc' ? 
                                                                        <ArrowUp className="w-4 h-4 ml-1" /> : 
                                                                        <ArrowDown className="w-4 h-4 ml-1" />
                                                                ) : (
                                                                    <ChevronDown className="w-4 h-4 ml-1" />
                                                                )}
                                                            </div>
                                                        </th>
                                                        <th 
                                                            onClick={() => handleSort('vehicleNumber')}
                                                            className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                                        >
                                                            <div className="flex items-center">
                                                                <span className="hidden sm:inline">Vehicle</span>
                                                                <span className="sm:hidden">Vehicle</span>
                                                                <SortIcon column="vehicleNumber" />
                                                            </div>
                                                        </th>
                                                        <th 
                                                            onClick={() => handleSort('Description')}
                                                            className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                                        >
                                                            <div className="flex items-center">
                                                                <span className="hidden sm:inline">Description</span>
                                                                <span className="sm:hidden">Desc</span>
                                                                <SortIcon column="Description" />
                                                            </div>
                                                        </th>
                                                        <th 
                                                            onClick={() => handleSort('lot')}
                                                            className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                                        >
                                                            <div className="flex items-center">
                                                                <span className="hidden sm:inline">Lot</span>
                                                                <span className="sm:hidden">Lot</span>
                                                                <SortIcon column="lot" />
                                                            </div>
                                                        </th>
                                                        <th 
                                                            onClick={() => handleSort('parkingType')}
                                                            className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                                        >
                                                            <div className="flex items-center">
                                                                <span className="hidden sm:inline">Parking Type</span>
                                                                <span className="sm:hidden">Type</span>
                                                                <SortIcon column="parkingType" />
                                                            </div>
                                                        </th>
                                                        <th 
                                                            onClick={() => handleSort('receivedBy')}
                                                            className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                                        >
                                                            <div className="flex items-center">
                                                                <span className="hidden sm:inline">Received By</span>
                                                                <span className="sm:hidden">By</span>
                                                                <SortIcon column="receivedBy" />
                                                            </div>
                                                        </th>
                                                        <th 
                                                            onClick={() => handleSort('mode')}
                                                            className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                                        >
                                                            <div className="flex items-center">
                                                                <span className="hidden sm:inline">Mode</span>
                                                                <span className="sm:hidden">Mode</span>
                                                                <SortIcon column="mode" />
                                                            </div>
                                                        </th>
                                                        <th 
                                                            onClick={() => handleSort('Amount')}
                                                            className="px-4 sm:px-6 py-4 text-left text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                                        >
                                                            <div className="flex items-center">
                                                                <span className="hidden sm:inline">Amount</span>
                                                                <span className="sm:hidden">Amt</span>
                                                                <SortIcon column="Amount" />
                                                            </div>
                                                        </th>
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
                                                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm sm:text-sm font-medium text-gray-900">
                                                                {index + 1}
                                                            </td>
                                                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm sm:text-sm font-medium text-gray-900">
                                                                {vehicle.advanceRefund 
                                                                    ? new Date(vehicle.refundDate).toLocaleDateString('en-GB')
                                                                    : new Date(vehicle.startDate).toLocaleDateString('en-GB')}
                                                            </td>
                                                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm sm:text-sm font-medium text-gray-900">
                                                                {vehicle.vehicleNumber}
                                                            </td>
                                                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-gray-600">
                                                                {vehicle.vehicleDescription}
                                                            </td>
                                                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-gray-600">
                                                                {vehicle.lotNumber || 'Open'}
                                                            </td>
                                                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-gray-600">
                                                                {vehicle.parkingType === 'private' ? 'Private' : 'Open'}
                                                            </td>
                                                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-sm text-gray-600">
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
                                                            <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm sm:text-sm font-medium text-gray-900">
                                                                <div className="w-full text-right font-mono">
                                                                    <span className={`inline-block w-[90px] text-left text-base ${vehicle.advanceRefund ? 'text-red-600' : ''}`}>
                                                                        {vehicle.advanceRefund 
                                                                            ? `${vehicle.advanceRefund.toFixed(2)}`
                                                                            : vehicle.advanceAmount.toFixed(2)}
                                                                    </span>
                                                                </div>
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
                                                    className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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