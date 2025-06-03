import { useState, useEffect } from 'react';
import { Search, Car, User, Phone, MapPin, IndianRupee, Calendar, CreditCard, DollarSign, X, PrinterIcon, ArrowLeft, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import QRCode from 'qrcode';
import { useLocation, useNavigate } from 'react-router-dom';

export function VehicleInfo() {
    const [vehicles, setVehicles] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        fetchVehicles();
        
        // Check if a vehicle was passed in the location state
        if (location.state?.selectedVehicle) {
            setSelectedVehicle(location.state.selectedVehicle);
            // Clear the location state to avoid reusing the same vehicle on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    useEffect(() => {
        if (selectedVehicle) {
            fetchTransactions();
        }
    }, [selectedVehicle]);

    const fetchVehicles = async () => {
        try {
            const response = await fetch('https://spcarparkingbknd.onrender.com/vehicles');
            const data = await response.json();
            setVehicles(data);
        } catch (error) {
            toast.error('Failed to fetch vehicles');
        }
    };

    const fetchTransactions = async () => {
        try {
            const response = await fetch(`https://spcarparkingbknd.onrender.com/revenue`);
            const data = await response.json();
            // Filter transactions for selected vehicle
            const vehicleTransactions = data.filter(
                t => t.vehicleNumber === selectedVehicle.vehicleNumber
            );
            setTransactions(vehicleTransactions);
        } catch (error) {
            toast.error('Failed to fetch transactions');
        }
    };

    const handleSearch = (e) => {
        const query = e.target.value.toUpperCase();
        setSearchQuery(query);
        setSelectedVehicle(null);
        setTransactions([]);
    };

    const filteredVehicles = vehicles.filter(vehicle => {
        const searchTermUpper = searchQuery.toUpperCase();
        return (
            vehicle.vehicleNumber.includes(searchTermUpper) ||
            vehicle.vehicleDescription.toUpperCase().includes(searchTermUpper) ||
            vehicle.ownerName.toUpperCase().includes(searchTermUpper) ||
            vehicle.contactNumber.toUpperCase().includes(searchTermUpper) ||
            // Check for both lot number and "open" parking
            (vehicle.lotNumber 
                ? vehicle.lotNumber.toUpperCase().includes(searchTermUpper)
                : searchTermUpper === 'OPEN')
        );
    });

    // Function to handle image click
    const handleImageClick = (imageUrl, title, vehicle) => {
        setSelectedImage({ 
            url: imageUrl, 
            title,
            vehicleNumber: vehicle.vehicleNumber,
            vehicleDescription: vehicle.vehicleDescription
        });
    };

    // Function to close image viewer
    const handleCloseViewer = () => {
        setSelectedImage(null);
    };

    const capitalizeFirst = (str) => {
        return str.charAt(0).toUpperCase() + str.slice(1);
    };

    // Place createSection here so both invoice functions can use it
    const createSection = (doc, title, x, y, columnWidth) => {
        doc.setFontSize(16);
        doc.setTextColor(21, 101, 192);
        doc.text(title, x, y);
        doc.setDrawColor(21, 101, 192);
        doc.setLineWidth(0.5);
        doc.line(x, y + 2, x + columnWidth, y + 2);
        doc.setTextColor(44, 62, 80);
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
            
            // Modern Header with Gradient - Reduced height
            doc.setFillColor(21, 101, 192); // RGB for #1565C0
            doc.rect(0, 0, pageWidth, 40, 'F');  // Reduced height from 45 to 40
            
            // Add Logo (placeholder - replace with your logo later)
            const logoUrl = 'SP_Car_Parking_bg.png'; // Placeholder logo
            try {
                const logoResponse = await fetch(logoUrl);
                const logoBlob = await logoResponse.blob();
                const logoBase64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(logoBlob);
                });

                // Add logo to the left with increased top padding
                doc.addImage(logoBase64, 'PNG', 15, 5, 25, 25);
            } catch (logoError) {
                console.error('Error loading logo:', logoError);
            }

            // Title and Text with adjusted positions
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(24);
            doc.text('SP CAR PARKING', pageWidth/2 + 10, 12, { align: 'center' });
            
            // Add motto under the title with increased font size and reduced gap
            doc.setFontSize(12);
            doc.setFont("helvetica", "italic");
            doc.text('"Your Car Is Under Safe Hands"', pageWidth/2 + 10, 20, { align: 'center' });
            
            // Welcome text with increased font size
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text('Welcomes You', pageWidth/2 + 10, 28, { align: 'center' });
            
            // Subtitle inside the header
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.text('SP Nagar, Ponmeni - Madakkulam Main Road, Madurai. (Opp. to Our Lady School)', pageWidth/2 + 10, 36, { align: 'center' });
            
            // Reset color and set modern font
            doc.setTextColor(44, 62, 80);
            doc.setFont("helvetica", "bold");
            
            // Left Column - Vehicle Details
            createSection(doc, 'Vehicle Details', startX1, 50, columnWidth);

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
                startY: 58,
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
            createSection(doc, 'Owner Details', startX1, ownerY, columnWidth);

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
            let afterImageY = doc.autoTable.previous.finalY;
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
                    afterImageY = doc.autoTable.previous.finalY + 5 + 50;
                } catch (imgError) {
                    console.error('Error loading vehicle image:', imgError);
                }
            }

            // Add invoice generation date and time in IST below the image
            const nowInvoiceImg = new Date();
            const istDateInvoiceImg = nowInvoiceImg.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
            const istTimeInvoiceImg = nowInvoiceImg.toLocaleTimeString('en-GB', { 
                timeZone: 'Asia/Kolkata',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(44, 62, 80);
            doc.text(`Generated on: ${istDateInvoiceImg} at ${istTimeInvoiceImg} IST`, startX1, afterImageY + 8);

            // Right Column - Our Facilities with proper spacing
            createSection(doc, 'Our Facilities', startX2, 50, columnWidth);

            const facilities = [
                ['1.', '24/7 Security Surveillance'],
                ['2.', '24/7 Watchman Securtiy'],
                ['3.', 'Private Parking Lot'],
                ['4.', 'Water and Washroom Facility'],

            ];

            doc.autoTable({
                startY: 58,  // Reduced from 10
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
            createSection(doc, 'Terms & Conditions', startX2, termsY, columnWidth);

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
            createSection(doc, 'Contact Details', startX2, contactY, columnWidth);

            const contacts = [
                ['Watchman:', '9842850753'],
                ['Rental:', '9842190000 / 9843050753']
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
                    0: { fontStyle: 'bold', cellWidth: 30 },
                    1: { cellWidth: 65 }
                }
            });

            // QR Code Section with reduced size and spacing
            const qrY = doc.autoTable.previous.finalY + 8;  // Reduced from 10
            doc.setFontSize(16);
            doc.setTextColor(21, 101, 192);
            doc.text('Scan QR to Pay', startX2, qrY);
            doc.setFontSize(10);
            doc.setTextColor(21, 101, 192);
            doc.text('(Ignore if already paid)', startX2, qrY + 6);  // Reduced from 8
            doc.setDrawColor(21, 101, 192);
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
            doc.setDrawColor(21, 101, 192);
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
            
            // Modern Header with Gradient - Reduced height
            doc.setFillColor(21, 101, 192); // RGB for #1565C0
            doc.rect(0, 0, pageWidth, 40, 'F');  // Reduced height from 45 to 40
            
            // Add Logo (placeholder - replace with your logo later)
            const logoUrl = 'SP_Car_Parking_bg.png'; // Placeholder logo
            try {
                const logoResponse = await fetch(logoUrl);
                const logoBlob = await logoResponse.blob();
                const logoBase64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(logoBlob);
                });

                // Add logo to the left with increased top padding
                doc.addImage(logoBase64, 'PNG', 15, 5, 25, 25);
            } catch (logoError) {
                console.error('Error loading logo:', logoError);
            }

            // Title and Text with adjusted positions
            doc.setTextColor(255, 255, 255);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(24);
            doc.text('SP CAR PARKING', pageWidth/2 + 10, 12, { align: 'center' });
            
            // Add motto under the title with increased font size and reduced gap
            doc.setFontSize(12);
            doc.setFont("helvetica", "italic");
            doc.text('"Your Car Is Under Safe Hands"', pageWidth/2 + 10, 20, { align: 'center' });
            
            // Welcome text with increased font size
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text('Welcomes You', pageWidth/2 + 10, 28, { align: 'center' });
            
            // Subtitle inside the header
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.text('SP Nagar, Ponmeni - Madakkulam Main Road, Madurai. (Opp. to Our Lady School)', pageWidth/2 + 10, 36, { align: 'center' });
            
            // Reset color and set modern font
            doc.setTextColor(44, 62, 80);
            doc.setFont("helvetica", "bold");

            // Start content higher on the page
            const startY = 50;  // Reduced from 60

            // Left Column - Vehicle Details
            createSection(doc, 'Vehicle Details', startX1, startY, columnWidth);

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
            createSection(doc, 'Owner Details', startX1, ownerY, columnWidth);

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
            let afterImageY = doc.autoTable.previous.finalY;
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
                    afterImageY = doc.autoTable.previous.finalY + 5 + 50;
                } catch (imgError) {
                    console.error('Error loading vehicle image:', imgError);
                }
            }

            // Add invoice generation date and time in IST below the image
            const nowDailyImg = new Date();
            const istDateDailyImg = nowDailyImg.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
            const istTimeDailyImg = nowDailyImg.toLocaleTimeString('en-GB', { 
                timeZone: 'Asia/Kolkata',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(44, 62, 80);
            doc.text(`Generated on: ${istDateDailyImg} at ${istTimeDailyImg} IST`, startX1, afterImageY + 8);

            // Right Column - Our Facilities with proper spacing
            createSection(doc, 'Our Facilities', startX2, startY, columnWidth);

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
            createSection(doc, 'Terms & Conditions', startX2, termsY, columnWidth);

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
            createSection(doc, 'Contact Details', startX2, contactY, columnWidth);

            const contacts = [
                ['Watchman:', '9842850753'],
                ['Rental:', '9842190000 / 9843050753']
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
                    0: { fontStyle: 'bold', cellWidth: 30 },  // Changed from 40 to 35
                    1: { cellWidth: 65 }
                }
            });

            // QR Code Section with reduced size and spacing
            const qrY = doc.autoTable.previous.finalY + 8;  // Reduced from 10
            doc.setFontSize(16);
            doc.setTextColor(21, 101, 192);
            doc.text('Scan QR to Pay', startX2, qrY);
            doc.setFontSize(10);
            doc.setTextColor(21, 101, 192);
            doc.text('(Ignore if already paid)', startX2, qrY + 6);  // Reduced from 8
            doc.setDrawColor(21, 101, 192);
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
            doc.setDrawColor(21, 101, 192);
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

    return (
        <div className="min-h-screen bg-gray-50 p-2 sm:p-6">
            <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
                {/* Back Button */}
                <button 
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-600 transition-colors font-medium py-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Dashboard</span>
                </button>
                
                {/* Search Section - Improved mobile padding */}
                <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search vehicles..."
                            value={searchQuery}
                            onChange={handleSearch}
                            className="w-full px-4 py-2.5 pl-10 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base"
                        />
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                    </div>

                    {/* Search Results - Improved mobile view */}
                    {searchQuery && filteredVehicles.length > 0 && !selectedVehicle && (
                        <div className="mt-3 space-y-2 max-h-[300px] overflow-y-auto">
                            {filteredVehicles.map(vehicle => (
                                <button
                                    key={vehicle._id}
                                    onClick={() => setSelectedVehicle(vehicle)}
                                    className="w-full text-left p-3 sm:p-4 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-3"
                                >
                                    <Car className="text-blue-500 w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-medium text-sm sm:text-base">{vehicle.vehicleNumber}</p>
                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-full">
                                                {vehicle.lotNumber || 'Open'}
                                            </span>
                                        </div>
                                        <p className="text-xs sm:text-sm text-gray-500 truncate">{vehicle.vehicleDescription}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Vehicle Details Section */}
                {selectedVehicle && (
                    <div className="space-y-4 sm:space-y-6">
                        {/* Basic Info Card - Redesigned with modern UI */}
                        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-600 to-blue-600 p-4 sm:p-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <h2 className="text-lg sm:text-2xl font-bold text-white flex items-center gap-2">
                                        <Car className="w-6 h-6" />
                                        Vehicle Details
                                    </h2>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="px-2.5 py-1 bg-white/20 backdrop-blur-sm text-white text-sm font-bold rounded-lg shadow-sm border border-white/20">
                                            {selectedVehicle.lotNumber || 'Open'}
                                        </span>
                                        <span className={`px-2.5 py-1 text-sm font-semibold rounded-lg shadow-sm border ${
                                            selectedVehicle.status === 'active' 
                                                ? 'bg-emerald-500/80 text-white border-emerald-400/50' 
                                                : 'bg-red-500/80 text-white border-red-400/50'
                                        }`}>
                                            {selectedVehicle.status === 'active' ? 'Active' : 'Expired'}
                                        </span>
                                        <button
                                            onClick={() => selectedVehicle.rentalType === 'monthly' ? handlePrintInvoice(selectedVehicle) : handlePrintDailyInvoice(selectedVehicle)}
                                            className="p-2 bg-white/20 rounded-lg text-white hover:bg-white/30 transition-colors border border-white/20 backdrop-blur-sm"
                                            title="Print Receipt"
                                        >
                                            <PrinterIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Details Grid - Modern cards with better visual hierarchy */}
                            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                                {/* Vehicle Details Section */}
                                <div>
                                    <h3 className="text-gray-700 font-semibold mb-3 flex items-center gap-1.5">
                                        <Car className="w-4 h-4 text-blue-600" />
                                        <span>Vehicle Information</span>
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div className="flex items-center space-x-3 bg-gradient-to-br from-gray-50 to-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm">
                                            <div className="bg-blue-100 p-2 rounded-full">
                                                <Car className="text-blue-600 w-4 h-4 sm:w-5 sm:h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs text-gray-500">Vehicle Number</p>
                                                <p className="font-semibold text-sm sm:text-base text-gray-900">{selectedVehicle.vehicleNumber}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3 bg-gradient-to-br from-gray-50 to-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm">
                                            <div className="bg-blue-100 p-2 rounded-full">
                                                <Car className="text-blue-600 w-4 h-4 sm:w-5 sm:h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs text-gray-500">Description</p>
                                                <p className="font-semibold text-sm sm:text-base text-gray-900">{selectedVehicle.vehicleDescription}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3 bg-gradient-to-br from-gray-50 to-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm">
                                            <div className="bg-blue-100 p-2 rounded-full">
                                                <MapPin className="text-blue-600 w-4 h-4 sm:w-5 sm:h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs text-gray-500">Lot Number</p>
                                                <p className="font-semibold text-sm sm:text-base text-gray-900">{selectedVehicle.lotNumber || 'Open'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Owner Details Section */}
                                <div>
                                    <h3 className="text-gray-700 font-semibold mb-3 flex items-center gap-1.5">
                                        <User className="w-4 h-4 text-indigo-600" />
                                        <span>Owner Information</span>
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div className="flex items-center space-x-3 bg-gradient-to-br from-gray-50 to-indigo-50 p-4 rounded-xl border border-indigo-100 shadow-sm">
                                            <div className="bg-indigo-100 p-2 rounded-full">
                                                <User className="text-indigo-600 w-4 h-4 sm:w-5 sm:h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs text-gray-500">Owner Name</p>
                                                <p className="font-semibold text-sm sm:text-base text-gray-900">{selectedVehicle.ownerName}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3 bg-gradient-to-br from-gray-50 to-indigo-50 p-4 rounded-xl border border-indigo-100 shadow-sm">
                                            <div className="bg-indigo-100 p-2 rounded-full">
                                                <Phone className="text-indigo-600 w-4 h-4 sm:w-5 sm:h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs text-gray-500">Contact</p>
                                                <a 
                                                    href={`tel:${selectedVehicle.contactNumber}`}
                                                    className="font-semibold text-sm sm:text-base text-indigo-600 hover:text-indigo-800 hover:underline"
                                                >
                                                    {selectedVehicle.contactNumber}
                                                </a>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3 bg-gradient-to-br from-gray-50 to-indigo-50 p-4 rounded-xl border border-indigo-100 shadow-sm">
                                            <div className="bg-indigo-100 p-2 rounded-full">
                                                <Calendar className="text-indigo-600 w-4 h-4 sm:w-5 sm:h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs text-gray-500">Start Date</p>
                                                <p className="font-semibold text-sm sm:text-base text-gray-900">
                                                    {new Date(selectedVehicle.startDate).toLocaleDateString('en-GB')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Rental Details Section */}
                                <div>
                                    <h3 className="text-gray-700 font-semibold mb-3 flex items-center gap-1.5">
                                        <IndianRupee className="w-4 h-4 text-emerald-600" />
                                        <span>Rental Information</span>
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div className="flex items-center space-x-3 bg-gradient-to-br from-gray-50 to-emerald-50 p-4 rounded-xl border border-emerald-100 shadow-sm">
                                            <div className="bg-emerald-100 p-2 rounded-full">
                                                <Calendar className="text-emerald-600 w-4 h-4 sm:w-5 sm:h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs text-gray-500">Rental Type</p>
                                                <p className="font-semibold text-sm sm:text-base text-gray-900 capitalize">{selectedVehicle.rentalType}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3 bg-gradient-to-br from-gray-50 to-emerald-50 p-4 rounded-xl border border-emerald-100 shadow-sm">
                                            <div className="bg-emerald-100 p-2 rounded-full">
                                                <IndianRupee className="text-emerald-600 w-4 h-4 sm:w-5 sm:h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs text-gray-500">Rent Price</p>
                                                <p className="font-semibold text-sm sm:text-base text-gray-900">₹{selectedVehicle.rentPrice.toLocaleString('en-IN')}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-3 bg-gradient-to-br from-gray-50 to-emerald-50 p-4 rounded-xl border border-emerald-100 shadow-sm">
                                            <div className="bg-emerald-100 p-2 rounded-full">
                                                <IndianRupee className="text-emerald-600 w-4 h-4 sm:w-5 sm:h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs text-gray-500">
                                                    {selectedVehicle.rentalType === 'monthly' ? 'Advance Amount' : 'Total Rental Price'}
                                                </p>
                                                <p className="font-semibold text-sm sm:text-base text-gray-900">
                                                    ₹{selectedVehicle.rentalType === 'monthly' 
                                                        ? (selectedVehicle.advanceAmount || 0).toLocaleString('en-IN')
                                                        : (selectedVehicle.rentPrice * selectedVehicle.numberOfDays).toLocaleString('en-IN')}
                                                    {selectedVehicle.rentalType === 'daily' && (
                                                        <span className="text-xs text-gray-500 ml-1">
                                                            ({selectedVehicle.numberOfDays} days)
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Images Section - Modern gallery style */}
                        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Documents & Images
                            </h3>
                            
                            {(!selectedVehicle.vehicleImage?.url && !selectedVehicle.document1Image?.url && !selectedVehicle.document2Image?.url) ? (
                                <div className="text-center py-8 text-gray-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p className="text-lg font-medium">No images available</p>
                                    <p className="text-sm mt-1">No vehicle images or documents have been uploaded.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {selectedVehicle.vehicleImage?.url && (
                                        <div 
                                            onClick={() => handleImageClick(selectedVehicle.vehicleImage.url, 'Vehicle Image', selectedVehicle)}
                                            className="cursor-pointer group transform transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                                        >
                                            <p className="text-sm text-gray-500 mb-2 flex items-center gap-1.5">
                                                <Car className="w-3.5 h-3.5 text-blue-500" />
                                                Vehicle Image
                                            </p>
                                            <div className="relative overflow-hidden rounded-lg border border-gray-200 shadow-sm">
                                                <div className="aspect-w-16 aspect-h-10 bg-gray-100">
                                                    <img 
                                                        src={selectedVehicle.vehicleImage.url} 
                                                        alt="Vehicle" 
                                                        className="w-full h-48 object-cover rounded-lg transition-transform duration-500 group-hover:scale-105"
                                                    />
                                                </div>
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all duration-300">
                                                    <span className="px-4 py-2 bg-white/90 backdrop-blur-sm shadow-lg rounded-full text-sm font-medium text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                                                        View Image
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {selectedVehicle.document1Image?.url && (
                                        <div 
                                            onClick={() => handleImageClick(selectedVehicle.document1Image.url, 'Aadhaar Card', selectedVehicle)}
                                            className="cursor-pointer group transform transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                                        >
                                            <p className="text-sm text-gray-500 mb-2 flex items-center gap-1.5">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                                </svg>
                                                Aadhaar Card
                                            </p>
                                            <div className="relative overflow-hidden rounded-lg border border-gray-200 shadow-sm">
                                                <div className="aspect-w-16 aspect-h-10 bg-gray-100">
                                                    <img 
                                                        src={selectedVehicle.document1Image.url} 
                                                        alt="Document 1" 
                                                        className="w-full h-48 object-cover rounded-lg transition-transform duration-500 group-hover:scale-105"
                                                    />
                                                </div>
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all duration-300">
                                                    <span className="px-4 py-2 bg-white/90 backdrop-blur-sm shadow-lg rounded-full text-sm font-medium text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                                                        View Document
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {selectedVehicle.document2Image?.url && (
                                        <div 
                                            onClick={() => handleImageClick(selectedVehicle.document2Image.url, 'RC/License', selectedVehicle)}
                                            className="cursor-pointer group transform transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                                        >
                                            <p className="text-sm text-gray-500 mb-2 flex items-center gap-1.5">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                RC/License
                                            </p>
                                            <div className="relative overflow-hidden rounded-lg border border-gray-200 shadow-sm">
                                                <div className="aspect-w-16 aspect-h-10 bg-gray-100">
                                                    <img 
                                                        src={selectedVehicle.document2Image.url} 
                                                        alt="Document 2" 
                                                        className="w-full h-48 object-cover rounded-lg transition-transform duration-500 group-hover:scale-105"
                                                    />
                                                </div>
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all duration-300">
                                                    <span className="px-4 py-2 bg-white/90 backdrop-blur-sm shadow-lg rounded-full text-sm font-medium text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                                                        View Document
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Transaction History - Modern redesign */}
                        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-600 to-blue-600 p-4 sm:p-6">
                                <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                                    <Receipt className="w-5 h-5" />
                                    Transaction History
                                </h3>
                            </div>
                            
                            {transactions.length === 0 ? (
                                <div className="p-8 text-center">
                                    <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                        <Receipt className="w-8 h-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-gray-500 text-lg font-medium">No transactions found</h3>
                                    <p className="text-gray-400 text-sm mt-2">This vehicle doesn't have any recorded transactions.</p>
                                </div>
                            ) : (
                                <div className="p-4">
                                    {/* Cards instead of table for better mobile */}
                                    <div className="hidden md:block">
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden">
                                                <thead>
                                                    <tr className="bg-gray-50">
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider rounded-tl-lg">
                                                            S.No
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Date
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Type
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Mode
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                            Received By
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider rounded-tr-lg">
                                                            Amount
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-100">
                                                    {transactions
                                                        .filter(transaction => transaction.revenueAmount > 0)
                                                        .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate))
                                                        .map((transaction, index) => (
                                                        <tr 
                                                            key={transaction._id} 
                                                            className="hover:bg-blue-50 transition-colors duration-150"
                                                        >
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                <span className="bg-blue-100 text-blue-800 font-medium px-2.5 py-1 rounded-full text-xs">
                                                                    {index + 1}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium">
                                                                        {new Date(transaction.transactionDate).toLocaleDateString('en-GB')}
                                                                    </span>
                                                                    <span className="text-xs text-gray-500">
                                                                        {new Date(transaction.transactionDate).toLocaleTimeString('en-GB', {
                                                                            hour: '2-digit',
                                                                            minute: '2-digit'
                                                                        })}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                                                {transaction.transactionType}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                                                    transaction.transactionMode === 'UPI' 
                                                                        ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' 
                                                                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                                }`}>
                                                                    {transaction.transactionMode === 'UPI' ? (
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
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                <div className="flex items-center space-x-2">
                                                                    <div className="bg-gray-100 p-1 rounded-full">
                                                                        <User className="w-3 h-3 text-gray-600" />
                                                                    </div>
                                                                    <span>{transaction.receivedBy || 'Admin'}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                                                                <div className="flex items-center gap-1">
                                                                    <IndianRupee className="w-3.5 h-3.5" />
                                                                    {transaction.revenueAmount.toLocaleString('en-IN')}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Mobile-friendly cards view */}
                                    <div className="md:hidden space-y-4">
                                        {transactions
                                            .filter(transaction => transaction.revenueAmount > 0)
                                            .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate))
                                            .map((transaction, index) => (
                                            <div 
                                                key={transaction._id}
                                                className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                                            >
                                                <div className="p-4 border-b border-gray-100">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <div className="font-semibold">{transaction.transactionType}</div>
                                                        </div>
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                                                            transaction.transactionMode === 'UPI' 
                                                                ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' 
                                                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                        }`}>
                                                            {transaction.transactionMode === 'UPI' ? (
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
                                                    </div>
                                                </div>
                                                <div className="p-4 space-y-3">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500 text-sm">Date</span>
                                                        <span className="text-sm font-medium">
                                                            {new Date(transaction.transactionDate).toLocaleDateString('en-GB')}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-500 text-sm">Received By</span>
                                                        <span className="text-sm font-medium flex items-center">
                                                            <User className="w-3 h-3 text-gray-500 mr-1" />
                                                            {transaction.receivedBy || 'Admin'}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between pt-2 border-t border-gray-100">
                                                        <span className="text-gray-500 text-sm">Amount</span>
                                                        <span className="text-green-600 font-semibold flex items-center">
                                                            <IndianRupee className="w-3.5 h-3.5 mr-0.5" />
                                                            {transaction.revenueAmount.toLocaleString('en-IN')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Transaction Summary - NEW */}
                        {transactions.length > 0 && (
                            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                                <div className="bg-gradient-to-r from-green-600 to-green-600 p-4 sm:p-6">
                                    <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                                        <IndianRupee className="w-5 h-5" />
                                        Payment Summary
                                    </h3>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {/* Total Paid */}
                                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-5 border border-emerald-100">
                                            <div className="flex flex-col">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-emerald-800 font-medium text-sm">Total Paid</span>
                                                    <div className="bg-emerald-100 p-2 rounded-full">
                                                        <IndianRupee className="w-4 h-4 text-emerald-700" />
                                                    </div>
                                                </div>
                                                <div className="text-2xl font-bold text-emerald-800">
                                                    ₹{transactions
                                                        .filter(t => t.revenueAmount > 0)
                                                        .reduce((total, t) => total + t.revenueAmount, 0)
                                                        .toLocaleString('en-IN')}
                                                </div>
                                                <div className="text-xs text-emerald-700 mt-1">
                                                    {transactions.filter(t => t.revenueAmount > 0).length} payment(s)
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Last Payment */}
                                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100">
                                            <div className="flex flex-col">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-blue-800 font-medium text-sm">Last Payment</span>
                                                    <div className="bg-blue-100 p-2 rounded-full">
                                                        <Calendar className="w-4 h-4 text-blue-700" />
                                                    </div>
                                                </div>
                                                {transactions.filter(t => t.revenueAmount > 0).length > 0 ? (
                                                    <>
                                                        <div className="text-2xl font-bold text-blue-800">
                                                            ₹{transactions
                                                                .filter(t => t.revenueAmount > 0)
                                                                .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate))[0]
                                                                .revenueAmount.toLocaleString('en-IN')}
                                                        </div>
                                                        <div className="text-xs text-blue-700 mt-1">
                                                            {new Date(transactions
                                                                .filter(t => t.revenueAmount > 0)
                                                                .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate))[0]
                                                                .transactionDate).toLocaleDateString('en-GB')}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-gray-500">No payments</div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Payment Mode */}
                                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-5 border border-purple-100">
                                            <div className="flex flex-col">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-purple-800 font-medium text-sm">Payment Methods</span>
                                                    <div className="bg-purple-100 p-2 rounded-full">
                                                        <CreditCard className="w-4 h-4 text-purple-700" />
                                                    </div>
                                                </div>
                                                <div className="flex space-x-2 items-center mt-2">
                                                    {/* UPI Count */}
                                                    <div className="flex items-center bg-indigo-100 px-3 py-1.5 rounded-lg">
                                                        <CreditCard className="w-3 h-3 text-indigo-700 mr-1.5" />
                                                        <span className="text-xs font-medium text-indigo-800">
                                                            UPI: {transactions.filter(t => t.transactionMode === 'UPI' && t.revenueAmount > 0).length}
                                                        </span>
                                                    </div>
                                                    {/* Cash Count */}
                                                    <div className="flex items-center bg-emerald-100 px-3 py-1.5 rounded-lg">
                                                        <DollarSign className="w-3 h-3 text-emerald-700 mr-1.5" />
                                                        <span className="text-xs font-medium text-emerald-800">
                                                            Cash: {transactions.filter(t => t.transactionMode === 'Cash' && t.revenueAmount > 0).length}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Add enhanced Image Viewer Modal with zoom and better controls */}
            {selectedImage && (
                <div 
                    className="fixed inset-0 z-50 transition-all duration-300 ease-in-out"
                    onClick={handleCloseViewer}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-lg"></div>
                    
                    {/* Content */}
                    <div className="relative h-full w-full flex items-center justify-center p-4">
                        {/* Close button */}
                        <button 
                            onClick={handleCloseViewer}
                            className="absolute top-4 right-4 z-10 text-white hover:text-gray-300 bg-black/30 hover:bg-black/50 transition-colors p-2 rounded-full backdrop-blur-sm"
                            aria-label="Close viewer"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        
                        {/* Image info */}
                        <div className="absolute top-4 left-4 bg-black/30 backdrop-blur-sm text-white p-3 rounded-xl max-w-[80%] md:max-w-sm">
                            <h3 className="text-xl font-semibold">{selectedImage.title}</h3>
                            <p className="text-sm mt-1 text-white/80">{selectedImage.vehicleNumber}</p>
                            <p className="text-sm mt-0.5 text-white/80 truncate">{selectedImage.vehicleDescription}</p>
                        </div>
                        
                        {/* Image container */}
                        <div className="bg-white/5 backdrop-blur-sm p-1 rounded-2xl shadow-2xl border border-white/10 max-h-[90vh] max-w-5xl overflow-hidden">
                            <img 
                                src={selectedImage.url} 
                                alt={selectedImage.title}
                                className="max-h-[85vh] max-w-full object-contain rounded-xl"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default VehicleInfo; 