import { useEffect, useState } from 'react';
import { RefreshCwIcon, SearchIcon, PrinterIcon, Printer } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import VehicleActions from './VehicleActions';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import QRCode from 'qrcode';

const capitalizeFirst = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};

export function ManageVehicles() {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [activeTab, setActiveTab] = useState('monthly'); // For mobile view

    const fetchExpiredVehicles = async () => {
        setLoading(true);
        try {
            const response = await fetch('https://spcarparkingbknd.onrender.com/vehicles');
            const data = await response.json();
            const expiredVehicles = data.filter(vehicle => vehicle.status === 'inactive');
            setVehicles(expiredVehicles);
        } catch (error) {
            toast.error('Failed to fetch expired vehicles');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExpiredVehicles();
    }, []);

    const filteredMonthlyVehicles = vehicles.filter(vehicle => 
        vehicle.rentalType === 'monthly' && 
        (vehicle.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
         vehicle.ownerName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const filteredDailyVehicles = vehicles.filter(vehicle => 
        vehicle.rentalType === 'daily' && 
        (vehicle.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
         vehicle.ownerName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handlePrintInvoice = async (vehicle) => {
        try {
            // Calculate total amount based on rental type
            const totalAmount = vehicle.rentalType === 'daily' ? 
                vehicle.rentPrice * vehicle.numberOfDays : 
                vehicle.rentPrice;

            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const columnWidth = 85;
            const startX1 = 15;
            const startX2 = 110;
            
            // Modern Header with Gradient
            const gradient = doc.setFillColor(0, 128, 0);
            doc.rect(0, 0, pageWidth, 40, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(28);
            doc.text('SP CAR PARKING', pageWidth/2, 25, { align: 'center' });
            
            // Subtitle
            doc.setFontSize(12);
            doc.setFont("helvetica", "normal");
            doc.text('Parking Receipt', pageWidth/2, 35, { align: 'center' });
            
            // Reset color and set modern font
            doc.setTextColor(44, 62, 80);
            doc.setFont("helvetica", "bold");
            
            // Section Styling Function
            const createSection = (title, x, y) => {
                doc.setFontSize(16);
                doc.setTextColor(0, 128, 0);
                doc.text(title, x, y);
                doc.setDrawColor(0, 128, 0);
                doc.setLineWidth(0.5);
                doc.line(x, y + 2, x + columnWidth, y + 2);
                doc.setTextColor(44, 62, 80);
            };

            // Left Column
            createSection('Vehicle Details', startX1, 55);

            const vehicleDetails = [
                ['Vehicle No:', vehicle.vehicleNumber],
                ['Description:', vehicle.vehicleDescription],
                ['Lot Number:', vehicle.lotNumber || 'Open'],
                ['Status:', vehicle.status === 'active' ? 'Paid' : 'Not Paid'],
                ['Rental Type:', capitalizeFirst(vehicle.rentalType)],
                ['Advance:', `INR ${vehicle.advanceAmount}`],
                ['Rent:', `INR ${vehicle.rentPrice}`],
                ['Duration:', vehicle.rentalType === 'daily' ? 
                    `${vehicle.numberOfDays} days` : 'Every Month'],
                ['Total:', `INR ${totalAmount}`]
            ];

            doc.autoTable({
                startY: 60,
                margin: { left: startX1 },
                head: [],
                body: vehicleDetails,
                theme: 'plain',
                styles: { 
                    fontSize: 10,
                    cellPadding: 3,
                    font: 'helvetica',
                    textColor: [44, 62, 80]
                },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 35 },
                    1: { cellWidth: 50 }
                }
            });

            createSection('Agreement Details', startX1, doc.autoTable.previous.finalY + 15);

            const agreementDetails = [
                ['Start Date:', (() => {
                    const date = new Date();
                    date.setMonth(date.getMonth() - 1);
                    date.setDate(1);
                    return date.toLocaleDateString('en-GB');
                })()],
                ['End Date:', (() => {
                    const date = new Date();
                    date.setDate(0); // Last day of previous month
                    return date.toLocaleDateString('en-GB');
                })()],
                ['Agreement ID:', vehicle._id?.slice(-8) || 'N/A']
            ];

            doc.autoTable({
                startY: doc.autoTable.previous.finalY + 20,
                margin: { left: startX1 },
                head: [],
                body: agreementDetails,
                theme: 'plain',
                styles: { 
                    fontSize: 10,
                    cellPadding: 3,
                    font: 'helvetica',
                    textColor: [44, 62, 80]
                },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 35 },
                    1: { cellWidth: 50 }
                }
            });

            // Add Vehicle Image Section
            if (vehicle.vehicleImage?.url) {
                try {
                    const imgResponse = await fetch(vehicle.vehicleImage.url);
                    const imgBlob = await imgResponse.blob();
                    const imgBase64 = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(imgBlob);
                    });

                    // Center image in left column
                    const imageWidth = 70;
                    const imageX = startX1 + ((columnWidth - imageWidth) / 2);

                    doc.addImage(
                        imgBase64, 
                        'JPEG', 
                        imageX,
                        doc.autoTable.previous.finalY + 5,
                        imageWidth,
                        50
                    );
                } catch (imgError) {
                    console.error('Error loading vehicle image:', imgError);
                }
            }

            // Add a green line after the image
            doc.setDrawColor(0, 128, 0);
            doc.setLineWidth(0.5);
            doc.line(startX1, doc.autoTable.previous.finalY + (vehicle.vehicleImage?.url ? 60 : 5), startX1 + columnWidth, doc.autoTable.previous.finalY + (vehicle.vehicleImage?.url ? 60 : 5));

            // Right Column
            createSection('Owner Details', startX2, 55);

            const ownerDetails = [
                ['Name:', 'MR. ' + vehicle.ownerName || 'N/A'],
                ['Contact:', vehicle.contactNumber || 'N/A'],
                ['Address:', vehicle.ownerAddress || 'N/A']
            ];

            doc.autoTable({
                startY: 60,
                margin: { left: startX2 },
                head: [],
                body: ownerDetails,
                theme: 'plain',
                styles: { 
                    fontSize: 10,
                    cellPadding: 3,
                    font: 'helvetica',
                    textColor: [44, 62, 80]
                },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 35 },
                    1: { cellWidth: 50 }
                }
            });

            // Terms and Conditions
            createSection('Terms & Conditions', startX2, doc.autoTable.previous.finalY + 10);

            const terms = [
                ['1.', 'Rent must be paid before 5th of each month'],
                ['2.', 'Parking spot must be kept clean'],
                ['3.', 'No unauthorized vehicle transfers']
            ];

            doc.autoTable({
                startY: doc.autoTable.previous.finalY + 15,
                margin: { left: startX2 },
                head: [],
                body: terms,
                theme: 'plain',
                styles: { 
                    fontSize: 10,
                    cellPadding: 2,
                    font: 'helvetica',
                    textColor: [44, 62, 80]
                },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 10 },
                    1: { cellWidth: 75 }
                }
            });

            // QR Code Section
            doc.setFontSize(16);
            doc.setTextColor(0, 128, 0);
            doc.text('Scan QR to Pay', startX2, doc.autoTable.previous.finalY + 10);
            doc.setFontSize(10);
            doc.text('(Ignore if already paid)', startX2, doc.autoTable.previous.finalY + 20);
            doc.setDrawColor(0, 128, 0);
            doc.setLineWidth(0.5);
            doc.line(startX2, doc.autoTable.previous.finalY + 12, startX2 + columnWidth, doc.autoTable.previous.finalY + 12);
            doc.setTextColor(44, 62, 80);

            // Generate QR Code
            const qrData = `upi://pay?pa=paulcars2000@oksbi&pn=PAULCARS&am=${totalAmount}&tr=${vehicle._id}&tn=SP_CAR_PARKING_${vehicle.vehicleNumber}`;
            const qrDataUrl = await QRCode.toDataURL(qrData, {
                width: 30,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            });

            // Center QR code
            const qrWidth = 60;
            const qrX = startX2 + ((columnWidth - qrWidth) / 2);

            doc.addImage(
                qrDataUrl, 
                'PNG', 
                qrX,
                doc.autoTable.previous.finalY + 25,
                qrWidth,
                60
            );

            // Modern Footer
            doc.setDrawColor(0, 128, 0);
            doc.setLineWidth(0.5);
            doc.line(15, pageHeight - 25, pageWidth - 15, pageHeight - 25);
            
            doc.setFontSize(9);
            doc.setTextColor(128, 128, 128);
            const footer = "This is a computer-generated document. No signature is required.";
            doc.text(footer, pageWidth/2, pageHeight - 15, { align: 'center' });

            doc.save(`SP_Parking_Receipt_${vehicle.vehicleNumber}.pdf`);
            toast.success('Receipt generated successfully');
        } catch (error) {
            console.error('Error generating receipt:', error);
            toast.error('Failed to generate receipt');
        }
    };

    const handlePrintDailyInvoice = async (vehicle) => {
        try {
            // Calculate dates
            const startDate = new Date(vehicle.endDate);
            startDate.setDate(startDate.getDate() + 1);
            startDate.setHours(0, 0, 0, 0); // Set to start of day (12:00 AM)
            
            const endDate = new Date(); // Current date
            endDate.setHours(0, 0, 0, 0); // Set to start of day (12:00 AM)

            // Calculate number of days including partial days
            // Adding 1 because if vehicle enters before 12:00 AM, it's counted as a full day
            const diffTime = endDate.getTime() - startDate.getTime();
            const numberOfDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
            
            // Calculate total amount
            const totalAmount = vehicle.rentPrice * numberOfDays;

            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const columnWidth = 85;
            const startX1 = 15;
            const startX2 = 110;
            
            // Modern Header with Gradient
            const gradient = doc.setFillColor(0, 128, 0);
            doc.rect(0, 0, pageWidth, 40, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(28);
            doc.text('SP CAR PARKING', pageWidth/2, 25, { align: 'center' });
            
            // Subtitle
            doc.setFontSize(12);
            doc.setFont("helvetica", "normal");
            doc.text('Parking Receipt', pageWidth/2, 35, { align: 'center' });
            
            // Reset color and set modern font
            doc.setTextColor(44, 62, 80);
            doc.setFont("helvetica", "bold");
            
            // Section Styling Function
            const createSection = (title, x, y) => {
                doc.setFontSize(16);
                doc.setTextColor(0, 128, 0);
                doc.text(title, x, y);
                doc.setDrawColor(0, 128, 0);
                doc.setLineWidth(0.5);
                doc.line(x, y + 2, x + columnWidth, y + 2);
                doc.setTextColor(44, 62, 80);
            };

            // Left Column
            createSection('Vehicle Details', startX1, 55);

            const vehicleDetails = [
                ['Vehicle No:', vehicle.vehicleNumber],
                ['Description:', vehicle.vehicleDescription],
                ['Lot Number:', vehicle.lotNumber || 'Open'],
                ['Status:', vehicle.status === 'active' ? 'Paid' : 'Not Paid'],
                ['Rental Type:', capitalizeFirst(vehicle.rentalType)],
                ['Rent/Day:', `INR ${vehicle.rentPrice}`],
                ['Duration:', `${numberOfDays} days`],
                ['Total:', `INR ${totalAmount}`]
            ];

            doc.autoTable({
                startY: 60,
                margin: { left: startX1 },
                head: [],
                body: vehicleDetails,
                theme: 'plain',
                styles: { 
                    fontSize: 10,
                    cellPadding: 3,
                    font: 'helvetica',
                    textColor: [44, 62, 80]
                },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 35 },
                    1: { cellWidth: 50 }
                }
            });

            createSection('Agreement Details', startX1, doc.autoTable.previous.finalY + 15);

            const agreementDetails = [
                ['Start Date:', startDate.toLocaleDateString('en-GB')],
                ['End Date:', endDate.toLocaleDateString('en-GB')],
                ['Agreement ID:', vehicle._id?.slice(-8) || 'N/A']
            ];

            doc.autoTable({
                startY: doc.autoTable.previous.finalY + 20,
                margin: { left: startX1 },
                head: [],
                body: agreementDetails,
                theme: 'plain',
                styles: { 
                    fontSize: 10,
                    cellPadding: 3,
                    font: 'helvetica',
                    textColor: [44, 62, 80]
                },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 35 },
                    1: { cellWidth: 50 }
                }
            });

            // Add Vehicle Image Section
            if (vehicle.vehicleImage?.url) {
                try {
                    const imgResponse = await fetch(vehicle.vehicleImage.url);
                    const imgBlob = await imgResponse.blob();
                    const imgBase64 = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(imgBlob);
                    });

                    // Center image in left column
                    const imageWidth = 70;
                    const imageX = startX1 + ((columnWidth - imageWidth) / 2);

                    doc.addImage(
                        imgBase64, 
                        'JPEG', 
                        imageX,
                        doc.autoTable.previous.finalY + 5,
                        imageWidth,
                        50
                    );
                } catch (imgError) {
                    console.error('Error loading vehicle image:', imgError);
                }
            }

            // Add a green line after the image
            doc.setDrawColor(0, 128, 0);
            doc.setLineWidth(0.5);
            doc.line(startX1, doc.autoTable.previous.finalY + (vehicle.vehicleImage?.url ? 60 : 5), startX1 + columnWidth, doc.autoTable.previous.finalY + (vehicle.vehicleImage?.url ? 60 : 5));

            // Right Column
            createSection('Owner Details', startX2, 55);

            const ownerDetails = [
                ['Name:', 'MR. ' + vehicle.ownerName || 'N/A'],
                ['Contact:', vehicle.contactNumber || 'N/A'],
                ['Address:', vehicle.ownerAddress || 'N/A']
            ];

            doc.autoTable({
                startY: 60,
                margin: { left: startX2 },
                head: [],
                body: ownerDetails,
                theme: 'plain',
                styles: { 
                    fontSize: 10,
                    cellPadding: 3,
                    font: 'helvetica',
                    textColor: [44, 62, 80]
                },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 35 },
                    1: { cellWidth: 50 }
                }
            });

            // Terms and Conditions
            createSection('Terms & Conditions', startX2, doc.autoTable.previous.finalY + 10);

            const terms = [
                ['1.', 'Rent must be paid before 5th of each month'],
                ['2.', 'Parking spot must be kept clean'],
                ['3.', 'No unauthorized vehicle transfers']
            ];

            doc.autoTable({
                startY: doc.autoTable.previous.finalY + 15,
                margin: { left: startX2 },
                head: [],
                body: terms,
                theme: 'plain',
                styles: { 
                    fontSize: 10,
                    cellPadding: 2,
                    font: 'helvetica',
                    textColor: [44, 62, 80]
                },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 10 },
                    1: { cellWidth: 75 }
                }
            });

            // QR Code Section
            doc.setFontSize(16);
            doc.setTextColor(0, 128, 0);
            doc.text('Scan QR to Pay', startX2, doc.autoTable.previous.finalY + 10);
            doc.setFontSize(10);
            doc.text('(Ignore if already paid)', startX2, doc.autoTable.previous.finalY + 20);
            doc.setDrawColor(0, 128, 0);
            doc.setLineWidth(0.5);
            doc.line(startX2, doc.autoTable.previous.finalY + 12, startX2 + columnWidth, doc.autoTable.previous.finalY + 12);
            doc.setTextColor(44, 62, 80);

            // QR Code Section with updated amount
            const qrData = `upi://pay?pa=paulcars2000@oksbi&pn=PAULCARS&am=${totalAmount}&tr=${vehicle._id}&tn=SP_CAR_PARKING_${vehicle.vehicleNumber}_DAILY`;
            const qrDataUrl = await QRCode.toDataURL(qrData, {
                width: 30,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            });

            // Center QR code
            const qrWidth = 60;
            const qrX = startX2 + ((columnWidth - qrWidth) / 2);

            doc.addImage(
                qrDataUrl, 
                'PNG', 
                qrX,
                doc.autoTable.previous.finalY + 25,
                qrWidth,
                60
            );

            // Modern Footer
            doc.setDrawColor(0, 128, 0);
            doc.setLineWidth(0.5);
            doc.line(15, pageHeight - 25, pageWidth - 15, pageHeight - 25);
            
            doc.setFontSize(9);
            doc.setTextColor(128, 128, 128);
            const footer = "This is a computer-generated document. No signature is required.";
            doc.text(footer, pageWidth/2, pageHeight - 15, { align: 'center' });

            doc.save(`SP_Parking_Receipt_${vehicle.vehicleNumber}_Daily.pdf`);
            toast.success('Receipt generated successfully');
        } catch (error) {
            console.error('Error generating receipt:', error);
            toast.error('Failed to generate receipt');
        }
    };

    const renderVehicleCard = (vehicle) => (
        <div 
            key={vehicle._id} 
            className="p-4 hover:bg-gray-50 cursor-pointer relative"
            onClick={() => setSelectedVehicle(vehicle)}
        >
            {/* Printer Button - Absolute positioned */}
            <button
                onClick={(e) => {
                    e.stopPropagation(); // Prevent card click when clicking printer
                    vehicle.rentalType === 'monthly' 
                        ? handlePrintInvoice(vehicle) 
                        : handlePrintDailyInvoice(vehicle);
                }}
                className="absolute right-4 top-4 p-2 text-gray-600 hover:text-blue-600 transition-colors"
                title="Print Receipt"
            >
                <Printer className="w-5 h-5" />
            </button>

            {/* Card Content */}
            <div className="flex-grow space-y-2 sm:space-y-1">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <p className="font-semibold text-gray-800">{vehicle.vehicleNumber}</p>
                    <span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                        {vehicle.lotNumber || 'No Lot'}
                    </span>
                    <span className="px-2 py-1 bg-red-100 text-red-800 border-red-200 rounded-full text-xs font-medium border">
                        Expired
                    </span>
                </div>
                <p className="text-sm text-gray-500">{vehicle.vehicleDescription}</p>
                <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm text-gray-500">
                        {vehicle.rentalType === 'daily' 
                            ? `Daily - ₹${vehicle.rentPrice} for ${vehicle.numberOfDays} days`
                            : `Monthly - ₹${vehicle.rentPrice}`}
                    </p>
                    {vehicle.rentalType === 'daily' && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                            Total: ₹{vehicle.rentPrice * vehicle.numberOfDays}
                        </span>
                    )}
                </div>
                <p className="text-xs text-red-500">
                    Rental Period Ended: {new Date(vehicle.endDate).toLocaleDateString('en-GB')}
                </p>
            </div>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto bg-white shadow-xl rounded-xl overflow-hidden">
            <Toaster position="top-right" />
            
            <div className="bg-gradient-to-r from-red-500 to-orange-600 p-4 sm:p-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white">Expired Vehicles</h1>
                    <button 
                        onClick={fetchExpiredVehicles} 
                        className="text-white hover:bg-white/20 p-2 rounded-full transition-all"
                    >
                        <RefreshCwIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                </div>
            </div>

            <div className="p-4">
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="Search by vehicle number or owner name..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-3 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-sm sm:text-base"
                    />
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                </div>
            </div>

            {/* Mobile Tabs */}
            <div className="sm:hidden border-b">
                <div className="flex">
                    <button
                        className={`flex-1 py-3 text-sm font-medium border-b-2 ${
                            activeTab === 'monthly' 
                                ? 'border-red-500 text-red-600' 
                                : 'border-transparent text-gray-500'
                        }`}
                        onClick={() => setActiveTab('monthly')}
                    >
                        Monthly ({filteredMonthlyVehicles.length})
                    </button>
                    <button
                        className={`flex-1 py-3 text-sm font-medium border-b-2 ${
                            activeTab === 'daily' 
                                ? 'border-red-500 text-red-600' 
                                : 'border-transparent text-gray-500'
                        }`}
                        onClick={() => setActiveTab('daily')}
                    >
                        Daily ({filteredDailyVehicles.length})
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="p-6 text-center text-gray-500">Loading expired vehicles...</div>
            ) : (
                <>
                    {/* Mobile View */}
                    <div className="sm:hidden">
                        {activeTab === 'monthly' ? (
                            <div className="bg-white">
                                {filteredMonthlyVehicles.length === 0 ? (
                                    <div className="p-6 text-center text-gray-500">No expired vehicles</div>
                                ) : (
                                    <div className="divide-y divide-gray-200">
                                        {filteredMonthlyVehicles.map(renderVehicleCard)}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-white">
                                {filteredDailyVehicles.length === 0 ? (
                                    <div className="p-6 text-center text-gray-500">No expired vehicles</div>
                                ) : (
                                    <div className="divide-y divide-gray-200">
                                        {filteredDailyVehicles.map(renderVehicleCard)}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Desktop View */}
                    <div className="hidden sm:grid sm:grid-cols-2 gap-4 p-4">
                        <div className="bg-white shadow rounded-lg">
                            <h2 className="text-xl font-semibold p-4 border-b">Monthly</h2>
                            {filteredMonthlyVehicles.length === 0 ? (
                                <div className="p-6 text-center text-gray-500">No expired vehicles</div>
                            ) : (
                                <div className="divide-y divide-gray-200">
                                    {filteredMonthlyVehicles.map(renderVehicleCard)}
                                </div>
                            )}
                        </div>
                        <div className="bg-white shadow rounded-lg">
                            <h2 className="text-xl font-semibold p-4 border-b">Daily</h2>
                            {filteredDailyVehicles.length === 0 ? (
                                <div className="p-6 text-center text-gray-500">No expired vehicles</div>
                            ) : (
                                <div className="divide-y divide-gray-200">
                                    {filteredDailyVehicles.map(renderVehicleCard)}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {selectedVehicle && (
                <VehicleActions 
                    vehicle={selectedVehicle} 
                    onClose={() => setSelectedVehicle(null)}
                    onRefresh={fetchExpiredVehicles}
                />
            )}
        </div>
    );
}

export default ManageVehicles;
