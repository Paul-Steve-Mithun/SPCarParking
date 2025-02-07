import { useEffect, useState } from 'react';
import { 
    DollarSignIcon, 
    CalendarIcon, 
    ClockIcon, 
    PrinterIcon,
    CarIcon 
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function RevenueDashboard() {
    const [vehicles, setVehicles] = useState([]);
    const [activeVehicles, setActiveVehicles] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

    useEffect(() => {
        fetch('https://spcarparkingbackend.vercel.app/vehicles')
            .then(res => res.json())
            .then(data => {
                setVehicles(data);
                const active = data.filter(vehicle => vehicle.status === 'active');
                setActiveVehicles(active);
            });
    }, []);

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June', 
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const calculateMonthlyRevenue = () => {
        const monthVehicles = activeVehicles.filter(vehicle => {
            const startDate = new Date();
            return startDate.getMonth() === selectedMonth;
        });

        const totalRevenue = monthVehicles.reduce((total, vehicle) => {
            if (vehicle.rentalType === 'daily') {
                return total + (vehicle.rentPrice * vehicle.numberOfDays);
            } else if (vehicle.rentalType === 'monthly') {
                return total + vehicle.rentPrice;
            }
            return total;
        }, 0);

        const monthlyRentalRevenue = monthVehicles
            .filter(v => v.rentalType === 'monthly')
            .reduce((total, vehicle) => total + vehicle.rentPrice, 0);

        const dailyRentalRevenue = monthVehicles
            .filter(v => v.rentalType === 'daily')
            .reduce((total, vehicle) => total + (vehicle.rentPrice * vehicle.numberOfDays), 0);

        return { 
            totalRevenue, 
            monthlyRentalRevenue, 
            dailyRentalRevenue, 
            monthVehicles,
            activeCount: activeVehicles.length 
        };
    };

    const { 
        totalRevenue, 
        monthlyRentalRevenue, 
        dailyRentalRevenue, 
        monthVehicles,
        activeCount 
    } = calculateMonthlyRevenue();

    const generatePDF = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        
        doc.setFontSize(16);
        doc.text(`SP CAR PARKING ${monthNames[selectedMonth].toUpperCase()} STATEMENT`, pageWidth / 2, 20, { align: 'center' });

        const tableColumn = ['Vehicle Number', 'Vehicle Description', 'Lot Number', 'Rental Type', 'Total Rent'];
        const tableRows = monthVehicles.map(vehicle => [
            vehicle.vehicleNumber,
            vehicle.vehicleDescription,
            vehicle.lotNumber,
            vehicle.rentalType,
            vehicle.rentalType === 'daily' 
                ? `${(vehicle.rentPrice * vehicle.numberOfDays).toFixed(2)}` 
                : `${vehicle.rentPrice.toFixed(2)}`,
        ]);

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 30,
            theme: 'striped'
        });

        doc.setFontSize(12);
        doc.text(`Total Active Vehicles: ${activeCount}`, 14, doc.autoTable.previous.finalY + 10);
        doc.text(`Total Revenue: ${totalRevenue.toFixed(2)}`, 14, doc.autoTable.previous.finalY + 20);

        doc.save(`SP_Parking_Revenue_${monthNames[selectedMonth]}.pdf`);
    };

    const revenueStats = [
        {
            icon: <CarIcon className="w-8 h-8 text-blue-600" />,
            label: "Active Vehicles",
            value: activeCount
        },
        {
            icon: <DollarSignIcon className="w-8 h-8 text-green-600" />, 
            label: `Total Revenue (${monthNames[selectedMonth]})`, 
            value: `₹${totalRevenue.toFixed(2)}`
        },
        {
            icon: <CalendarIcon className="w-8 h-8 text-orange-600" />, 
            label: `Monthly Rental (${monthNames[selectedMonth]})`, 
            value: `₹${monthlyRentalRevenue.toFixed(2)}`
        },
        {
            icon: <ClockIcon className="w-8 h-8 text-red-600" />, 
            label: `Daily Rental (${monthNames[selectedMonth]})`, 
            value: `₹${dailyRentalRevenue.toFixed(2)}`
        }
    ];

    return (
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-blue-600 p-6 flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Revenue Dashboard</h1>
                <button 
                    onClick={generatePDF} 
                    className="bg-white text-green-600 px-4 py-2 rounded flex items-center space-x-2 hover:bg-gray-100"
                >
                    <PrinterIcon className="w-5 h-5" />
                    <span>Generate PDF</span>
                </button>
            </div>
            <div className="p-6">
                <div className="mb-4">
                    <label htmlFor="monthSelect" className="mr-2">Select Month:</label>
                    <select 
                        id="monthSelect"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        className="px-2 py-1 border rounded"
                    >
                        {monthNames.map((month, index) => (
                            <option key={index} value={index}>
                                {month}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {revenueStats.map((stat, index) => (
                        <div 
                            key={index} 
                            className="bg-gray-50 border border-gray-200 rounded-lg p-6 flex items-center space-x-4 hover:shadow-md transition-all"
                        >
                            <div>{stat.icon}</div>
                            <div>
                                <p className="text-gray-500 text-sm">{stat.label}</p>
                                <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default RevenueDashboard;