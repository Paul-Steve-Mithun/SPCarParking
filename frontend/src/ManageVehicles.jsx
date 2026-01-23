import { useEffect, useState } from 'react';
import { RefreshCwIcon, SearchIcon, PrinterIcon, Printer, Bell, X, Send, Loader2 } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import VehicleActions from './VehicleActions';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import QRCode from 'qrcode';
import { useNavigate } from 'react-router-dom';
import { useTheme } from './contexts/ThemeContext';
import { Car, MapPin, User, Phone, Calendar, Clock, IndianRupee, Hash, CalendarDays } from 'lucide-react';

const capitalizeFirst = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};

export function ManageVehicles() {
    const { isDarkMode } = useTheme();
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [activeTab, setActiveTab] = useState('monthly'); // For mobile view
    const [showNotificationModal, setShowNotificationModal] = useState(false);
    const [selectedNotificationVehicle, setSelectedNotificationVehicle] = useState(null);
    const [isSendingNotification, setIsSendingNotification] = useState(false);
    const [showDailyInvoiceModal, setShowDailyInvoiceModal] = useState(false);
    const [selectedDailyVehicle, setSelectedDailyVehicle] = useState(null);
    const [customDays, setCustomDays] = useState('');
    const [stats, setStats] = useState({
        total: 0,
        monthly: 0,
        daily: 0
    });
    const [transactions, setTransactions] = useState([]);
    const [advances, setAdvances] = useState([]);
    const navigate = useNavigate();

    const fetchTransactions = async () => {
        try {
            const response = await fetch(`https://spcarparkingbknd.onrender.com/revenue`);
            const data = await response.json();
            setTransactions(data);
        } catch (error) {
            console.error('Failed to fetch transactions', error);
        }
    };

    const fetchAdvances = async () => {
        try {
            const today = new Date().toISOString();
            const response = await fetch(`https://spcarparkingbknd.onrender.com/advances/allUpToDate?date=${today}`);
            if (!response.ok) throw new Error('Failed to fetch advances');
            const data = await response.json();
            setAdvances(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch advances', error);
            setAdvances([]);
        }
    };

    // Calculate stats whenever vehicles change
    useEffect(() => {
        const calculateStats = () => {
            let monthlyTotal = 0;
            let dailyTotal = 0;

            vehicles.forEach(vehicle => {
                if (vehicle.rentalType === 'monthly') {
                    monthlyTotal += vehicle.rentPrice;
                } else if (vehicle.rentalType === 'daily') {
                    const startDate = new Date(vehicle.endDate);
                    startDate.setDate(startDate.getDate() + 1);
                    startDate.setHours(0, 0, 0, 0);

                    const endDate = new Date();
                    endDate.setHours(0, 0, 0, 0);

                    const diffTime = endDate.getTime() - startDate.getTime();
                    const dueDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1);
                    dailyTotal += (vehicle.rentPrice * dueDays);
                }
            });

            setStats({
                total: monthlyTotal + dailyTotal,
                monthly: monthlyTotal,
                daily: dailyTotal
            });
        };

        if (vehicles.length > 0) {
            calculateStats();
        } else {
            setStats({ total: 0, monthly: 0, daily: 0 });
        }
    }, [vehicles]);

    const StatCard = ({ title, amount, icon: Icon, gradient, iconColor }) => {
        const bgGradient = isDarkMode
            ? gradient.replace('50', '900/20').replace('100', '800/20')
            : gradient;

        const borderColor = isDarkMode ? 'border-gray-700' : 'border-white';

        return (
            <div className={`rounded-2xl p-4 sm:p-6 bg-gradient-to-br border shadow-md hover:shadow-lg transition-all duration-200 ${bgGradient} ${borderColor}`}>
                <div className="flex items-center space-x-4">
                    <div className={`p-3 rounded-xl shadow-sm transition-colors duration-300 ${isDarkMode ? 'bg-gray-700' : 'bg-white'
                        }`}>
                        <Icon className={`w-8 h-8 ${iconColor}`} />
                    </div>
                    <div>
                        <p className={`text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
                            }`}>{title}</p>
                        <p className={`text-xl sm:text-2xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
                            }`}>
                            ₹ {amount.toLocaleString('en-IN')}
                        </p>
                    </div>
                </div>
            </div>
        );
    };

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
        fetchTransactions();
        fetchAdvances();
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
            const margin = 12;
            const leftColWidth = 85;
            const rightColWidth = 85;
            const colGap = 8;

            let currentY = margin;
            const lineHeight = 6;
            const sectionSpacing = 8;

            // ========== PROFESSIONAL HEADER ==========
            // Top border line
            doc.setDrawColor(30, 58, 138);
            doc.setLineWidth(0.5);
            doc.line(margin, currentY, pageWidth - margin, currentY);
            currentY += 3;

            // Logo and Company Info on Left
            const logoUrl = 'SP_Car_Parking_bg.png';
            try {
                const logoResponse = await fetch(logoUrl);
                const logoBlob = await logoResponse.blob();
                const logoBase64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(logoBlob);
                });
                doc.addImage(logoBase64, 'PNG', margin, currentY, 22, 22);
            } catch (logoError) {
                console.error('Error loading logo:', logoError);
            }

            // Company details - Left side
            doc.setFont("helvetica", "bold");
            doc.setFontSize(15);
            doc.setTextColor(30, 58, 138);
            doc.text('SP Car Parking', margin + 26, currentY + 6);

            // Tagline
            doc.setFont("helvetica", "italic");
            doc.setFontSize(8);
            doc.setTextColor(30, 58, 138);
            doc.text('"Your Car Is Under Safe Hands"', margin + 26, currentY + 10.5);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(75, 85, 99);
            doc.text('SP Nagar, Ponmeni - Madakkulam Main Road', margin + 26, currentY + 15);
            doc.text('Madurai (Opposite to Our Lady School)', margin + 26, currentY + 19);

            // Check if vehicle image exists
            const vehicleImgLoaded = !!vehicle.vehicleImage?.url;

            // Invoice title and date - Right side
            const now = new Date();
            const invoiceDate = now.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
            const invoiceTime = now.toLocaleTimeString('en-GB', {
                timeZone: 'Asia/Kolkata',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });

            // Check if vehicle has any transaction history
            const vehicleTransactions = transactions.filter(t => t.vehicleNumber === vehicle.vehicleNumber && t.revenueAmount > 0);
            const hasTransactions = vehicleTransactions.length > 0;
            const invoiceTitle = hasTransactions ? 'RENTAL INVOICE' : 'ADVANCE RECEIPT';

            const rightTextX = vehicleImgLoaded ? (pageWidth - margin - 40) : (pageWidth - margin);

            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(30, 58, 138);
            doc.text(invoiceTitle, rightTextX, currentY + 7, { align: 'right' });

            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(75, 85, 99);
            doc.text(`Generated: ${invoiceDate} ${invoiceTime}`, rightTextX, currentY + 13, { align: 'right' });
            doc.text(`Invoice #: ${vehicle.vehicleNumber}`, rightTextX, currentY + 19, { align: 'right' });

            // Calculate header bottom position
            const headerBottomY = currentY + 28;

            // Draw divider line
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);

            if (vehicleImgLoaded) {
                const imgSize = 35;
                const imgX = pageWidth - margin - imgSize;
                doc.line(margin, headerBottomY, imgX - 2, headerBottomY);
                doc.line(imgX + imgSize + 2, headerBottomY, pageWidth - margin, headerBottomY);
            } else {
                doc.line(margin, headerBottomY, pageWidth - margin, headerBottomY);
            }

            // Add vehicle image if available
            if (vehicleImgLoaded && vehicle.vehicleImage?.url) {
                try {
                    const imgResponse = await fetch(vehicle.vehicleImage.url);
                    const imgBlob = await imgResponse.blob();
                    const imgBase64 = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(imgBlob);
                    });

                    const imgSize = 35;
                    const imgX = pageWidth - margin - imgSize;
                    const imgY = currentY;

                    doc.setDrawColor(226, 232, 240);
                    doc.setLineWidth(0.3);
                    doc.rect(imgX - 1, imgY - 1, imgSize + 2, imgSize + 2);
                    doc.addImage(imgBase64, 'JPEG', imgX, imgY, imgSize, imgSize);
                } catch (imgError) {
                    console.error('Error loading vehicle image:', imgError);
                }
            }

            currentY = headerBottomY + sectionSpacing;

            // Store the starting Y position for both columns
            const contentStartY = currentY;

            // ========== VEHICLE DETAILS - Left Column ==========
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(30, 58, 138);
            doc.text('VEHICLE DETAILS', margin, currentY);
            currentY += lineHeight;

            const vehicleDetails = [
                ['Vehicle Number', vehicle.vehicleNumber],
                ['Description', vehicle.vehicleDescription || 'N/A'],
                ['Lot Number', vehicle.lotNumber || 'Open'],
                ['Rental Type', capitalizeFirst(vehicle.rentalType || 'N/A')],
                ['Status', vehicle.status === 'active' ? 'Paid' : 'Not Paid'],
            ];

            doc.autoTable({
                startY: currentY,
                head: [],
                body: vehicleDetails,
                margin: { left: margin, right: margin + leftColWidth + colGap },
                theme: 'plain',
                styles: {
                    fontSize: 8,
                    cellPadding: { top: 2, bottom: 2, left: 0, right: 4 },
                    font: 'helvetica',
                    lineWidth: 0,
                    textColor: [55, 65, 81],
                },
                columnStyles: {
                    0: {
                        fontStyle: 'bold',
                        textColor: [75, 85, 99],
                        cellWidth: 42
                    },
                    1: {
                        textColor: [30, 41, 59],
                        cellWidth: 'auto',
                        fontStyle: 'normal'
                    }
                },
                didParseCell: function (data) {
                    // Make vehicle number value bold
                    if (data.row.index === 0 && data.column.index === 1) {
                        data.cell.styles.fontStyle = 'bold';
                    }
                    // Status Color Logic
                    if (data.row.index === 4 && data.column.index === 1) {
                        const statusText = data.cell.raw;
                        if (statusText === 'Paid') {
                            data.cell.styles.textColor = [22, 163, 74]; // Green
                            data.cell.styles.fontStyle = 'bold';
                        } else {
                            data.cell.styles.textColor = [220, 38, 38]; // Red
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                }
            });

            currentY = doc.autoTable.previous.finalY + sectionSpacing;

            // ========== OWNER DETAILS - Left Column ==========
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(30, 58, 138);
            doc.text('OWNER DETAILS', margin, currentY);
            currentY += lineHeight;

            const ownerDetails = [
                ['Owner Name', 'MR. ' + (vehicle.ownerName || 'N/A')],
                ['Contact', vehicle.contactNumber || 'N/A'],
                ['Address', (vehicle.ownerAddress || 'N/A').substring(0, 50) + ((vehicle.ownerAddress && vehicle.ownerAddress.length > 50) ? '...' : '')],
            ];

            doc.autoTable({
                startY: currentY,
                head: [],
                body: ownerDetails,
                margin: { left: margin, right: margin + leftColWidth + colGap },
                theme: 'plain',
                styles: {
                    fontSize: 8,
                    cellPadding: { top: 2, bottom: 2, left: 0, right: 4 },
                    font: 'helvetica',
                    lineWidth: 0,
                    textColor: [55, 65, 81],
                },
                columnStyles: {
                    0: {
                        fontStyle: 'bold',
                        textColor: [75, 85, 99],
                        cellWidth: 42
                    },
                    1: {
                        textColor: [30, 41, 59],
                        cellWidth: 'auto',
                        fontStyle: 'normal'
                    }
                }
            });

            currentY = doc.autoTable.previous.finalY + sectionSpacing;

            // ========== RENTAL DETAILS - Right Column ==========
            let rightColY = contentStartY;

            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(30, 58, 138);
            doc.text('RENTAL DETAILS', margin + leftColWidth + colGap, rightColY);
            rightColY += lineHeight;

            // Get last payment date from transactions
            const lastPayment = vehicleTransactions
                .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate))[0];

            const lastPaymentFormatted = lastPayment
                ? new Date(lastPayment.transactionDate).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' }) + ' ' +
                new Date(lastPayment.transactionDate).toLocaleTimeString('en-GB', {
                    timeZone: 'Asia/Kolkata',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                })
                : 'No payment yet';

            const lastPaymentAmount = lastPayment ? `Rs. ${lastPayment.revenueAmount.toLocaleString('en-IN')}` : 'No payment yet';

            // Get advance payment details if no transactions
            let advancePaymentDate = 'N/A';
            if (!hasTransactions) {
                const advanceRecord = advances.find(a => a.vehicleNumber === vehicle.vehicleNumber);
                if (advanceRecord && advanceRecord.startDate) {
                    advancePaymentDate = new Date(advanceRecord.startDate).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' }) + ' ' +
                        new Date(advanceRecord.startDate).toLocaleTimeString('en-GB', {
                            timeZone: 'Asia/Kolkata',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                        });
                } else {
                    // Fallback to vehicle start date if no specific advance record found (though unlikely for valid vehicle)
                    advancePaymentDate = new Date(vehicle.startDate).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' }) + ' 12:00 PM';
                }
            }

            // Calculate Duration for Rental Invoice (Previous Month)
            let durationString = 'N/A';
            if (hasTransactions) {
                // Strictly previous month from Current Date
                const now = new Date();
                // First day of previous month
                const startPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                // Last day of previous month
                const endPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

                durationString = `${startPrevMonth.toLocaleDateString('en-GB')} - ${endPrevMonth.toLocaleDateString('en-GB')}`;
            }

            const rentalDetails = [
                ['Start Date', new Date(vehicle.startDate).toLocaleDateString('en-GB')],
                ['Advance Amount', `Rs. ${vehicle.advanceAmount.toLocaleString('en-IN')}`],
                ['Rent Amount', `Rs. ${vehicle.rentPrice.toLocaleString('en-IN')}`],
            ];

            if (hasTransactions) {
                rentalDetails.push(['Duration', durationString]);
                rentalDetails.push(['Last Payment Date', lastPaymentFormatted]);
            } else {
                rentalDetails.push(['Advance Payment Date', advancePaymentDate]);
            }

            doc.autoTable({
                startY: rightColY,
                head: [],
                body: rentalDetails,
                margin: { left: margin + leftColWidth + colGap, right: margin },
                theme: 'plain',
                styles: {
                    fontSize: 8,
                    cellPadding: { top: 2, bottom: 2, left: 0, right: 4 },
                    font: 'helvetica',
                    lineWidth: 0,
                    textColor: [55, 65, 81],
                },
                columnStyles: {
                    0: {
                        fontStyle: 'bold',
                        textColor: [75, 85, 99],
                        cellWidth: 42
                    },
                    1: {
                        textColor: [30, 41, 59],
                        cellWidth: 'auto',
                        fontStyle: 'normal'
                    }
                }
            });

            rightColY = doc.autoTable.previous.finalY + sectionSpacing;

            // ========== CONTACT DETAILS - Right Column ==========
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(30, 58, 138);
            doc.text('CONTACT DETAILS', margin + leftColWidth + colGap, rightColY);
            rightColY += lineHeight;

            const contacts = [
                ['Watchman:', '9842850753'],
                ['Rental:', '9842190000 / 9843050753']
            ];

            doc.autoTable({
                startY: rightColY,
                head: [],
                body: contacts,
                margin: { left: margin + leftColWidth + colGap, right: margin },
                theme: 'plain',
                styles: {
                    fontSize: 8,
                    cellPadding: { top: 2, bottom: 2, left: 0, right: 4 },
                    font: 'helvetica',
                    lineWidth: 0,
                    textColor: [55, 65, 81],
                },
                columnStyles: {
                    0: {
                        fontStyle: 'bold',
                        textColor: [75, 85, 99],
                        cellWidth: 30
                    },
                    1: {
                        textColor: [30, 41, 59],
                        cellWidth: 'auto'
                    }
                }
            });

            rightColY = doc.autoTable.previous.finalY + sectionSpacing;

            // ========== FACILITIES - Full Width ==========
            const startFacilitiesY = Math.max(currentY, rightColY) + sectionSpacing;

            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.line(margin, startFacilitiesY - 4, pageWidth - margin, startFacilitiesY - 4);

            let facilitiesY = startFacilitiesY;

            // Our Facilities - Full Width
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(30, 58, 138);
            doc.text('OUR FACILITIES', margin, facilitiesY);

            const facilities = [
                ['1.', '24/7 CCTV Surveillance And Watchman Security'],
                ['2.', 'Private Parking Lot'],
                ['3.', 'Water and Washroom Facility'],
            ];

            doc.autoTable({
                startY: facilitiesY + lineHeight,
                head: [],
                body: facilities,
                margin: { left: margin, right: margin },
                theme: 'plain',
                styles: {
                    fontSize: 8,
                    cellPadding: { top: 2, bottom: 2, left: 0, right: 4 },
                    font: 'helvetica',
                    lineWidth: 0,
                    textColor: [55, 65, 81],
                },
                columnStyles: {
                    0: {
                        fontStyle: 'bold',
                        cellWidth: 8
                    },
                    1: {
                        cellWidth: 'auto'
                    }
                }
            });

            facilitiesY = doc.autoTable.previous.finalY + sectionSpacing;

            // ========== TERMS & CONDITIONS with QR CODE ==========
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.line(margin, facilitiesY - 4, pageWidth - margin, facilitiesY - 4);

            let termsY = facilitiesY;

            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(30, 58, 138);
            doc.text('TERMS & CONDITIONS', margin, termsY);
            termsY += lineHeight;

            const terms = [
                ['1.', 'Rent must be paid before 5th of each month.'],
                ['2.', '15-day prior notice is required for vacating. Failure will incur a 15-day penalty from advance before refund.'],
                ['3.', 'Parking spot must be kept clean.'],
                ['4.', 'No unauthorized vehicle transfers.'],
            ];

            // Terms table with full width
            doc.autoTable({
                startY: termsY,
                head: [],
                body: terms,
                margin: { left: margin, right: margin },
                theme: 'plain',
                styles: {
                    fontSize: 8,
                    cellPadding: { top: 2, bottom: 2, left: 0, right: 4 },
                    font: 'helvetica',
                    lineWidth: 0,
                    textColor: [55, 65, 81],
                },
                columnStyles: {
                    0: {
                        fontStyle: 'bold',
                        cellWidth: 8
                    },
                    1: {
                        cellWidth: 'auto'
                    }
                }
            });

            termsY = doc.autoTable.previous.finalY + sectionSpacing;

            // ========== PROFESSIONAL FOOTER ==========
            const footerY = pageHeight - 12;

            // QR Code - Left Side Bottom (ABOVE the line)
            // QR is 30px wide. Position at margin. Center text at margin + 15
            const qrXPos = margin + 15;

            // Generate QR Code first to use in layout
            const qrData = `upi://pay?pa=paulcars2000@cnrb&pn=SP CAR PARKING&am=${totalAmount}&tr=${vehicle._id}&tn=SP_CAR_PARKING_${vehicle.vehicleNumber}`;
            const qrDataUrl = await QRCode.toDataURL(qrData, {
                width: 200,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            });

            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.setTextColor(30, 58, 138);
            doc.text('SCAN TO PAY', qrXPos, footerY - 51, { align: 'center' });

            doc.setFont("helvetica", "normal");
            doc.setFontSize(6);
            doc.setTextColor(107, 114, 128);
            doc.text('(Ignore if paid)', qrXPos, footerY - 47, { align: 'center' });

            const qrSize = 30;
            const qrX = margin;
            doc.addImage(qrDataUrl, 'PNG', qrX, footerY - 43, qrSize, qrSize);

            // Add Signature & Stamp (Only if Paid/Active)
            if (vehicle.status === 'active') {
                try {
                    // 1. Stamp
                    const stampUrl = 'stamp.png';
                    const stampResponse = await fetch(stampUrl);
                    const stampBlob = await stampResponse.blob();
                    const stampBase64 = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(stampBlob);
                    });

                    // Draw Stamp above signature
                    // Signature is at Y-22, Height 15. Top is Y-37? No, Y increases downwards.
                    // FooterY is bottom line. Signature is at footerY - 22 (top edge).
                    // So Stamp should be above footerY - 22. Say footerY - 45.
                    const stampSize = 25;
                    // Align roughly with signature (Right aligned)
                    const stampX = pageWidth - margin - 35;
                    doc.addImage(stampBase64, 'PNG', stampX, footerY - 50, stampSize, stampSize);

                    // 2. Signature
                    const signatureUrl = 'signature.png';
                    const signatureResponse = await fetch(signatureUrl);
                    const signatureBlob = await signatureResponse.blob();
                    const signatureBase64 = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(signatureBlob);
                    });
                    const signatureWidth = 30;
                    const signatureHeight = 15;
                    // Position signature on right align
                    const signatureX = pageWidth - margin - signatureWidth;
                    doc.addImage(signatureBase64, 'PNG', signatureX, footerY - 22, signatureWidth, signatureHeight);

                    doc.setFontSize(6);
                    doc.setTextColor(75, 85, 99);
                    doc.setFont("helvetica", "normal");
                    // Text aligned to right margin
                    doc.text('Authorized Signature', pageWidth - margin, footerY - 6, { align: 'right' });
                    doc.text('For SP Car Parking', pageWidth - margin, footerY - 3, { align: 'right' });
                } catch (error) {
                    console.error('Error loading signature/stamp:', error);
                }
            }

            // Draw the bottom line
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.line(margin, footerY - 1, pageWidth - margin, footerY - 1);

            // Center text - JESUS LEADS YOU
            doc.setFontSize(8);
            doc.setTextColor(30, 58, 138);
            doc.setFont("helvetica", "bold");
            doc.text('JESUS LEADS YOU', pageWidth / 2, footerY + 2, { align: 'center' });

            doc.save(`SP_Parking_Invoice_${vehicle.vehicleNumber}_${invoiceDate.replace(/\//g, '-')}.pdf`);
            toast.success('Invoice generated successfully! 🎉');
        } catch (error) {
            console.error('Error generating invoice:', error);
            toast.error('Failed to generate invoice');
        }
    };

    const handlePrintDailyInvoice = async (vehicle, overrides = null) => {
        try {
            // Calculate Start Date: Vehicle End Date + 1
            const startDate = new Date(vehicle.endDate);
            startDate.setDate(startDate.getDate() + 1);
            startDate.setHours(0, 0, 0, 0);

            let endDate, numberOfDays;

            if (overrides) {
                // Custom Case
                if (overrides.numberOfDays) {
                    numberOfDays = overrides.numberOfDays;
                    endDate = new Date(startDate);
                    endDate.setDate(startDate.getDate() + numberOfDays - 1);
                    endDate.setHours(23, 59, 59, 999);
                } else if (overrides.endDate) {
                    endDate = new Date(overrides.endDate);
                    endDate.setHours(23, 59, 59, 999);
                    const diffTime = endDate.getTime() - startDate.getTime();
                    numberOfDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
                }
            } else {
                // Current (Default) Case: till Today
                endDate = new Date();
                endDate.setHours(23, 59, 59, 999); // End of today
                const diffTime = endDate.getTime() - startDate.getTime();
                numberOfDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
            }

            // Validation
            if (numberOfDays <= 0) {
                // Should ideally not happen due to UI validation, but good to have
                toast.error("Invalid invoice period. Start date is after end date.");
                return;
            }

            // Calculate total amount
            const totalAmount = vehicle.rentPrice * numberOfDays;

            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 12;
            const leftColWidth = 85;
            const rightColWidth = 85;
            const colGap = 8;

            let currentY = margin;
            const lineHeight = 6;
            const sectionSpacing = 8;

            // ========== PROFESSIONAL HEADER ==========
            // Top border line
            doc.setDrawColor(30, 58, 138);
            doc.setLineWidth(0.5);
            doc.line(margin, currentY, pageWidth - margin, currentY);
            currentY += 3;

            // Logo and Company Info on Left
            const logoUrl = "SP_Car_Parking_bg.png";
            try {
                const logoResponse = await fetch(logoUrl);
                const logoBlob = await logoResponse.blob();
                const logoBase64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(logoBlob);
                });
                doc.addImage(logoBase64, "PNG", margin, currentY, 22, 22);
            } catch (logoError) {
                console.error("Error loading logo:", logoError);
            }

            // Company details - Left side
            doc.setFont("helvetica", "bold");
            doc.setFontSize(15);
            doc.setTextColor(30, 58, 138);
            doc.text("SP Car Parking", margin + 26, currentY + 6);

            // Tagline
            doc.setFont("helvetica", "italic");
            doc.setFontSize(8);
            doc.setTextColor(30, 58, 138);
            doc.text('"Your Car Is Under Safe Hands"', margin + 26, currentY + 10.5);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(75, 85, 99);
            doc.text(
                "SP Nagar, Ponmeni - Madakkulam Main Road",
                margin + 26,
                currentY + 15
            );
            doc.text(
                "Madurai (Opposite to Our Lady School)",
                margin + 26,
                currentY + 19
            );

            // Check if vehicle image exists
            const vehicleImgLoaded = !!vehicle.vehicleImage?.url;

            // Invoice title and date - Right side
            const now = new Date();
            const invoiceDate = now.toLocaleDateString("en-GB", {
                timeZone: "Asia/Kolkata",
            });
            const invoiceTime = now.toLocaleTimeString("en-GB", {
                timeZone: "Asia/Kolkata",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
            });

            const rightTextX = vehicleImgLoaded
                ? pageWidth - margin - 40
                : pageWidth - margin;

            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(30, 58, 138);
            doc.text("RENTAL INVOICE", rightTextX, currentY + 7, {
                align: "right",
            });

            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(75, 85, 99);
            doc.text(
                `Generated: ${invoiceDate} ${invoiceTime}`,
                rightTextX,
                currentY + 13,
                { align: "right" }
            );
            doc.text(`Invoice #: ${vehicle.vehicleNumber}`, rightTextX, currentY + 19, {
                align: "right",
            });

            // Calculate header bottom position
            const headerBottomY = currentY + 28;

            // Draw divider line
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);

            if (vehicleImgLoaded) {
                const imgSize = 35;
                const imgX = pageWidth - margin - imgSize;
                doc.line(margin, headerBottomY, imgX - 2, headerBottomY);
                doc.line(
                    imgX + imgSize + 2,
                    headerBottomY,
                    pageWidth - margin,
                    headerBottomY
                );
            } else {
                doc.line(margin, headerBottomY, pageWidth - margin, headerBottomY);
            }

            // Add vehicle image if available
            if (vehicleImgLoaded && vehicle.vehicleImage?.url) {
                try {
                    const imgResponse = await fetch(vehicle.vehicleImage.url);
                    const imgBlob = await imgResponse.blob();
                    const imgBase64 = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(imgBlob);
                    });

                    const imgSize = 35;
                    const imgX = pageWidth - margin - imgSize;
                    const imgY = currentY;

                    doc.setDrawColor(226, 232, 240);
                    doc.setLineWidth(0.3);
                    doc.rect(imgX - 1, imgY - 1, imgSize + 2, imgSize + 2);
                    doc.addImage(imgBase64, "JPEG", imgX, imgY, imgSize, imgSize);
                } catch (imgError) {
                    console.error("Error loading vehicle image:", imgError);
                }
            }

            currentY = headerBottomY + sectionSpacing;

            // Store the starting Y position for both columns
            const contentStartY = currentY;

            // ========== VEHICLE DETAILS - Left Column ==========
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(30, 58, 138);
            doc.text("VEHICLE DETAILS", margin, currentY);
            currentY += lineHeight;

            const vehicleDetails = [
                ["Vehicle Number", vehicle.vehicleNumber],
                ["Description", vehicle.vehicleDescription || "N/A"],
                ["Lot Number", vehicle.lotNumber || "Open"],
                ["Rental Type", capitalizeFirst(vehicle.rentalType || "N/A")],
                ["Status", vehicle.status === "active" ? "Paid" : "Not Paid"],
            ];

            doc.autoTable({
                startY: currentY,
                head: [],
                body: vehicleDetails,
                margin: { left: margin, right: margin + leftColWidth + colGap },
                theme: "plain",
                styles: {
                    fontSize: 8,
                    cellPadding: { top: 2, bottom: 2, left: 0, right: 4 },
                    font: "helvetica",
                    lineWidth: 0,
                    textColor: [55, 65, 81],
                },
                columnStyles: {
                    0: {
                        fontStyle: "bold",
                        textColor: [75, 85, 99],
                        cellWidth: 42,
                    },
                    1: {
                        textColor: [30, 41, 59],
                        cellWidth: "auto",
                        fontStyle: "normal",
                    },
                },
                didParseCell: function (data) {
                    // Make vehicle number value bold
                    if (data.row.index === 0 && data.column.index === 1) {
                        data.cell.styles.fontStyle = 'bold';
                    }
                    // Status Color Logic
                    if (data.row.index === 4 && data.column.index === 1) {
                        const statusText = data.cell.raw;
                        if (statusText === 'Paid') {
                            data.cell.styles.textColor = [22, 163, 74]; // Green
                            data.cell.styles.fontStyle = 'bold';
                        } else {
                            data.cell.styles.textColor = [220, 38, 38]; // Red
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                }
            });

            currentY = doc.autoTable.previous.finalY + sectionSpacing;

            // ========== OWNER DETAILS - Left Column ==========
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(30, 58, 138);
            doc.text("OWNER DETAILS", margin, currentY);
            currentY += lineHeight;

            const ownerDetails = [
                ["Owner Name", "MR. " + (vehicle.ownerName || "N/A")],
                ["Contact", vehicle.contactNumber || "N/A"],
                [
                    "Address",
                    (vehicle.ownerAddress || "N/A").substring(0, 50) +
                    (vehicle.ownerAddress &&
                        vehicle.ownerAddress.length > 50
                        ? "..."
                        : ""),
                ],
            ];

            doc.autoTable({
                startY: currentY,
                head: [],
                body: ownerDetails,
                margin: { left: margin, right: margin + leftColWidth + colGap },
                theme: "plain",
                styles: {
                    fontSize: 8,
                    cellPadding: { top: 2, bottom: 2, left: 0, right: 4 },
                    font: "helvetica",
                    lineWidth: 0,
                    textColor: [55, 65, 81],
                },
                columnStyles: {
                    0: {
                        fontStyle: "bold",
                        textColor: [75, 85, 99],
                        cellWidth: 42,
                    },
                    1: {
                        textColor: [30, 41, 59],
                        cellWidth: "auto",
                        fontStyle: "normal",
                    },
                },
            });

            currentY = doc.autoTable.previous.finalY + sectionSpacing;

            // ========== RENTAL DETAILS - Right Column ==========
            let rightColY = contentStartY;

            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(30, 58, 138);
            doc.text("RENTAL DETAILS", margin + leftColWidth + colGap, rightColY);
            rightColY += lineHeight;

            const rentalDetails = [
                ["Start Date", startDate.toLocaleDateString("en-GB")],
                ["End Date", endDate.toLocaleDateString("en-GB")],
                ["Rent per Day", `Rs. ${vehicle.rentPrice.toLocaleString("en-IN")}`],
                ["Number of Days", `${numberOfDays} days`],
                ["Total Amount", `Rs. ${totalAmount.toLocaleString("en-IN")}`],
            ];

            doc.autoTable({
                startY: rightColY,
                head: [],
                body: rentalDetails,
                margin: { left: margin + leftColWidth + colGap, right: margin },
                theme: "plain",
                styles: {
                    fontSize: 8,
                    cellPadding: { top: 2, bottom: 2, left: 0, right: 4 },
                    font: "helvetica",
                    lineWidth: 0,
                    textColor: [55, 65, 81],
                },
                columnStyles: {
                    0: {
                        fontStyle: "bold",
                        textColor: [75, 85, 99],
                        cellWidth: 42,
                    },
                    1: {
                        textColor: [30, 41, 59],
                        cellWidth: "auto",
                        fontStyle: "normal",
                    },
                },
            });

            rightColY = doc.autoTable.previous.finalY + sectionSpacing;

            // ========== CONTACT DETAILS - Right Column ==========
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(30, 58, 138);
            doc.text("CONTACT DETAILS", margin + leftColWidth + colGap, rightColY);
            rightColY += lineHeight;

            const contacts = [
                ["Watchman:", "9842850753"],
                ["Rental:", "9842190000 / 9843050753"],
            ];

            doc.autoTable({
                startY: rightColY,
                head: [],
                body: contacts,
                margin: { left: margin + leftColWidth + colGap, right: margin },
                theme: "plain",
                styles: {
                    fontSize: 8,
                    cellPadding: { top: 2, bottom: 2, left: 0, right: 4 },
                    font: "helvetica",
                    lineWidth: 0,
                    textColor: [55, 65, 81],
                },
                columnStyles: {
                    0: {
                        fontStyle: "bold",
                        textColor: [75, 85, 99],
                        cellWidth: 30,
                    },
                    1: {
                        textColor: [30, 41, 59],
                        cellWidth: "auto",
                    },
                },
            });

            rightColY = doc.autoTable.previous.finalY + sectionSpacing;

            // ========== FACILITIES - Full Width ==========
            const startFacilitiesY = Math.max(currentY, rightColY) + sectionSpacing;

            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.line(margin, startFacilitiesY - 4, pageWidth - margin, startFacilitiesY - 4);

            let facilitiesY = startFacilitiesY;

            // Our Facilities - Full Width
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(30, 58, 138);
            doc.text("OUR FACILITIES", margin, facilitiesY);

            const facilities = [
                ["1.", "24/7 CCTV Surveillance And Watchman Security"],
                ["2.", "Private Parking Lot"],
                ["3.", "Water and Washroom Facility"],
            ];

            doc.autoTable({
                startY: facilitiesY + lineHeight,
                head: [],
                body: facilities,
                margin: { left: margin, right: margin },
                theme: "plain",
                styles: {
                    fontSize: 8,
                    cellPadding: { top: 2, bottom: 2, left: 0, right: 4 },
                    font: "helvetica",
                    lineWidth: 0,
                    textColor: [55, 65, 81],
                },
                columnStyles: {
                    0: {
                        fontStyle: "bold",
                        cellWidth: 8,
                    },
                    1: {
                        cellWidth: "auto",
                    },
                },
            });

            facilitiesY = doc.autoTable.previous.finalY + sectionSpacing;

            // ========== TERMS & CONDITIONS with QR CODE ==========
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.line(margin, facilitiesY - 4, pageWidth - margin, facilitiesY - 4);

            let termsY = facilitiesY;

            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(30, 58, 138);
            doc.text("TERMS & CONDITIONS", margin, termsY);
            termsY += lineHeight;

            const terms = [
                ["1.", "Rent must be paid promptly for the number of days parked."],
                ["2.", "Parking spot must be kept clean."],
                ["3.", "No unauthorized vehicle transfers."],
                ["4.", "Save Water and Electricity."],
            ];

            // Terms table with full width
            doc.autoTable({
                startY: termsY,
                head: [],
                body: terms,
                margin: { left: margin, right: margin },
                theme: "plain",
                styles: {
                    fontSize: 8,
                    cellPadding: { top: 2, bottom: 2, left: 0, right: 4 },
                    font: "helvetica",
                    lineWidth: 0,
                    textColor: [55, 65, 81],
                },
                columnStyles: {
                    0: {
                        fontStyle: "bold",
                        cellWidth: 8,
                    },
                    1: {
                        cellWidth: "auto",
                    },
                },
            });

            termsY = doc.autoTable.previous.finalY + sectionSpacing;

            // ========== PROFESSIONAL FOOTER ==========
            const footerY = pageHeight - 12;

            // QR Code - Left Side Bottom (ABOVE the line)
            const qrXPos = margin + 15;

            // Generate QR Code
            const qrData = `upi://pay?pa=paulcars2000@cnrb&pn=SP CAR PARKING&am=${totalAmount}&tr=${vehicle._id}&tn=SP_CAR_PARKING_${vehicle.vehicleNumber}_DAILY`;
            const qrDataUrl = await QRCode.toDataURL(qrData, {
                width: 200,
                margin: 1,
                color: {
                    dark: "#000000",
                    light: "#ffffff",
                },
            });

            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.setTextColor(30, 58, 138);
            doc.text("SCAN TO PAY", qrXPos, footerY - 51, { align: "center" });

            doc.setFont("helvetica", "normal");
            doc.setFontSize(6);
            doc.setTextColor(107, 114, 128);
            doc.text("(Ignore if paid)", qrXPos, footerY - 47, { align: "center" });

            const qrSize = 30;
            const qrX = margin;
            doc.addImage(qrDataUrl, "PNG", qrX, footerY - 43, qrSize, qrSize);

            // Add Signature & Stamp (Only if Paid/Active)
            if (vehicle.status === 'active') {
                try {
                    // 1. Stamp
                    const stampUrl = 'stamp.png';
                    const stampResponse = await fetch(stampUrl);
                    const stampBlob = await stampResponse.blob();
                    const stampBase64 = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(stampBlob);
                    });

                    const stampSize = 25;
                    const stampX = pageWidth - margin - 35;
                    doc.addImage(stampBase64, 'PNG', stampX, footerY - 50, stampSize, stampSize);

                    // 2. Signature
                    const signatureUrl = 'signature.png';
                    const signatureResponse = await fetch(signatureUrl);
                    const signatureBlob = await signatureResponse.blob();
                    const signatureBase64 = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.readAsDataURL(signatureBlob);
                    });
                    const signatureWidth = 30;
                    const signatureHeight = 15;

                    const signatureX = pageWidth - margin - signatureWidth;
                    doc.addImage(signatureBase64, 'PNG', signatureX, footerY - 22, signatureWidth, signatureHeight);

                    doc.setFontSize(6);
                    doc.setTextColor(75, 85, 99);
                    doc.setFont("helvetica", "normal");
                    doc.text('Authorized Signature', pageWidth - margin, footerY - 6, { align: 'right' });
                    doc.text('For SP Car Parking', pageWidth - margin, footerY - 3, { align: 'right' });
                } catch (error) {
                    console.error('Error loading signature/stamp:', error);
                }
            }

            // Draw the bottom line
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.line(margin, footerY - 1, pageWidth - margin, footerY - 1);

            // Center text - JESUS LEADS YOU
            doc.setFontSize(8);
            doc.setTextColor(30, 58, 138);
            doc.setFont("helvetica", "bold");
            doc.text("JESUS LEADS YOU", pageWidth / 2, footerY + 2, { align: "center" });

            doc.save(
                `SP_Parking_Invoice_${vehicle.vehicleNumber}_Daily_${invoiceDate.replace(
                    /\//g,
                    "-"
                )}.pdf`
            );
            toast.success("Invoice generated successfully! 🎉");
        } catch (error) {
            console.error("Error generating invoice:", error);
            toast.error("Failed to generate invoice");
        }
    };

    // WhatsApp Reminder Function
    const sendNotificationToOwner = (vehicle) => {
        // Format phone number for WhatsApp (remove spaces, add country code if needed)
        let phone = vehicle.contactNumber.replace(/\D/g, '');
        if (!phone.startsWith('91') && phone.length === 10) {
            phone = '91' + phone; // Add India country code if missing
        }
        // WhatsApp message
        const message = `Dear ${vehicle.ownerName}, your monthly parking rent of Rs.${vehicle.rentPrice} for vehicle ${vehicle.vehicleNumber} is due on 5th of this month. Please make the payment before the due date. - SP Car Parking`;
        // WhatsApp click-to-chat URL
        const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        setShowNotificationModal(false);
        toast.success('WhatsApp opened. Send the message to complete the reminder.');
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
                className={`p-4 hover:shadow-md cursor-pointer relative transform transition-all duration-200 hover:scale-[1.02] ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'hover:bg-gray-50'}`}
                onClick={() => setSelectedVehicle(vehicle)}
            >
                {/* Printer and Bell Buttons - Absolute positioned */}
                <div className="absolute right-4 top-4 flex items-center gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedNotificationVehicle(vehicle);
                            setShowNotificationModal(true);
                        }}
                        className="p-2 text-gray-600 hover:text-red-600 transition-colors duration-200"
                        title="Send Payment Reminder"
                    >
                        <Bell className="w-5 h-5" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (vehicle.rentalType === 'monthly') {
                                handlePrintInvoice(vehicle);
                            } else {
                                setSelectedDailyVehicle(vehicle);
                                setShowDailyInvoiceModal(true);
                            }
                        }}
                        className="p-2 text-gray-600 hover:text-red-600 transition-colors duration-200"
                        title="Print Receipt"
                    >
                        <Printer className="w-5 h-5" />
                    </button>
                </div>

                {/* Card Content */}
                <div className="flex-grow space-y-2 sm:space-y-1">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <p className={`font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>{vehicle.vehicleNumber}</p>
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

    const NotificationModal = ({ vehicle, onClose }) => {
        const [isClosing, setIsClosing] = useState(false);

        if (!vehicle) return null;

        const handleClose = () => {
            setIsClosing(true);
            setTimeout(() => {
                onClose();
            }, 200);
        };

        const previewMessage = `Dear ${vehicle.ownerName}, your monthly parking rent of Rs.${vehicle.rentPrice} for vehicle ${vehicle.vehicleNumber} is due on 5th of this month. Please make the payment before the due date. - SP Car Parking`;

        return (
            <div
                className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${isClosing ? 'bg-black/0 backdrop-blur-none' : isDarkMode ? 'bg-black/80 backdrop-blur-sm' : 'bg-black/50 backdrop-blur-sm'}`}
                onClick={handleClose}
            >
                <div
                    className={`rounded-xl shadow-xl w-full max-w-md transform transition-all duration-200 ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'} ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
                    onClick={e => e.stopPropagation()}
                    style={{
                        animation: isClosing ? 'none' : 'modal-popup 0.2s ease-out'
                    }}
                >
                    <style>
                        {`
                            @keyframes modal-popup {
                                from {
                                    transform: scale(0.95);
                                    opacity: 0;
                                }
                                to {
                                    transform: scale(1);
                                    opacity: 1;
                                }
                            }
                        `}
                    </style>
                    {/* Gradient Header */}
                    <div className={`bg-gradient-to-r from-red-700 to-orange-700 p-4 rounded-t-xl`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="bg-white/20 p-2 rounded-full">
                                    <Bell className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">Payment Reminder</h3>
                                    <p className="text-sm text-white/80">Send whatsapp notification</p>
                                </div>
                            </div>
                            <button
                                onClick={handleClose}
                                className="text-white/80 hover:text-white transition-colors duration-200"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Vehicle Details */}
                    <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <h4 className={`font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{vehicle.vehicleNumber}</h4>
                                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{vehicle.vehicleDescription}</p>
                            </div>
                            <div className="text-right">
                                <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>Monthly Rent</p>
                                <p className="text-lg font-semibold text-red-600">₹{vehicle.rentPrice}</p>
                            </div>
                        </div>
                    </div>

                    {/* Message Preview */}
                    <div className="p-4 space-y-4">
                        <div>
                            <p className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Message Preview</p>
                            <div className={`p-4 rounded-lg text-sm border ${isDarkMode ? 'bg-gray-900 text-gray-300 border-gray-700' : 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                                {previewMessage}
                            </div>
                        </div>

                        <div className={`rounded-lg p-2 sm:p-3 flex flex-col sm:flex-row items-start sm:space-x-3 space-y-2 sm:space-y-0 border ${isDarkMode ? 'bg-red-900/30 border-red-700' : 'bg-red-100 border-red-200'}`}>
                            <div className={`mt-0.5 ${isDarkMode ? 'text-red-400' : 'text-red-500'}`}>
                                <Bell className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                                <p className={`text-sm break-words ${isDarkMode ? 'text-red-200' : 'text-red-800'}`}>
                                    WhatsApp message will be sent to
                                    <br className="block sm:hidden" />
                                    <span className={`font-medium ${isDarkMode ? 'text-red-100' : 'text-red-900'}`}> {vehicle.contactNumber}</span>
                                </p>
                                <p className={`text-xs mt-1 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                                    WhatsApp must be installed on your device
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className={`flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 p-3 sm:p-4 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'} rounded-b-xl`}>
                        <button
                            onClick={handleClose}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 w-full sm:w-auto ${isDarkMode ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'}`}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => sendNotificationToOwner(vehicle)}
                            className={`flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-[1.02] w-full sm:w-auto break-words ${isDarkMode ? 'text-white bg-gradient-to-r from-red-600 to-orange-700 hover:from-red-700 hover:to-orange-800' : 'text-white bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700'}`}
                        >
                            <Send className="w-4 h-4 mr-2" />
                            Send Reminder
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const DailyInvoiceModal = ({ vehicle, onClose }) => {
        const { isDarkMode } = useTheme(); // Use the theme hook directly
        const [isClosing, setIsClosing] = useState(false);
        const [inputDays, setInputDays] = useState('');
        const [endDate, setEndDate] = useState('');
        const [inputMode, setInputMode] = useState('days'); // 'days' or 'date'
        const [isGenerating, setIsGenerating] = useState(false);

        if (!vehicle) return null;

        const handleClose = () => {
            setIsClosing(true);
            setTimeout(() => {
                onClose();
                setInputDays('');
                setEndDate('');
                setInputMode('days');
            }, 200);
        };

        // Calculate current due days and amount
        const startDate = new Date(vehicle.endDate);
        startDate.setDate(startDate.getDate() + 1);
        startDate.setHours(0, 0, 0, 0);

        const currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        const diffTime = currentDate.getTime() - startDate.getTime();
        const currentDueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        const currentDueAmount = vehicle.rentPrice * currentDueDays;

        // Helper to format date YYYY-MM-DD
        const toDateInputString = (date) => {
            return date.toISOString().split('T')[0];
        };

        const handleDaysChange = (e) => {
            const days = e.target.value;
            setInputDays(days);

            if (days && !isNaN(days) && parseInt(days) > 0) {
                const numDays = parseInt(days);
                const newEndDate = new Date(startDate);
                newEndDate.setDate(startDate.getDate() + numDays - 1);
                setEndDate(toDateInputString(newEndDate));
                // Update customDays for calculation
                // customDays logic below will pick up from inputDays
            } else {
                setEndDate('');
            }
        };

        const handleDateChange = (e) => {
            const dateStr = e.target.value;
            setEndDate(dateStr);

            if (dateStr) {
                const selectedEnd = new Date(dateStr);
                selectedEnd.setHours(23, 59, 59, 999);

                const diff = selectedEnd.getTime() - startDate.getTime();
                const days = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;

                if (days > 0) {
                    setInputDays(days.toString());
                } else {
                    setInputDays('');
                }
            } else {
                setInputDays('');
            }
        };

        // Calculate custom days based on inputs (prefer inputDays for immediate feedback)
        let customDays = 0;
        if (inputDays && !isNaN(parseInt(inputDays))) {
            customDays = parseInt(inputDays);
        } else if (endDate) {
            const selectedEndDate = new Date(endDate);
            const timeDiff = selectedEndDate.getTime() - startDate.getTime();
            customDays = Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1;
        }

        const customAmount = customDays > 0 ? vehicle.rentPrice * customDays : 0;

        // Format date for display
        const formatDate = (dateString) => {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        };

        // Get minimum date (tomorrow from vehicle end date)
        const getMinDate = () => {
            const minDate = new Date(startDate);
            return minDate.toISOString().split('T')[0];
        };

        const handleGenerateCurrentInvoice = async () => {
            setIsGenerating(true);
            try {
                await handlePrintDailyInvoice(vehicle);
                handleClose();
            } catch (error) {
                console.error('Error generating current invoice:', error);
            } finally {
                setIsGenerating(false);
            }
        };

        const handleGenerateCustomInvoice = async () => {
            if (customDays <= 0) {
                toast.error('Please enter a valid number of days or select an end date');
                return;
            }

            setIsGenerating(true);
            try {
                // Pass overrides object
                await handlePrintDailyInvoice(vehicle, { numberOfDays: customDays });
                handleClose();
            } catch (error) {
                console.error('Error generating custom invoice:', error);
            } finally {
                setIsGenerating(false);
            }
        };

        const handleModeSwitch = (mode) => {
            setInputMode(mode);
            setInputDays('');
            setEndDate('');
        };

        return (
            <div
                className={`fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 transition-all duration-300 ${isClosing
                    ? 'bg-black/0'
                    : isDarkMode
                        ? 'bg-black/80 backdrop-blur-sm'
                        : 'bg-black/50 backdrop-blur-sm'
                    }`}
                onClick={handleClose}
            >
                <div
                    className={`w-full max-w-md md:max-w-5xl mx-auto rounded-lg shadow-xl max-h-[95vh] overflow-hidden transform transition-all duration-300 ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
                        } ${isDarkMode ? 'bg-gray-800' : 'bg-white'
                        }`}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-red-500 to-orange-600 p-4 md:p-6 relative overflow-hidden">
                        <div className="absolute inset-0 opacity-10">
                            <div className="absolute top-0 left-0 w-16 h-16 bg-white rounded-full -translate-x-8 -translate-y-8"></div>
                            <div className="absolute bottom-0 right-0 w-12 h-12 bg-white rounded-full translate-x-6 translate-y-6"></div>
                        </div>

                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center space-x-3">
                                <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg border border-white/30">
                                    <PrinterIcon className="w-5 h-5 text-white" />
                                </div>
                                <h2 className="text-lg md:text-xl font-semibold text-white">Generate Invoice</h2>
                            </div>
                            <button
                                onClick={handleClose}
                                className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition-all duration-200"
                                disabled={isGenerating}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Content - Responsive Layout */}
                    <div className="overflow-y-auto max-h-[calc(95vh-120px)]">
                        {/* Mobile Layout */}
                        <div className="md:hidden">
                            {/* Vehicle Info - Mobile */}
                            <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                <h3 className={`font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Vehicle Details</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Vehicle:</span>
                                        <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{vehicle.vehicleNumber}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Description:</span>
                                        <span className={`font-medium text-right ml-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{vehicle.vehicleDescription}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Owner:</span>
                                        <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{vehicle.ownerName}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Daily Rate:</span>
                                        <span className="font-semibold text-orange-600">₹{vehicle.rentPrice}/day</span>
                                    </div>
                                </div>
                            </div>

                            {/* Current Outstanding - Mobile */}
                            <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Current Outstanding</h3>
                                    <span className={`text-xs px-2 py-1 rounded ${isDarkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'}`}>
                                        {currentDueDays} days
                                    </span>
                                </div>
                                <div className="text-center mb-4">
                                    <div className={`text-3xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>₹{currentDueAmount}</div>
                                    <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {currentDueDays} × ₹{vehicle.rentPrice}
                                    </div>
                                </div>
                                <button
                                    onClick={handleGenerateCurrentInvoice}
                                    disabled={isGenerating}
                                    className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
                                >
                                    {isGenerating ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <PrinterIcon className="w-4 h-4 mr-2" />
                                    )}
                                    Generate Current Invoice
                                </button>
                            </div>

                            {/* Custom Invoice - Mobile */}
                            <div className="p-4">
                                <h3 className={`font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Custom Invoice</h3>

                                {/* Mode Toggle */}
                                <div className={`flex rounded-lg p-1 mb-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                    <button
                                        onClick={() => handleModeSwitch('days')}
                                        className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${inputMode === 'days'
                                            ? isDarkMode
                                                ? 'bg-gray-600 text-white shadow-sm'
                                                : 'bg-white text-gray-900 shadow-sm'
                                            : isDarkMode
                                                ? 'text-gray-300 hover:text-white'
                                                : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                    >
                                        Days
                                    </button>
                                    <button
                                        onClick={() => handleModeSwitch('date')}
                                        className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${inputMode === 'date'
                                            ? isDarkMode
                                                ? 'bg-gray-600 text-white shadow-sm'
                                                : 'bg-white text-gray-900 shadow-sm'
                                            : isDarkMode
                                                ? 'text-gray-300 hover:text-white'
                                                : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                    >
                                        End Date
                                    </button>
                                </div>

                                {/* Input Fields */}
                                {inputMode === 'days' ? (
                                    <div className="mb-4">
                                        <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            Number of Days
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="999"
                                            value={inputDays}
                                            onChange={handleDaysChange}
                                            placeholder="Enter days"
                                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${isDarkMode
                                                ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                                                : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                                                }`}
                                        />
                                    </div>
                                ) : (
                                    <div className="mb-4">
                                        <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            Invoice End Date
                                        </label>
                                        <input
                                            type="date"
                                            min={getMinDate()}
                                            value={endDate}
                                            onChange={handleDateChange}
                                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${isDarkMode
                                                ? 'border-gray-600 bg-gray-700 text-white [color-scheme:dark]'
                                                : 'border-gray-300 bg-white text-gray-900'
                                                }`}
                                        />
                                        {endDate && (
                                            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                Selected: {formatDate(endDate)}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Calculation Display */}
                                {customDays > 0 && (
                                    <div className={`rounded-lg p-3 mb-4 text-center ${isDarkMode ? 'bg-gray-700' : 'bg-orange-50'}`}>
                                        <div className={`text-2xl font-bold ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>₹{customAmount}</div>
                                        <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                            {customDays} × ₹{vehicle.rentPrice}
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={handleGenerateCustomInvoice}
                                    disabled={isGenerating || customDays <= 0}
                                    className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
                                >
                                    {isGenerating ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <PrinterIcon className="w-4 h-4 mr-2" />
                                    )}
                                    Generate Custom Invoice
                                </button>
                            </div>
                        </div>

                        {/* Desktop Layout - 3 Columns */}
                        <div className="hidden md:grid md:grid-cols-3 md:gap-6 md:p-6">
                            {/* Column 1: Vehicle Details */}
                            <div className={`border rounded-lg p-4 h-fit ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                <h3 className={`font-semibold mb-4 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Vehicle Details</h3>
                                <div className="space-y-3">
                                    <div className="text-center">
                                        <div className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>VEHICLE</div>
                                        <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{vehicle.vehicleNumber}</div>
                                    </div>
                                    <div className={`border-t pt-3 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                        <div className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>DESCRIPTION</div>
                                        <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{vehicle.vehicleDescription}</div>
                                    </div>
                                    <div className={`border-t pt-3 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                        <div className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>OWNER</div>
                                        <div className={`text-sm ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{vehicle.ownerName}</div>
                                    </div>
                                    <div className={`border-t pt-3 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                        <div className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>DAILY RATE</div>
                                        <div className="text-lg font-bold text-orange-600">₹{vehicle.rentPrice}/day</div>
                                    </div>
                                </div>
                            </div>

                            {/* Column 2: Current Outstanding */}
                            <div className={`border rounded-lg p-4 h-fit ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                <div className="text-center mb-4">
                                    <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Current Outstanding</h3>
                                    <span className={`inline-block text-xs px-2 py-1 rounded mt-2 ${isDarkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800'}`}>
                                        {currentDueDays} days
                                    </span>
                                </div>
                                <div className="text-center mb-6">
                                    <div className={`text-4xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>₹{currentDueAmount}</div>
                                    <div className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {currentDueDays} × ₹{vehicle.rentPrice}
                                    </div>
                                </div>
                                <button
                                    onClick={handleGenerateCurrentInvoice}
                                    disabled={isGenerating}
                                    className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
                                >
                                    {isGenerating ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <PrinterIcon className="w-4 h-4 mr-2" />
                                    )}
                                    Generate Invoice
                                </button>
                            </div>

                            {/* Column 3: Custom Invoice */}
                            <div className={`border rounded-lg p-4 h-fit ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                                <h3 className={`font-semibold mb-4 text-center ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Custom Invoice</h3>

                                {/* Mode Toggle */}
                                <div className={`flex rounded-lg p-1 mb-4 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                    <button
                                        onClick={() => handleModeSwitch('days')}
                                        className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${inputMode === 'days'
                                            ? isDarkMode
                                                ? 'bg-gray-600 text-white shadow-sm'
                                                : 'bg-white text-gray-900 shadow-sm'
                                            : isDarkMode
                                                ? 'text-gray-300 hover:text-white'
                                                : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                    >
                                        Days
                                    </button>
                                    <button
                                        onClick={() => handleModeSwitch('date')}
                                        className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${inputMode === 'date'
                                            ? isDarkMode
                                                ? 'bg-gray-600 text-white shadow-sm'
                                                : 'bg-white text-gray-900 shadow-sm'
                                            : isDarkMode
                                                ? 'text-gray-300 hover:text-white'
                                                : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                    >
                                        End Date
                                    </button>
                                </div>

                                {/* Input Fields */}
                                {inputMode === 'days' ? (
                                    <div className="mb-4">
                                        <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            Number of Days
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="999"
                                            value={inputDays}
                                            onChange={handleDaysChange}
                                            placeholder="Enter days"
                                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${isDarkMode
                                                ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                                                : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                                                }`}
                                        />
                                    </div>
                                ) : (
                                    <div className="mb-4">
                                        <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            Invoice End Date
                                        </label>
                                        <input
                                            type="date"
                                            min={getMinDate()}
                                            value={endDate}
                                            onChange={handleDateChange}
                                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${isDarkMode
                                                ? 'border-gray-600 bg-gray-700 text-white [color-scheme:dark]'
                                                : 'border-gray-300 bg-white text-gray-900'
                                                }`}
                                        />
                                        {endDate && (
                                            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                                Selected: {formatDate(endDate)}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Calculation Display */}
                                {customDays > 0 && (
                                    <div className={`rounded-lg p-3 mb-4 text-center ${isDarkMode ? 'bg-gray-700' : 'bg-orange-50'}`}>
                                        <div className={`text-2xl font-bold ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>₹{customAmount}</div>
                                        <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                            {customDays} × ₹{vehicle.rentPrice}
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={handleGenerateCustomInvoice}
                                    disabled={isGenerating || customDays <= 0}
                                    className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
                                >
                                    {isGenerating ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <PrinterIcon className="w-4 h-4 mr-2" />
                                    )}
                                    Generate Custom Invoice
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className={`flex justify-end p-4 border-t ${isDarkMode ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-gray-50'}`}>
                        <button
                            onClick={handleClose}
                            disabled={isGenerating}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${isDarkMode
                                ? 'text-gray-300 hover:bg-gray-700'
                                : 'text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            Cancel
                        </button>
                    </div>
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
                ownerName: 35,
                contactNumber: 35,
                rentalType: 30,
                daysOverdue: 25,
                dueAmount: 45
            };

            const totalTableWidth = Object.values(columnWidths).reduce((sum, width) => sum + width, 0);
            const leftMargin = (pageWidth - totalTableWidth) / 2;

            // Table columns (in the required order)
            const tableColumn = [
                { header: 'S.No', dataKey: 'serialNumber' },
                { header: 'Vehicle Number', dataKey: 'vehicleNumber' },
                { header: 'Description', dataKey: 'description' },
                { header: 'Parking Type', dataKey: 'parkingType' },
                { header: 'Owner Name', dataKey: 'ownerName' },
                { header: 'Contact No', dataKey: 'contactNumber' },
                { header: 'Rental Type', dataKey: 'rentalType' },
                { header: 'Days Overdue', dataKey: 'daysOverdue' },
                { header: 'Due Amount', dataKey: 'dueAmount' }
            ];

            // Add the formatAmount function
            const formatAmount = (amount) => {
                if (amount === '-') return '-';
                const amountStr = amount.toFixed(2);
                const spaceNeeded = Math.max(0, 10 - amountStr.length);
                const spaces = ' '.repeat(spaceNeeded);
                return `INR${spaces}${amountStr}`;
            };

            // Update table data preparation
            const tableRows = sortByLotNumber(vehicles).map((vehicle, index) => {
                let dueAmount = vehicle.rentPrice;
                // Calculate days overdue for both rental types
                const startDate = new Date(vehicle.endDate);
                startDate.setDate(startDate.getDate() + 1);
                startDate.setHours(0, 0, 0, 0);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const diffTime = today.getTime() - startDate.getTime();
                const daysOverdue = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1); // +1 to include today if overdue
                if (vehicle.rentalType === 'daily') {
                    dueAmount = vehicle.rentPrice * daysOverdue;
                }
                return {
                    serialNumber: index + 1,
                    vehicleNumber: vehicle.vehicleNumber,
                    description: vehicle.vehicleDescription || '',
                    parkingType: vehicle.lotNumber || 'Open',
                    ownerName: vehicle.ownerName || '',
                    contactNumber: vehicle.contactNumber || '',
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
                    ownerName: { cellWidth: columnWidths.ownerName, halign: 'center' },
                    contactNumber: { cellWidth: columnWidths.contactNumber, halign: 'center' },
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
                didParseCell: function (data) {
                    // For amount column, use monospace font and bold style
                    if (data.column.dataKey === 'dueAmount') {
                        data.cell.styles.font = 'courier';
                        data.cell.styles.fontStyle = 'bold';
                    }
                },
                didDrawCell: function (data) {
                    // Make contact number a clickable tel: link
                    if (data.column.dataKey === 'contactNumber' && data.cell.raw) {
                        const phone = String(data.cell.raw).replace(/[^0-9+]/g, '');
                        if (phone.length >= 8) { // basic validation
                            doc.link(
                                data.cell.x,
                                data.cell.y,
                                data.cell.width,
                                data.cell.height,
                                { url: `tel:${phone}` }
                            );
                        }
                    }
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
                didDrawPage: function (data) {
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
        <div className={`max-w-6xl mx-auto shadow-xl rounded-xl overflow-hidden ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
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

            {/* Stats Cards */}
            <div className="p-4 pb-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                    <StatCard
                        title="Total Outstanding"
                        amount={stats.total}
                        icon={IndianRupee}
                        gradient="from-red-50 to-red-100"
                        iconColor="text-red-600"
                    />
                    <StatCard
                        title="Monthly Outstanding"
                        amount={stats.monthly}
                        icon={Calendar}
                        gradient="from-rose-50 to-rose-100"
                        iconColor="text-rose-600"
                    />
                    <StatCard
                        title="Daily Outstanding"
                        amount={stats.daily}
                        icon={Clock}
                        gradient="from-orange-50 to-orange-100"
                        iconColor="text-orange-600"
                    />
                </div>
            </div>

            <div className="p-4">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search by vehicle number, description, owner name, or lot number..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full p-3 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm sm:text-base ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-400' : 'border-gray-300 text-gray-900 placeholder-gray-500'}`}
                    />
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                </div>
            </div>

            {/* Mobile Tabs */}
            <div className="sm:hidden border-b">
                <div className="flex">
                    <button
                        className={`flex-1 py-3 text-sm font-medium border-b-2 ${activeTab === 'monthly' ? (isDarkMode ? 'border-red-400 text-red-300' : 'border-red-500 text-red-600') : (isDarkMode ? 'border-transparent text-gray-400' : 'border-transparent text-gray-500')}`}
                        onClick={() => setActiveTab('monthly')}
                    >
                        Monthly ({filteredMonthlyVehicles.length})
                    </button>
                    <button
                        className={`flex-1 py-3 text-sm font-medium border-b-2 ${activeTab === 'daily' ? (isDarkMode ? 'border-red-400 text-red-300' : 'border-red-500 text-red-600') : (isDarkMode ? 'border-transparent text-gray-400' : 'border-transparent text-gray-500')}`}
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
                                    <div className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                                        {filteredMonthlyVehicles.map(renderVehicleCard)}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-white">
                                {filteredDailyVehicles.length === 0 ? (
                                    <div className="p-6 text-center text-gray-500">No expired vehicles</div>
                                ) : (
                                    <div className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                                        {filteredDailyVehicles.map(renderVehicleCard)}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Desktop View */}
                    <div className="hidden sm:grid sm:grid-cols-2 gap-4 p-4">
                        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg`}>
                            <h2 className={`text-xl font-semibold p-4 border-b ${isDarkMode ? 'text-gray-100 border-gray-700' : 'text-gray-900 border-gray-200'}`}>
                                Monthly ({filteredMonthlyVehicles.length})
                            </h2>
                            {filteredMonthlyVehicles.length === 0 ? (
                                <div className="p-6 text-center text-gray-500">No expired vehicles</div>
                            ) : (
                                <div className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                                    {filteredMonthlyVehicles.map(renderVehicleCard)}
                                </div>
                            )}
                        </div>
                        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow rounded-lg`}>
                            <h2 className={`text-xl font-semibold p-4 border-b ${isDarkMode ? 'text-gray-100 border-gray-700' : 'text-gray-900 border-gray-200'}`}>
                                Daily ({filteredDailyVehicles.length})
                            </h2>
                            {filteredDailyVehicles.length === 0 ? (
                                <div className="p-6 text-center text-gray-500">No expired vehicles</div>
                            ) : (
                                <div className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                                    {filteredDailyVehicles.map(renderVehicleCard)}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {showNotificationModal && (
                <NotificationModal
                    vehicle={selectedNotificationVehicle}
                    onClose={() => {
                        setShowNotificationModal(false);
                        setSelectedNotificationVehicle(null);
                    }}
                />
            )}

            {showDailyInvoiceModal && (
                <DailyInvoiceModal
                    vehicle={selectedDailyVehicle}
                    onClose={() => {
                        setShowDailyInvoiceModal(false);
                        setSelectedDailyVehicle(null);
                        setCustomDays('');
                    }}
                />
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
