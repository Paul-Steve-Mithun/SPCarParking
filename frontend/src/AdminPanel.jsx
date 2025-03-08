import { useEffect, useState } from 'react';
import { TrashIcon, RefreshCwIcon, SearchIcon, PencilIcon, UserCog2Icon, PrinterIcon } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import VehicleEdit from './VehicleEdit';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import QRCode from 'qrcode'

const capitalizeFirst = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};

export function AdminPanel() {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [printLoading, setPrintLoading] = useState(false);

    const sortByLotNumber = (vehicles) => {
        return [...vehicles].sort((a, b) => {
            const getLotParts = (lot) => {
                if (!lot) return { letter: 'Z', number: Infinity }; // Push 'Open' parking to the end
                const letter = lot.charAt(0);
                const number = parseInt(lot.slice(1)) || 0;
                return { letter, number };
            };

            const lotA = getLotParts(a.lotNumber);
            const lotB = getLotParts(b.lotNumber);

            // First compare letters
            if (lotA.letter !== lotB.letter) {
                return lotA.letter.localeCompare(lotB.letter);
            }

            // If letters are same, compare numbers
            return lotA.number - lotB.number;
        });
    };

    const fetchVehicles = async () => {
        setLoading(true);
        try {
            const response = await fetch('https://spcarparkingbknd.onrender.com/vehicles');
            const data = await response.json();
            const sortedData = sortByLotNumber(data);
            setVehicles(sortedData);
        } catch (error) {
            toast.error('Failed to fetch vehicles');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVehicles();
        const intervalId = setInterval(fetchVehicles, 600000);
        return () => clearInterval(intervalId);
    }, []);

    const removeVehicle = async (id) => {
        try {
            await fetch(`https://spcarparkingbknd.onrender.com/removeVehicle/${id}`, { method: 'DELETE' });
            setVehicles(vehicles.filter(v => v._id !== id));
            toast.success('Vehicle Removed Successfully');
        } catch (error) {
            toast.error('Failed to remove vehicle');
        }
    };

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
            doc.rect(0, 0, pageWidth, 35, 'F');  // Reduced from 40 to 35
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(28);
            doc.text('SP CAR PARKING', pageWidth/2, 15, { align: 'center' });  // Moved up from 20 to 15
            
            // Welcome text with smaller font
            doc.setFontSize(18);
            doc.text('Welcomes You', pageWidth/2, 25, { align: 'center' });  // Moved up from 30 to 25
            
            // Subtitle inside the header
            doc.setFontSize(12);
            doc.setFont("helvetica", "normal");
            doc.text('SP Nagar, Ponmeni - Madakkulam Main Road, Madurai. (Opp. to Our Lady School)', pageWidth/2, 33, { align: 'center' });  // Moved up from 38 to 33
            
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

            // Start content higher on the page
            const startY = 50;  // Reduced from 60

            // Left Column - Vehicle Details
            createSection('Vehicle Details', startX1, startY);

            const vehicleDetails = [
                ['Vehicle No:', vehicle.vehicleNumber],
                ['Description:', vehicle.vehicleDescription],
                ['Lot Number:', vehicle.lotNumber || 'Open'],
                ['Rental Type:', capitalizeFirst(vehicle.rentalType)],
                ['Status:', vehicle.status === 'active' ? 'Paid' : 'Not Paid'],
                ['Start Date:', new Date(vehicle.startDate).toLocaleDateString('en-GB')],
                ['Advance:', `INR ${vehicle.advanceAmount}`],
                ['Rent:', `INR ${vehicle.rentPrice}`],
                ['Duration:', vehicle.rentalType === 'daily' ? 
                    `${vehicle.numberOfDays} days` : 'Every Month']  ];

            doc.autoTable({
                startY: startY + 8,
                margin: { left: startX1, right: startX1 },
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
                    1: { cellWidth: 55 }
                }
            });

            // Owner Details with reduced spacing
            const ownerY = doc.autoTable.previous.finalY + 10;  // Reduced from 15
            createSection('Owner Details', startX1, ownerY);

            const ownerDetails = [
                ['Name:', 'MR. ' + vehicle.ownerName || 'N/A'],
                ['Contact:', vehicle.contactNumber || 'N/A'],
                ['Address:', vehicle.ownerAddress || 'N/A']
            ];

            doc.autoTable({
                startY: ownerY + 8,
                margin: { left: startX1 },
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
                    1: { cellWidth: 55 }
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

            // Right Column - Our Facilities with proper spacing
            createSection('Our Facilities', startX2, startY);

            const facilities = [
                ['1.', '24/7 Security Surveillance'],
                ['2.', '24/7 Watchman Securtiy'],
                ['3.', 'Private Parking Lot'],
                ['4.', 'Water and Washroom Facility'],

            ];

            doc.autoTable({
                startY: startY + 8,  // Reduced from 10
                margin: { left: startX2 },
                head: [],
                body: facilities,
                theme: 'plain',
                styles: { 
                    fontSize: 12,
                    cellPadding: 3,  // Reduced from 3
                    font: 'helvetica',
                    textColor: [44, 62, 80]
                },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 12 },
                    1: { cellWidth: 80 }
                }
            });

            // Terms and Conditions with reduced spacing
            const termsY = doc.autoTable.previous.finalY + 8;  // Reduced from 15
            createSection('Terms & Conditions', startX2, termsY);

            const terms = [
                ['1.', 'Rent must be paid before 5th of each month.'],
                ['2.', '15-day prior notice is required for vacating. Failure will incur a 15-day penalty from advance before refund.'],
                ['3.', 'Parking spot must be kept clean.'],
                ['4.', 'No unauthorized vehicle transfers.'],
            ];

            doc.autoTable({
                startY: termsY + 8,  // Reduced from 10
                margin: { left: startX2 },
                head: [],
                body: terms,
                theme: 'plain',
                styles: { 
                    fontSize: 12,
                    cellPadding: 3,  // Reduced from 3
                    font: 'helvetica',
                    textColor: [44, 62, 80]
                },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 12 },
                    1: { cellWidth: 80 }
                }
            });

            // Contact Details with reduced spacing
            const contactY = doc.autoTable.previous.finalY + 8;  // Reduced from 15
            createSection('Contact Details', startX2, contactY);

            const contacts = [
                ['Watchman:', '9842850753'],
                ['Rental:', '9842190000']
            ];

            doc.autoTable({
                startY: contactY + 8,
                margin: { left: startX2 },
                head: [],
                body: contacts,
                theme: 'plain',
                styles: { 
                    fontSize: 12,
                    cellPadding: 3,
                    font: 'helvetica',
                    textColor: [44, 62, 80]
                },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 35 },
                    1: { cellWidth: 55 }
                }
            });

            // QR Code Section with reduced size and spacing
            const qrY = doc.autoTable.previous.finalY + 8;  // Reduced from 10
            doc.setFontSize(16);
            doc.setTextColor(0, 128, 0);
            doc.text('Scan QR to Pay', startX2, qrY);
            doc.setFontSize(10);
            doc.text('(Ignore if already paid)', startX2, qrY + 6);  // Reduced from 8
            doc.setDrawColor(0, 128, 0);
            doc.setLineWidth(0.5);
            doc.line(startX2, qrY + 2, startX2 + columnWidth, qrY + 2);
            doc.setTextColor(44, 62, 80);

            // Generate QR Code with smaller size
            const qrData = `upi://pay?pa=paulcars2000@oksbi&pn=PAULCARS&am=${totalAmount}&tr=${vehicle._id}&tn=SP_CAR_PARKING_${vehicle.vehicleNumber}`;
            const qrDataUrl = await QRCode.toDataURL(qrData, {
                width: 25,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            });

            // Center QR code with reduced size
            const qrWidth = 45;  // Reduced from 50
            const qrX = startX2 + ((columnWidth - qrWidth) / 2);

            doc.addImage(
                qrDataUrl, 
                'PNG', 
                qrX,
                qrY + 10,  // Changed from 20 to 15
                qrWidth,
                45  // Changed from 50 to 45
            );

            // Modern Footer - Moved closer to bottom
            doc.setDrawColor(0, 128, 0);
            doc.setLineWidth(0.5);
            doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);
            
            doc.setFontSize(9);
            doc.setTextColor(44, 62, 80);
            const footer = "JESUS LEADS YOU";
            doc.text(footer, pageWidth/2, pageHeight - 8, { align: 'center' });

            doc.save(`SP_Parking_Receipt_${vehicle.vehicleNumber}.pdf`);
            toast.success('Receipt generated successfully');
        } catch (error) {
            console.error('Error generating receipt:', error);
            toast.error('Failed to generate receipt');
        }
    };

    const handlePrintDailyInvoice = async (vehicle) => {
        try {
            const startDate = new Date(vehicle.startDate);
            startDate.setHours(0, 0, 0, 0);
            
            const endDate = new Date(vehicle.endDate);
            endDate.setHours(0, 0, 0, 0);

            const totalAmount = vehicle.rentPrice * vehicle.numberOfDays;

            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const columnWidth = 85;
            const startX1 = 15;
            const startX2 = 110;
            
            // Modern Header with Gradient - Reduced top margin
            const gradient = doc.setFillColor(0, 128, 0);
            doc.rect(0, 0, pageWidth, 35, 'F');  // Reduced from 40 to 35
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(28);
            doc.text('SP CAR PARKING', pageWidth/2, 15, { align: 'center' });  // Moved up from 20 to 15
            
            // Welcome text with smaller font
            doc.setFontSize(18);
            doc.text('Welcomes You', pageWidth/2, 25, { align: 'center' });  // Moved up from 30 to 25
            
            // Subtitle inside the header
            doc.setFontSize(12);
            doc.setFont("helvetica", "normal");
            doc.text('SP Nagar, Ponmeni - Madakkulam Main Road, Madurai. (Opp. to Our Lady School)', pageWidth/2, 33, { align: 'center' });  // Moved up from 38 to 33
            
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

            // Start content higher on the page
            const startY = 50;  // Reduced from 60

            // Left Column - Vehicle Details
            createSection('Vehicle Details', startX1, startY);

            const vehicleDetails = [
                ['Vehicle No:', vehicle.vehicleNumber],
                ['Description:', vehicle.vehicleDescription],
                ['Lot Number:', vehicle.lotNumber || 'Open'],
                ['Rental Type:', capitalizeFirst(vehicle.rentalType)],
                ['Status:', vehicle.status === 'active' ? 'Paid' : 'Not Paid'],
                ['Rent/Day:', `INR ${vehicle.rentPrice}`],
                ['Duration:', `${vehicle.numberOfDays} days`],
                ['Total:', `INR ${totalAmount}`],
                ['Start Date:', new Date(vehicle.startDate).toLocaleDateString('en-GB')],
                ['End Date:', new Date(vehicle.endDate).toLocaleDateString('en-GB')]
            ];

            doc.autoTable({
                startY: startY + 8,  // Changed from 5 to 8
                margin: { left: startX1, right: startX1 },
                head: [],
                body: vehicleDetails,
                theme: 'plain',
                styles: { 
                    fontSize: 12,
                    cellPadding: 3,  // Changed from 2 to 3
                    font: 'helvetica',
                    textColor: [44, 62, 80]
                },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 35 },  // Changed from 40 to 35
                    1: { cellWidth: 55 }
                }
            });

            // Owner Details with reduced spacing
            const ownerY = doc.autoTable.previous.finalY + 10;  // Reduced from 15
            createSection('Owner Details', startX1, ownerY);

            const ownerDetails = [
                ['Name:', 'MR. ' + vehicle.ownerName || 'N/A'],
                ['Contact:', vehicle.contactNumber || 'N/A'],
                ['Address:', vehicle.ownerAddress || 'N/A']
            ];

            doc.autoTable({
                startY: ownerY + 8,  // Changed from 5 to 8
                margin: { left: startX1 },
                head: [],
                body: ownerDetails,
                theme: 'plain',
                styles: { 
                    fontSize: 12,
                    cellPadding: 3,  // Changed from 2 to 3
                    font: 'helvetica',
                    textColor: [44, 62, 80]
                },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 35 },  // Changed from 40 to 35
                    1: { cellWidth: 55 }
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

            // Right Column - Our Facilities with proper spacing
            createSection('Our Facilities', startX2, startY);

            const facilities = [
                ['1.', '24/7 Security Surveillance'],
                ['2.', '24/7 Watchman Securtiy'],
                ['3.', 'Private Parking Lot'],
                ['4.', 'Water and Washroom Facility']
            ];

            doc.autoTable({
                startY: startY + 8,  // Changed from 5 to 8
                margin: { left: startX2 },
                head: [],
                body: facilities,
                theme: 'plain',
                styles: { 
                    fontSize: 12,
                    cellPadding: 3,  // Changed from 2 to 3
                    font: 'helvetica',
                    textColor: [44, 62, 80]
                },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 12 },
                    1: { cellWidth: 80 }
                }
            });

            // Terms and Conditions with reduced spacing
            const termsY = doc.autoTable.previous.finalY + 10;  // Reduced from 15
            createSection('Terms & Conditions', startX2, termsY);

            const terms = [
                ['1.', 'Rent must be paid before 5th of each month.'],
                ['2.', 'Parking spot must be kept clean.'],
                ['3.', 'No unauthorized vehicle transfers.'],
                ['4.', 'Save Water and Electricity.']
            ];

            doc.autoTable({
                startY: termsY + 8,  // Changed from 5 to 8
                margin: { left: startX2 },
                head: [],
                body: terms,
                theme: 'plain',
                styles: { 
                    fontSize: 12,
                    cellPadding: 3,  // Changed from 2 to 3
                    font: 'helvetica',
                    textColor: [44, 62, 80]
                },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 12 },
                    1: { cellWidth: 80 }
                }
            });

            // Contact Details with reduced spacing
            const contactY = doc.autoTable.previous.finalY + 10;  // Reduced from 15
            createSection('Contact Details', startX2, contactY);

            const contacts = [
                ['Watchman:', '9842850753'],
                ['Rental:', '9842190000']
            ];

            doc.autoTable({
                startY: contactY + 8,  // Changed from 5 to 8
                margin: { left: startX2 },
                head: [],
                body: contacts,
                theme: 'plain',
                styles: { 
                    fontSize: 12,
                    cellPadding: 3,  // Changed from 2 to 3
                    font: 'helvetica',
                    textColor: [44, 62, 80]
                },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 35 },  // Changed from 40 to 35
                    1: { cellWidth: 55 }
                }
            });

            // QR Code Section with reduced size and spacing
            const qrY = doc.autoTable.previous.finalY + 8;  // Reduced from 10
            doc.setFontSize(16);
            doc.setTextColor(0, 128, 0);
            doc.text('Scan QR to Pay', startX2, qrY);
            doc.setFontSize(10);
            doc.text('(Ignore if already paid)', startX2, qrY + 6);  // Reduced from 8
            doc.setDrawColor(0, 128, 0);
            doc.setLineWidth(0.5);
            doc.line(startX2, qrY + 2, startX2 + columnWidth, qrY + 2);
            doc.setTextColor(44, 62, 80);

            // Generate QR Code with smaller size
            const qrData = `upi://pay?pa=paulcars2000@oksbi&pn=PAULCARS&am=${totalAmount}&tr=${vehicle._id}&tn=SP_CAR_PARKING_${vehicle.vehicleNumber}_DAILY`;
            const qrDataUrl = await QRCode.toDataURL(qrData, {
                width: 25,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            });

            // Center QR code with reduced size
            const qrWidth = 45;  // Reduced from 50
            const qrX = startX2 + ((columnWidth - qrWidth) / 2);

            doc.addImage(
                qrDataUrl, 
                'PNG', 
                qrX,
                qrY + 15,  // Changed from 20 to 15
                qrWidth,
                45  // Changed from 50 to 45
            );

            // Modern Footer - Moved closer to bottom
            doc.setDrawColor(0, 128, 0);
            doc.setLineWidth(0.5);
            doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);
            
            doc.setFontSize(9);
            doc.setTextColor(44, 62, 80);
            const footer = "JESUS LEADS YOU";
            doc.text(footer, pageWidth/2, pageHeight - 8, { align: 'center' });

            doc.save(`SP_Parking_Receipt_${vehicle.vehicleNumber}_Daily.pdf`);
            toast.success('Receipt generated successfully');
        } catch (error) {
            console.error('Error generating receipt:', error);
            toast.error('Failed to generate receipt');
        }
    };

    const filteredVehicles = sortByLotNumber(
        vehicles.filter(vehicle => {
            const searchTermLower = searchTerm.toLowerCase();
            return (
                vehicle.vehicleNumber.toLowerCase().includes(searchTermLower) ||
                vehicle.ownerName.toLowerCase().includes(searchTermLower) ||
                vehicle.vehicleDescription.toLowerCase().includes(searchTermLower) ||
                // Check for both lot number and "open" parking
                (vehicle.lotNumber 
                    ? vehicle.lotNumber.toLowerCase().includes(searchTermLower)
                    : searchTermLower === 'open')
            );
        })
    );

    const isExpired = (endDate) => {
        return new Date(endDate) < new Date();
    };

    const StatusBadge = ({ status, endDate }) => {
        const expired = isExpired(endDate);
        const getStatusStyles = () => {
            if (expired) {
                return "bg-red-100 text-red-800 border-red-200";
            }
            return status === 'active' 
                ? "bg-green-100 text-green-800 border-green-200"
                : "bg-gray-100 text-gray-800 border-gray-200";
        };

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusStyles()}`}>
                {expired ? 'Expired' : status}
            </span>
        );
    };

    const getRemainingTime = (endDate) => {
        // Convert endDate to local time zone
        const end = new Date(new Date(endDate).toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
        const diff = end - now;
    
        if (diff < 0) return <p className="text-xs text-red-500 mt-1"> Rental Period Ended: {new Date(endDate).toLocaleDateString('en-GB')} </p>;
    
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
        if (days > 0) return `${days}d ${hours}h remaining`;
        return `${hours}h remaining`;
    };

    const renderRentalInfo = (vehicle) => {
        if (vehicle.rentalType === 'daily') {
            return `Daily - ₹${vehicle.rentPrice} for ${vehicle.numberOfDays} days`;
        }
        return `Monthly - ₹${vehicle.rentPrice}`;
    };

    // Add the due amount calculation function
    const calculateDueAmount = (vehicle) => {
        if (vehicle.rentalType === 'daily' && vehicle.status === 'inactive') {
            const startDate = new Date(vehicle.endDate);
            startDate.setDate(startDate.getDate() + 1);
            startDate.setHours(0, 0, 0, 0);
            
            const endDate = new Date();
            endDate.setHours(0, 0, 0, 0);

            const diffTime = endDate.getTime() - startDate.getTime();
            const numberOfDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
            
            return vehicle.rentPrice * numberOfDays;
        }
        return 0;
    };

    const generateDatabaseReport = async () => {
        try {
            const doc = new jsPDF('landscape');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            
            // Modern header with gradient
            doc.setFillColor(79, 70, 229);
            doc.rect(0, 0, pageWidth, 35, 'F');
            
            // Company name
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(24);
            doc.setFont('helvetica', 'bold');
            doc.text('SP CAR PARKING', pageWidth / 2, 18, { align: 'center' });
            
            // Report title and date
            doc.setFontSize(14);
            const currentDate = new Date().toLocaleDateString('en-GB');
            doc.text(`Vehicle Database Report (Generated: ${currentDate})`, pageWidth / 2, 28, { align: 'center' });

            // Summary cards section
            const summaryY = 45;
            const cardWidth = (pageWidth - 70) / 5; // Divide available space into 5 cards
            const cardMargin = 14;
            
            // Calculate statistics
            const totalVehicles = vehicles.length;
            const activeMonthly = vehicles.filter(v => v.status === 'active' && v.rentalType === 'monthly').length;
            const inactiveMonthly = vehicles.filter(v => v.status === 'inactive' && v.rentalType === 'monthly').length;
            const activeDaily = vehicles.filter(v => v.status === 'active' && v.rentalType === 'daily').length;
            const inactiveDaily = vehicles.filter(v => v.status === 'inactive' && v.rentalType === 'daily').length;

            // Create summary cards
            const summaryCards = [
                { title: 'Total Vehicles', value: totalVehicles },
                { title: 'Active Monthly', value: activeMonthly },
                { title: 'Inactive Monthly', value: inactiveMonthly },
                { title: 'Active Daily', value: activeDaily },
                { title: 'Inactive Daily', value: inactiveDaily }
            ];

            // Draw cards
            summaryCards.forEach((card, index) => {
                const cardX = cardMargin + (index * (cardWidth + 10));
                
                // Card background
                doc.setFillColor(246, 246, 252);
                doc.roundedRect(cardX, summaryY, cardWidth, 30, 2, 2, 'F');
                
                // Card title
                doc.setTextColor(79, 70, 229);
                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.text(card.title, cardX + 5, summaryY + 12);
                
                // Card value
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(14);
                doc.text(card.value.toString(), cardX + 5, summaryY + 25);
            });

            // Calculate total table width with adjusted S.No column width
            const columnWidths = {
                serialNumber: 25,    // Increased from 15
                vehicleNumber: 35,
                description: 50,
                parkingType: 30,
                rentalType: 40,
                status: 30,
                rentPrice: 40
            };
            
            const totalTableWidth = Object.values(columnWidths).reduce((sum, width) => sum + width, 0);
            const leftMargin = Math.floor((pageWidth - totalTableWidth) / 2);

            // Table columns
            const tableColumn = [
                { header: 'S.No', dataKey: 'serialNumber' },
                { header: 'Vehicle Number', dataKey: 'vehicleNumber' },
                { header: 'Description', dataKey: 'description' },
                { header: 'Parking Type', dataKey: 'parkingType' },
                { header: 'Rental Type', dataKey: 'rentalType' },
                { header: 'Status', dataKey: 'status' },
                { header: 'Rent Price', dataKey: 'rentPrice' }
            ];

            // Prepare table data
            const tableRows = sortByLotNumber(vehicles).map((vehicle, index) => {
                const dueAmount = calculateDueAmount(vehicle);
                return {
                    serialNumber: index + 1,
                    vehicleNumber: vehicle.vehicleNumber,
                    description: vehicle.vehicleDescription || '',
                    parkingType: vehicle.lotNumber || 'Open',
                    rentalType: `${capitalizeFirst(vehicle.rentalType)}${vehicle.rentalType === 'daily' ? ` (${vehicle.numberOfDays} days)` : ''}`,
                    status: vehicle.status === 'active' ? 'Paid' : 'Not Paid',
                    rentPrice: vehicle.rentalType === 'daily' && dueAmount > 0 
                        ? `Due: INR ${dueAmount}.00`
                        : `INR ${vehicle.rentPrice}.00`,
                    isInactive: vehicle.status === 'inactive'
                };
            });

            // Generate table with updated column widths
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
                    serialNumber: { cellWidth: columnWidths.serialNumber, halign: 'center' },
                    vehicleNumber: { cellWidth: columnWidths.vehicleNumber, halign: 'center' },
                    description: { cellWidth: columnWidths.description, halign: 'left' },
                    parkingType: { cellWidth: columnWidths.parkingType, halign: 'center' },
                    rentalType: { cellWidth: columnWidths.rentalType, halign: 'center' },
                    status: { cellWidth: columnWidths.status, halign: 'center' },
                    rentPrice: { cellWidth: columnWidths.rentPrice, halign: 'right' }
                },
                alternateRowStyles: {
                    fillColor: [250, 250, 255]
                },
                margin: { 
                    left: leftMargin,
                    right: leftMargin
                },
                tableWidth: totalTableWidth,
                didParseCell: function(data) {
                    // Color inactive vehicle rows in red
                    if (data.row.raw && data.row.raw.isInactive) {
                        data.cell.styles.textColor = [220, 38, 38]; // Red color
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

            doc.save(`SP_Vehicle_Database_Report_${currentDate.replace(/\//g, '-')}.pdf`);
            toast.success('Database report generated successfully');
        } catch (error) {
            console.error('Error generating report:', error);
            toast.error('Failed to generate report');
        }
    };

    return (
        <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-xl overflow-hidden">
            <Toaster position="top-right" />
            
            <div className="bg-gradient-to-r from-blue-600 to-blue-600 p-6 flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Vehicles Database</h1>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={generateDatabaseReport}
                        className="text-white hover:bg-white/20 p-2 rounded-full transition-all"
                        title="Generate Database Report"
                    >
                        <PrinterIcon className="w-6 h-6" />
                    </button>
                    <button 
                        onClick={fetchVehicles} 
                        className="text-white hover:bg-white/20 p-2 rounded-full transition-all"
                    >
                        <RefreshCwIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>

            <div className="p-4">
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="Search by vehicle number, owner name, or lot number..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-3 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                    <SearchIcon className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                </div>
            </div>

            {loading ? (
                <div className="p-6 text-center text-gray-500">Loading vehicles...</div>
            ) : filteredVehicles.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No vehicles found</div>
            ) : (
                <div className="divide-y divide-gray-200">
                    {filteredVehicles.map(vehicle => (
                        <div 
                            key={vehicle._id} 
                            className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex-grow cursor-pointer w-full" onClick={() => setSelectedVehicle(vehicle)}>
                                {/* Top row with vehicle number and badges */}
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <p className="font-semibold text-gray-800 min-w-[120px]">{vehicle.vehicleNumber}</p>
                                    
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`px-2 py-1 rounded-full text-xs ${
                                            vehicle.vehicleType === 'own' 
                                                ? 'bg-purple-100 text-purple-600' 
                                                : 'bg-orange-100 text-orange-600'
                                        }`}>
                                            {vehicle.vehicleType === 'own' ? 'Own' : 'T Board'}
                                        </span>

                                        <span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                                            {vehicle.lotNumber || 'Open'}
                                        </span>

                                        <StatusBadge status={vehicle.status} endDate={vehicle.endDate} />
                                    </div>
                                </div>

                                {/* Vehicle description */}
                                <p className="text-sm text-gray-500">{vehicle.vehicleDescription}</p>

                                {/* Rental info */}
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                    <p className="text-sm text-gray-500">{renderRentalInfo(vehicle)}</p>
                                    {vehicle.rentalType === 'daily' && (
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                                                Total: ₹{vehicle.rentPrice * vehicle.numberOfDays}
                                            </span>
                                            {vehicle.status === 'inactive' && (
                                                <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs border border-red-200">
                                                    <span className="font-bold">Due: ₹{calculateDueAmount(vehicle)}</span>
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Remaining time */}
                                <p className="text-xs text-gray-500 mt-1">
                                    {getRemainingTime(vehicle.endDate)}
                                </p>
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-4 mt-2 sm:mt-0 w-full sm:w-auto justify-end">
                                <button
                                    onClick={() => vehicle.rentalType === 'monthly' ? handlePrintInvoice(vehicle) : handlePrintDailyInvoice(vehicle)}
                                    className="text-gray-600 hover:text-blue-600 transition-colors p-2"
                                >
                                    <PrinterIcon className="w-5 h-5" />
                                </button>
                                <button 
                                    onClick={() => setSelectedVehicle(vehicle)}
                                    className="text-gray-600 hover:text-blue-600 transition-colors p-2"
                                >
                                    <UserCog2Icon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selectedVehicle && (
                <VehicleEdit 
                    vehicle={selectedVehicle} 
                    onClose={() => setSelectedVehicle(null)}
                    onUpdate={fetchVehicles}
                    onDelete={removeVehicle}
                />
            )}
        </div>
    );
}

export default AdminPanel;