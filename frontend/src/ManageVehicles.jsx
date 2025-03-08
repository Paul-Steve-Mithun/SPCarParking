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

    const sortByLotNumber = (vehicles) => {
        // Group vehicles by wing
        const wingGroups = {
            A: [],
            B: [],
            C: [],
            Open: []
        };

        // Sort vehicles into their respective wings
        vehicles.forEach(vehicle => {
            if (!vehicle.lotNumber) {
                wingGroups.Open.push(vehicle);
            } else {
                const wing = vehicle.lotNumber.charAt(0).toUpperCase();
                if (wing === 'A') wingGroups.A.push(vehicle);
                else if (wing === 'B') wingGroups.B.push(vehicle);
                else if (wing === 'C') wingGroups.C.push(vehicle);
                else wingGroups.Open.push(vehicle);
            }
        });

        // Helper function to extract number from lot number
        const getLotNumber = (lotNumber) => {
            if (!lotNumber) return 999999; // For open parking
            const num = parseInt(lotNumber.substring(1));
            return isNaN(num) ? 999999 : num;
        };

        // Sort vehicles within each wing by numeric value
        Object.keys(wingGroups).forEach(wing => {
            wingGroups[wing].sort((a, b) => {
                if (!a.lotNumber) return 1;
                if (!b.lotNumber) return -1;
                return getLotNumber(a.lotNumber) - getLotNumber(b.lotNumber);
            });
        });

        // Combine all sorted groups in the desired order
        return [
            ...wingGroups.A,  // A1-A11
            ...wingGroups.B,  // B1-B20
            ...wingGroups.C,  // C1-C21
            ...wingGroups.Open
        ];
    };

    const filteredMonthlyVehicles = sortByLotNumber(
        vehicles.filter(vehicle => 
            vehicle.rentalType === 'monthly' && 
            (vehicle.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
             vehicle.vehicleDescription?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             vehicle.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
             (vehicle.lotNumber && vehicle.lotNumber.toLowerCase().includes(searchTerm.toLowerCase())))
        )
    );

    const filteredDailyVehicles = sortByLotNumber(
        vehicles.filter(vehicle => 
            vehicle.rentalType === 'daily' && 
            (vehicle.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
             vehicle.vehicleDescription?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             vehicle.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
             (vehicle.lotNumber && vehicle.lotNumber.toLowerCase().includes(searchTerm.toLowerCase())))
        )
    );

    const handlePrintInvoice = async (vehicle) => {
        try {
            const totalAmount = vehicle.rentalType === 'daily' ? 
                vehicle.rentPrice * vehicle.numberOfDays : 
                vehicle.rentPrice;

            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const columnWidth = 85;
            const startX1 = 15;
            const startX2 = 110;
            
            // Modern Header with Gradient - Reduced top margin
            const gradient = doc.setFillColor(0, 128, 0);
            doc.rect(0, 0, pageWidth, 40, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(28);
            doc.text('SP CAR PARKING', pageWidth/2, 25, { align: 'center' });
            
            // Subtitle
            doc.setFontSize(12);
            doc.setFont("helvetica", "normal");
            doc.text('SP Nagar, Ponmeni - Madakkulam Main Road, Madurai. (Opp. to Our Lady School)', pageWidth/2, 35, { align: 'center' });
            
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
            ];

            doc.autoTable({
                startY: 60,
                margin: { left: startX1 },
                head: [],
                body: vehicleDetails,
                theme: 'plain',
                styles: { 
                    fontSize: 12,  // Increased from 10
                    cellPadding: 3,
                    font: 'helvetica',
                    textColor: [44, 62, 80]
                },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 35 },
                    1: { cellWidth: 55 }  // Increased from 50
                }
            });

            createSection('Agreement Details', startX1, doc.autoTable.previous.finalY + 15);

            const agreementDetails = [
                ['Start Date:', (() => {
                    const endDate = new Date(vehicle.endDate);
                    const firstDay = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
                    return firstDay.toLocaleDateString('en-GB');
                })()],
                ['End Date:', (() => {
                    const endDate = new Date(vehicle.endDate);
                    const lastDay = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);
                    return lastDay.toLocaleDateString('en-GB');
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
                    fontSize: 12,
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
                    fontSize: 12,
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
                ['1.', 'Rent must be paid before 5th of each month.'],
                ['2.', '15-day prior notice is required for vacating. Failure will incur a 15-day penalty from advance before refund.'],
                ['3.', 'Parking spot must be kept clean.'],
                ['4.', 'No unauthorized vehicle transfers.'],
            ];

            doc.autoTable({
                startY: doc.autoTable.previous.finalY + 15,
                margin: { left: startX2 },
                head: [],
                body: terms,
                theme: 'plain',
                styles: { 
                    fontSize: 12,
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
            const qrWidth = 60;  // Reduced from 60
            const qrX = startX2 + ((columnWidth - qrWidth) / 2);

            doc.addImage(
                qrDataUrl, 
                'PNG', 
                qrX,
                doc.autoTable.previous.finalY + 25,  // Reduced spacing
                qrWidth,
                60  // Reduced from 60
            );

            // Modern Footer
            doc.setDrawColor(0, 128, 0);
            doc.setLineWidth(0.5);
            doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);  // Moved up from -25
            
            doc.setFontSize(9);
            doc.setTextColor(44, 62, 80);
            const footer = "JESUS LEADS YOU";
            doc.text(footer, pageWidth/2, pageHeight - 8, { align: 'center' });  // Moved up from -15

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
            doc.text('SP Nagar, Ponmeni - Madakkulam Main Road, Madurai. (Opp. to Our Lady School)', pageWidth/2, 35, { align: 'center' });
            
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
                    fontSize: 12,
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
                    fontSize: 12,
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
                    fontSize: 12,
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
                ['1.', 'Rent must be paid before 5th of each month.'],
                ['2.', 'Parking spot must be kept clean.'],
                ['3.', 'No unauthorized vehicle transfers.'],
                ['4.', 'Save Water and Electricity']
            ];

            doc.autoTable({
                startY: doc.autoTable.previous.finalY + 15,
                margin: { left: startX2 },
                head: [],
                body: terms,
                theme: 'plain',
                styles: { 
                    fontSize: 12,
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
            doc.setTextColor(44, 62, 80);
            const footer = "JESUS LEADS YOU";
            doc.text(footer, pageWidth/2, pageHeight - 15, { align: 'center' });

            doc.save(`SP_Parking_Receipt_${vehicle.vehicleNumber}_Daily.pdf`);
            toast.success('Receipt generated successfully');
        } catch (error) {
            console.error('Error generating receipt:', error);
            toast.error('Failed to generate receipt');
        }
    };

    const renderVehicleCard = (vehicle) => {
        // Calculate due amount and days for daily rentals
        let dueAmount = 0;
        let dueDays = 0;
        if (vehicle.rentalType === 'daily') {
            const startDate = new Date(vehicle.endDate);
            startDate.setDate(startDate.getDate() + 1);
            startDate.setHours(0, 0, 0, 0);
            
            const endDate = new Date();
            endDate.setHours(0, 0, 0, 0);

            const diffTime = endDate.getTime() - startDate.getTime();
            dueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
            dueAmount = vehicle.rentPrice * dueDays;
        }

        return (
            <div 
                key={vehicle._id} 
                className="p-4 hover:bg-gray-50 cursor-pointer relative"
                onClick={() => setSelectedVehicle(vehicle)}
            >
                {/* Printer Button - Absolute positioned */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
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
                            {vehicle.lotNumber || 'Open'}
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
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                                    Paid: ₹{vehicle.rentPrice * vehicle.numberOfDays}
                                </span>
                                {dueAmount > 0 && (
                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs border border-red-200">
                                        <span className="font-bold">Due ({dueDays} days): ₹{dueAmount}</span>
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-red-500">
                        Rental Period Ended: {new Date(vehicle.endDate).toLocaleDateString('en-GB')}
                    </p>
                </div>
            </div>
        );
    };

    const generateDatabaseReport = async () => {
        try {
            const doc = new jsPDF('landscape');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            
            // Modern header with gradient
            doc.setFillColor(220, 38, 38);
            doc.rect(0, 0, pageWidth, 35, 'F');
            
            // Company name
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(24);
            doc.setFont('helvetica', 'bold');
            doc.text('SP CAR PARKING', pageWidth / 2, 18, { align: 'center' });
            
            // Report title and date
            doc.setFontSize(14);
            const currentDate = new Date().toLocaleDateString('en-GB');
            doc.text(`Outstanding Vehicles Report (Generated: ${currentDate})`, pageWidth / 2, 28, { align: 'center' });

            // Calculate statistics
            const totalVehicles = vehicles.length;
            const expiredMonthly = vehicles.filter(v => v.rentalType === 'monthly').length;
            const expiredDaily = vehicles.filter(v => v.rentalType === 'daily').length;
            const totalMonthlyDue = vehicles
                .filter(v => v.rentalType === 'monthly')
                .reduce((sum, v) => sum + v.rentPrice, 0);
            const totalDailyDue = vehicles
                .filter(v => v.rentalType === 'daily')
                .reduce((sum, v) => {
                    const startDate = new Date(v.endDate);
                    startDate.setDate(startDate.getDate() + 1);
                    startDate.setHours(0, 0, 0, 0);
                    
                    const endDate = new Date();
                    endDate.setHours(0, 0, 0, 0);

                    const diffTime = endDate.getTime() - startDate.getTime();
                    const dueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    return sum + (v.rentPrice * dueDays);
                }, 0);

            // Calculate total table width based on column widths
            const columnWidths = {
                serialNumber: 15,
                vehicleNumber: 30,
                description: 40,
                parkingType: 25,
                rentalType: 30,
                daysOverdue: 25,
                dueAmount: 45  // Increased from 30 to 45 to match other reports
            };
            
            const totalTableWidth = Object.values(columnWidths).reduce((sum, width) => sum + width, 0);
            const leftMargin = (pageWidth - totalTableWidth) / 2;

            // Table columns
            const tableColumn = [
                { header: 'S.No', dataKey: 'serialNumber' },
                { header: 'Vehicle Number', dataKey: 'vehicleNumber' },
                { header: 'Description', dataKey: 'description' },
                { header: 'Parking Type', dataKey: 'parkingType' },
                { header: 'Rental Type', dataKey: 'rentalType' },
                { header: 'Days Overdue', dataKey: 'daysOverdue' },
                { header: 'Due Amount', dataKey: 'dueAmount' }
            ];

            // Add the formatAmount function
            const formatAmount = (amount) => {
                if (amount === '-') return '-';
                
                // Convert amount to string with 2 decimal places
                const amountStr = amount.toFixed(2);
                
                // Calculate spaces needed (for maximum 999999.00 = 9 characters)
                const spaceNeeded = Math.max(0, 10 - amountStr.length);
                const spaces = ' '.repeat(spaceNeeded);
                
                // Return formatted string with consistent spacing
                return `INR${spaces}${amountStr}`;
            };

            // Update table data preparation
            const tableRows = sortByLotNumber(vehicles).map((vehicle, index) => {
                let dueAmount = vehicle.rentPrice;
                let daysOverdue = 'Monthly';
                
                if (vehicle.rentalType === 'daily') {
                    const startDate = new Date(vehicle.endDate);
                    startDate.setDate(startDate.getDate() + 1);
                    startDate.setHours(0, 0, 0, 0);
                    
                    const endDate = new Date();
                    endDate.setHours(0, 0, 0, 0);

                    const diffTime = endDate.getTime() - startDate.getTime();
                    daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    dueAmount = vehicle.rentPrice * daysOverdue;
                }
                
                return {
                    serialNumber: index + 1,
                    vehicleNumber: vehicle.vehicleNumber,
                    description: vehicle.vehicleDescription || '',
                    parkingType: vehicle.lotNumber || 'Open',
                    rentalType: `${capitalizeFirst(vehicle.rentalType)}${vehicle.rentalType === 'daily' ? ` (${vehicle.numberOfDays} days)` : ''}`,
                    daysOverdue: daysOverdue,
                    dueAmount: formatAmount(dueAmount)
                };
            });

            // Add variables to track pages and overflow status
            let totalPages = 1;
            let hasStatsOverflow = false;
            let lastTablePage = 1;
            let pageNumbers = [];  // Store page numbers for later

            // Generate table
            doc.autoTable({
                columns: tableColumn,
                body: tableRows,
                startY: 45,
                theme: 'grid',
                headStyles: {
                    fillColor: [220, 38, 38],
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
                    cellPadding: 3,
                    lineColor: [237, 237, 237],
                    valign: 'middle'
                },
                columnStyles: {
                    serialNumber: { cellWidth: columnWidths.serialNumber, halign: 'center' },
                    vehicleNumber: { cellWidth: columnWidths.vehicleNumber, halign: 'center' },
                    description: { cellWidth: columnWidths.description, halign: 'left' },
                    parkingType: { cellWidth: columnWidths.parkingType, halign: 'center' },
                    rentalType: { cellWidth: columnWidths.rentalType, halign: 'center' },
                    daysOverdue: { cellWidth: columnWidths.daysOverdue, halign: 'center' },
                    dueAmount: { cellWidth: columnWidths.dueAmount, halign: 'right' }
                },
                alternateRowStyles: {
                    fillColor: [254, 242, 242]
                },
                margin: { 
                    left: leftMargin,
                    right: leftMargin,
                    bottom: 20
                },
                styles: {
                    fontSize: 10,
                    font: 'helvetica',
                    lineWidth: 0.1,
                    overflow: 'linebreak',
                    cellWidth: 'auto'
                },
                didParseCell: function(data) {
                    // For amount column, use monospace font and bold style
                    if (data.column.dataKey === 'dueAmount') {
                        data.cell.styles.font = 'courier';
                        data.cell.styles.fontStyle = 'bold';
                    }
                },
                didDrawCell: function(data) {
                    if (data.row.index === tableRows.length - 1 && data.column.index === tableColumn.length - 1) {
                        let finalY = data.cell.y + data.cell.height + 15;
                        const requiredHeight = 70;
                        
                        if (pageHeight - finalY < requiredHeight) {
                            hasStatsOverflow = true;
                            lastTablePage = doc.internal.getCurrentPageInfo().pageNumber;
                            doc.addPage();
                            finalY = 40;
                            totalPages = doc.internal.getNumberOfPages();
                        }

                        // Set styles for totals
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(11);
                        doc.setTextColor(0, 0, 0);
                        doc.setDrawColor(200, 200, 200);
                        doc.setLineWidth(0.1);

                        // Calculate positions for right side boxes
                        const boxWidth = 80;
                        const boxHeight = 12;
                        const boxX = pageWidth - leftMargin - boxWidth;
                        const textPadding = 2;
                        const lineSpacing = 10;

                        // Function to draw a box with text
                        const drawTotalBox = (y, label, amount, isGrandTotal = false) => {
                            doc.setDrawColor(200, 200, 200);
                            doc.setFillColor(
                                isGrandTotal ? 254 : 255,  // Red component
                                isGrandTotal ? 242 : 255,  // Green component
                                isGrandTotal ? 242 : 255   // Blue component
                            );
                            doc.setLineWidth(0.1);
                            doc.roundedRect(boxX, y - boxHeight + 5, boxWidth, boxHeight, 1, 1, 'FD');

                            // Set bold font for label
                            doc.setFont('helvetica', 'bold');
                            const labelX = boxX + textPadding;
                            doc.text(label, labelX, y);

                            // Set monospace bold font for amount
                            doc.setFont('courier', 'bold');
                            const amountX = boxX + boxWidth - textPadding;
                            doc.text(
                                formatAmount(amount),
                                amountX,
                                y,
                                { align: 'right' }
                            );
                        };

                        // Draw right side amount boxes
                        drawTotalBox(
                            finalY,
                            'Monthly Due :', 
                            totalMonthlyDue
                        );

                        drawTotalBox(
                            finalY + lineSpacing,
                            'Daily Due :', 
                            totalDailyDue
                        );

                        drawTotalBox(
                            finalY + (lineSpacing * 2),
                            'Total Due :', 
                            totalMonthlyDue + totalDailyDue,
                            true
                        );
                    }
                },
                didDrawPage: function(data) {
                    // Store current page info for later
                    pageNumbers.push({
                        pageNumber: doc.internal.getCurrentPageInfo().pageNumber,
                        y: pageHeight - 15
                    });
                }
            });

            // After everything is drawn, add page numbers
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(11);
                doc.setTextColor(0, 0, 0);
                doc.text(
                    `Page ${i} of ${totalPages}`,
                    pageWidth / 2,
                    pageHeight - 15,
                    { align: 'center' }
                );
            }

            doc.save(`SP_Outstanding_Vehicles_Report_${currentDate.replace(/\//g, '-')}.pdf`);
            toast.success('Outstanding vehicles report generated successfully');
        } catch (error) {
            console.error('Error generating report:', error);
            toast.error('Failed to generate report');
        }
    };

    return (
        <div className="max-w-6xl mx-auto bg-white shadow-xl rounded-xl overflow-hidden">
            <Toaster position="top-right" />
            
            <div className="bg-gradient-to-r from-red-500 to-orange-600 p-4 sm:p-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white">Outstanding Vehicles</h1>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={generateDatabaseReport}
                            className="text-white hover:bg-white/20 p-2 rounded-full transition-all"
                            title="Generate Database Report"
                        >
                            <PrinterIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                        <button 
                            onClick={fetchExpiredVehicles} 
                            className="text-white hover:bg-white/20 p-2 rounded-full transition-all"
                        >
                            <RefreshCwIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-4">
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="Search by vehicle number, description, owner name, or lot number..." 
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
