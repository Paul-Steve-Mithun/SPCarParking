import { useState, useEffect } from 'react';
import { Search, Car, User, Phone, MapPin, IndianRupee, Calendar, CreditCard, DollarSign, X, PrinterIcon, ArrowLeft, Receipt, FileText, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import QRCode from 'qrcode';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from './contexts/ThemeContext';

export function VehicleInfo() {
    const { isDarkMode } = useTheme();
    const [vehicles, setVehicles] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [currentTxnIndex, setCurrentTxnIndex] = useState(0);
    const location = useLocation();
    const navigate = useNavigate();

    // For swipe gesture
    const [touchStartX, setTouchStartX] = useState(null);
    const [touchEndX, setTouchEndX] = useState(null);

    // Add state for archived vehicles and all revenue
    const [archivedVehicles, setArchivedVehicles] = useState([]);
    const [allRevenue, setAllRevenue] = useState([]);
    const [advances, setAdvances] = useState([]);

    useEffect(() => {
        fetchVehicles();
        fetchAllRevenue();
        fetchAdvances();
        // If a vehicleNumber is passed, try to find it in active vehicles, else build archived
        if (location.state?.vehicleNumber) {
            // Wait for vehicles and archivedVehicles to be loaded
            // We'll use another effect below to handle this after data is loaded
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    // After vehicles and archivedVehicles are loaded, set selectedVehicle by vehicleNumber if needed
    useEffect(() => {
        if (location.state?.vehicleNumber) {
            const vehicle = vehicles.find(v => v.vehicleNumber === location.state.vehicleNumber);
            if (vehicle) {
                setSelectedVehicle(vehicle);
            } else {
                const archived = archivedVehicles.find(v => v.vehicleNumber === location.state.vehicleNumber);
                if (archived) {
                    setSelectedVehicle(archived);
                } else {
                    toast.error('Vehicle not found');
                }
            }
        }
    }, [vehicles, archivedVehicles, location.state]);

    useEffect(() => {
        if (selectedVehicle) {
            fetchTransactions();
            setCurrentTxnIndex(0); // Reset to latest transaction when vehicle changes
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

    // Fetch all revenue data for archived vehicles
    const fetchAllRevenue = async () => {
        try {
            const response = await fetch('https://spcarparkingbknd.onrender.com/revenue');
            const data = await response.json();
            setAllRevenue(data);
        } catch (error) {
            toast.error('Failed to fetch revenue data');
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
            setAdvances([]);
            toast.error('Failed to fetch advances');
        }
    };

    // Build archived vehicles list when vehicles or allRevenue changes
    useEffect(() => {
        if (!vehicles.length || !allRevenue.length) return;
        const vehicleNumbersSet = new Set(vehicles.map(v => v.vehicleNumber));
        // Group revenue by vehicleNumber
        const revenueByVehicle = {};
        allRevenue.forEach(txn => {
            if (!vehicleNumbersSet.has(txn.vehicleNumber)) {
                if (!revenueByVehicle[txn.vehicleNumber]) {
                    revenueByVehicle[txn.vehicleNumber] = [];
                }
                revenueByVehicle[txn.vehicleNumber].push(txn);
            }
        });
        // For each archived vehicle, use the latest transaction as the base info
        const archived = Object.values(revenueByVehicle).map(txns => {
            // Sort by transactionDate desc
            const sorted = txns.sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));
            const latest = sorted[0];
            // Find latest advance and refund info for this vehicle (monthly rental only)
            let advanceInfo = null, refundInfo = null;
            if (Array.isArray(advances) && latest.rentalType === 'monthly') {
                // Get the original advance record (has advanceAmount and no refundDate)
                advanceInfo = advances
                    .filter(a => a.vehicleNumber === latest.vehicleNumber &&
                        a.advanceAmount !== undefined &&
                        a.advanceAmount >= 0 &&
                        !a.refundDate)
                    .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))[0];
                // Get the refund record (has refundDate, regardless of refund amount)
                refundInfo = advances
                    .filter(a => a.vehicleNumber === latest.vehicleNumber && a.refundDate)
                    .sort((a, b) => new Date(b.refundDate) - new Date(a.refundDate))[0];
            }
            return {
                ...latest,
                isArchived: true,
                lotNumber: latest.lotNumber || 'Open',
                vehicleDescription: latest.vehicleDescription || '-',
                rentalType: latest.rentalType || '-',
                rentPrice: latest.rentPrice || 0,
                numberOfDays: latest.numberOfDays || 0,
                status: 'archived',
                ownerName: latest.ownerName || '-',
                contactNumber: latest.contactNumber || '-',
                // Use advance/refund info if available, else fallback
                advanceAmount: advanceInfo ? advanceInfo.advanceAmount : 0,
                startDate: advanceInfo ? advanceInfo.startDate : latest.transactionDate,
                refundDate: refundInfo ? refundInfo.refundDate : undefined,
                vehicleImage: {},
                document1Image: {},
                document2Image: {},
            };
        });
        setArchivedVehicles(archived);
    }, [vehicles, allRevenue, advances]);

    const handleSearch = (e) => {
        const query = e.target.value.toUpperCase();
        setSearchQuery(query);
        setSelectedVehicle(null);
        setTransactions([]);
    };

    // Merge vehicles and archivedVehicles for search
    const filteredVehicles = [
        ...vehicles,
        ...archivedVehicles
    ].filter(vehicle => {
        const searchTermUpper = searchQuery.toUpperCase();
        return (
            vehicle.vehicleNumber.includes(searchTermUpper) ||
            (vehicle.vehicleDescription || '').toUpperCase().includes(searchTermUpper) ||
            (vehicle.ownerName || '').toUpperCase().includes(searchTermUpper) ||
            (vehicle.contactNumber || '').toUpperCase().includes(searchTermUpper) ||
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
        doc.setFont("helvetica", "bold");  // Set font to bold for all section titles
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

    const handlePrintDailyInvoice = async (vehicle) => {
        try {
            const totalAmount = vehicle.rentPrice * vehicle.numberOfDays;

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
                ["Start Date", new Date(vehicle.startDate).toLocaleDateString("en-GB")],
                ["End Date", new Date(vehicle.endDate).toLocaleDateString("en-GB")],
                ["Rent per Day", `Rs. ${vehicle.rentPrice.toLocaleString("en-IN")}`],
                ["Number of Days", `${vehicle.numberOfDays} days`],
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


    const handleDownloadFullReport = async (vehicle) => {
        try {
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

            // Check if vehicle image exists (but load it later, after divider line)
            const vehicleImgLoaded = !!vehicle.vehicleImage?.url;

            // Report title and date - Right side (with proper spacing from vehicle image)
            const now = new Date();
            const reportDate = now.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
            const reportTime = now.toLocaleTimeString('en-GB', {
                timeZone: 'Asia/Kolkata',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });

            // Position text to the left of vehicle image with proper spacing
            const rightTextX = vehicleImgLoaded ? (pageWidth - margin - 40) : (pageWidth - margin);

            doc.setFont("helvetica", "bold");
            doc.setFontSize(11);
            doc.setTextColor(30, 58, 138);
            doc.text('VEHICLE HISTORY', rightTextX, currentY + 7, { align: 'right' });

            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(75, 85, 99);
            doc.text(`Generated: ${reportDate} ${reportTime}`, rightTextX, currentY + 13, { align: 'right' });
            doc.text(`History #: ${vehicle.vehicleNumber}`, rightTextX, currentY + 19, { align: 'right' });

            // Calculate where to draw the divider line (below the header content)
            const headerBottomY = currentY + 28;

            // Draw divider line before adding image so image appears on top
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);

            // If vehicle image exists, draw line up to where image starts, then continue after image
            if (vehicleImgLoaded) {
                const imgSize = 35;
                const imgX = pageWidth - margin - imgSize;
                // Draw line from left margin to before the image
                doc.line(margin, headerBottomY, imgX - 2, headerBottomY);
                // Draw line after the image (continue from right edge of image)
                doc.line(imgX + imgSize + 2, headerBottomY, pageWidth - margin, headerBottomY);
            } else {
                // If no image, draw full line
                doc.line(margin, headerBottomY, pageWidth - margin, headerBottomY);
            }

            // Now add vehicle image AFTER the line so it appears on top
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

                    // Add subtle border around image
                    doc.setDrawColor(226, 232, 240);
                    doc.setLineWidth(0.3);
                    doc.rect(imgX - 1, imgY - 1, imgSize + 2, imgSize + 2);

                    // Draw image on top
                    doc.addImage(imgBase64, 'JPEG', imgX, imgY, imgSize, imgSize);
                } catch (imgError) {
                    console.error('Error loading vehicle image:', imgError);
                }
            }

            currentY = headerBottomY + sectionSpacing;

            // Store the starting Y position for both columns to align them
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
                ['Status', vehicle.status === 'active' ? 'Active' : vehicle.status === 'archived' ? 'Archived' : 'Expired'],
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
                    // Make vehicle number bold
                    if (data.row.index === 0 && data.column.index === 1) {
                        data.cell.styles.fontStyle = 'bold';
                    }
                    // Status Color Logic
                    if (data.row.index === 4 && data.column.index === 1) {
                        const statusText = data.cell.raw;
                        if (statusText === 'Active' || statusText === 'Paid') {
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
                ['Owner Name', 'MR. ' + vehicle.ownerName || 'N/A'],
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
            // Use the same starting Y as left column for proper alignment
            let rightColY = contentStartY;

            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.setTextColor(30, 58, 138);
            doc.text('RENTAL DETAILS', margin + leftColWidth + colGap, rightColY);
            rightColY += lineHeight;

            // Get last payment date from transactions
            const lastPayment = transactions
                .filter(t => t.revenueAmount > 0)
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


            const rentalDetails = [
                ['Start Date', new Date(vehicle.startDate).toLocaleDateString('en-GB')],
                ['Rent Amount', `Rs. ${vehicle.rentPrice.toLocaleString('en-IN')}`],
            ];

            if (vehicle.rentalType === 'monthly') {
                rentalDetails.push(['Advance Amount', `Rs. ${(vehicle.advanceAmount || 0).toLocaleString('en-IN')}`]);

                if (vehicle.isArchived && vehicle.advanceAmount > 0) {
                    const latestRevenue = allRevenue
                        .filter(r => r.vehicleNumber === vehicle.vehicleNumber && r.revenueAmount > 0)
                        .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate))[0];
                    const advanceAmt = vehicle.advanceAmount || 0;
                    const paidAmt = latestRevenue ? latestRevenue.revenueAmount : 0;
                    const refundAmt = advanceAmt - paidAmt;
                    if (refundAmt > 0) {
                        rentalDetails.push(['Refund Amount', `Rs. ${refundAmt.toLocaleString('en-IN')}`]);
                    }
                }

                if (vehicle.refundDate) {
                    rentalDetails.push(['Refund Date', new Date(vehicle.refundDate).toLocaleDateString('en-GB')]);
                }
            } else if (vehicle.rentalType === 'daily') {
                rentalDetails.push(['Number of Days', `${vehicle.numberOfDays} days`]);
                rentalDetails.push(['Total Amount', `Rs. ${(vehicle.rentPrice * vehicle.numberOfDays).toLocaleString('en-IN')}`]);
                if (vehicle.endDate) {
                    rentalDetails.push(['End Date', new Date(vehicle.endDate).toLocaleDateString('en-GB')]);
                }
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

            // ========== PAYMENT SUMMARY - Right Column ==========
            const filteredTransactions = transactions
                .filter(t => t.revenueAmount > 0)
                .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));

            if (filteredTransactions.length > 0) {
                const totalPaid = filteredTransactions.reduce((sum, t) => sum + t.revenueAmount, 0);
                const lastPayment = filteredTransactions[0];


                doc.setFont("helvetica", "bold");
                doc.setFontSize(10);
                doc.setTextColor(30, 58, 138);
                doc.text('PAYMENT SUMMARY', margin + leftColWidth + colGap, rightColY);
                rightColY += lineHeight;

                const summaryDetails = [
                    ['Total Paid', `Rs. ${totalPaid.toLocaleString('en-IN')}`],
                    ['Last Payment', `Rs. ${lastPayment.revenueAmount.toLocaleString('en-IN')}`],
                    ['Last Payment Date', lastPaymentFormatted],
                ];

                doc.autoTable({
                    startY: rightColY,
                    head: [],
                    body: summaryDetails,
                    margin: { left: margin + leftColWidth + colGap, right: margin },
                    theme: 'plain',
                    styles: {
                        fontSize: 8,
                        cellPadding: { top: 2.5, bottom: 2.5, left: 0, right: 4 },
                        font: 'helvetica',
                        lineWidth: 0,
                        textColor: [55, 65, 81],
                    },
                    columnStyles: {
                        0: {
                            fontStyle: 'bold',
                            textColor: [75, 85, 99],
                            cellWidth: 45
                        },
                        1: {
                            textColor: [22, 163, 74],
                            fontStyle: 'bold',
                            cellWidth: 'auto'
                        }
                    }
                });

                rightColY = doc.autoTable.previous.finalY + sectionSpacing;
            }

            // ========== TRANSACTION HISTORY - Full Width ==========
            // Use max Y position from both columns
            const startTxnY = Math.max(currentY, rightColY) + sectionSpacing;

            // Draw divider before transaction history
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.line(margin, startTxnY - 4, pageWidth - margin, startTxnY - 4);

            let txnY = startTxnY;

            if (filteredTransactions.length > 0) {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(10);
                doc.setTextColor(30, 58, 138);
                doc.text('RECENT TRANSACTIONS', margin, txnY);
                txnY += lineHeight + 1;

                // Show only last 8 transactions to fit on page
                const displayTransactions = filteredTransactions.slice(0, 8);
                const transactionTableData = displayTransactions.map((txn, index) => [
                    (index + 1).toString(),
                    new Date(txn.transactionDate).toLocaleDateString('en-GB'),
                    txn.transactionMode || 'Cash',
                    `Rs. ${txn.revenueAmount.toLocaleString('en-IN')}`
                ]);

                // Calculate full width for transaction table
                const tableMargin = margin;
                const availableWidth = pageWidth - (tableMargin * 2);

                doc.autoTable({
                    startY: txnY,
                    head: [['#', 'Date', 'Mode', 'Amount']],
                    body: transactionTableData,
                    margin: { left: tableMargin, right: tableMargin },
                    theme: 'striped',
                    tableWidth: availableWidth,
                    styles: {
                        fontSize: 8,
                        cellPadding: 4,
                        font: 'helvetica',
                        lineColor: [241, 245, 249],
                        lineWidth: 0.3,
                        textColor: [55, 65, 81],
                    },
                    headStyles: {
                        fillColor: [30, 58, 138],
                        textColor: [255, 255, 255],
                        fontStyle: 'bold',
                        halign: 'center',
                        fontSize: 8.5,
                        cellPadding: 4,
                    },
                    columnStyles: {
                        0: {
                            cellWidth: availableWidth * 0.08,
                            halign: 'center',
                            fontStyle: 'bold'
                        },
                        1: {
                            cellWidth: availableWidth * 0.35,
                            halign: 'center'
                        },
                        2: {
                            cellWidth: availableWidth * 0.27,
                            halign: 'center'
                        },
                        3: {
                            cellWidth: availableWidth * 0.30,
                            halign: 'right',
                            fontStyle: 'bold',
                            textColor: [22, 163, 74]
                        }
                    },
                    alternateRowStyles: {
                        fillColor: [249, 250, 251]
                    }
                });

                if (filteredTransactions.length > 8) {
                    const remainingCount = filteredTransactions.length - 8;
                    txnY = doc.autoTable.previous.finalY + 2;
                    doc.setFont("helvetica", "italic");
                    doc.setFontSize(7);
                    doc.setTextColor(107, 114, 128);
                    doc.text(`+ ${remainingCount} more transaction(s)`, margin, txnY);
                }
            } else {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(10);
                doc.setTextColor(30, 58, 138);
                doc.text('TRANSACTION HISTORY', margin, txnY);
                txnY += lineHeight + 3;

                doc.setFont("helvetica", "normal");
                doc.setFontSize(8);
                doc.setTextColor(107, 114, 128);
                doc.text('No transactions found for this vehicle.', margin, txnY);
            }

            // ========== PROFESSIONAL FOOTER ==========
            const footerY = pageHeight - 12;
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

            doc.setFontSize(7);
            doc.setTextColor(107, 114, 128);
            doc.setFont("helvetica", "normal");
            doc.text('SP Car Parking - Vehicle History', pageWidth / 2, footerY, { align: 'center' });

            doc.setFont("helvetica", "bold");
            doc.setTextColor(30, 58, 138);
            doc.setFontSize(7);
            doc.text('JESUS LEADS YOU', margin, footerY);

            doc.save(`SP_Vehicle_Report_${vehicle.vehicleNumber}_${reportDate.replace(/\//g, '-')}.pdf`);
            toast.success('Full report downloaded successfully! 🎉');
        } catch (error) {
            console.error('Error generating full report:', error);
            toast.error('Failed to generate report');
        }
    };

    // Helper to determine if a vehicle is premium (for monthly rental vehicles)
    const isPremiumCustomer = (vehicle, transactions) => {
        if (!vehicle || vehicle.rentalType !== 'monthly' || !transactions.length) return false;
        // Count payments made on or before 5th of the month
        let onTime = 0, total = 0;
        transactions.forEach(t => {
            if (t.revenueAmount > 0) {
                const date = new Date(t.transactionDate);
                if (date.getDate() <= 5) onTime++;
                total++;
            }
        });
        return total > 0 && onTime / total > 0.5;
    };

    const filteredTxns = transactions
        .filter(t => t.revenueAmount > 0)
        .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));

    // Handle swipe
    const handleTouchStart = (e) => {
        setTouchStartX(e.touches[0].clientX);
    };
    const handleTouchMove = (e) => {
        setTouchEndX(e.touches[0].clientX);
    };
    const handleTouchEnd = () => {
        if (touchStartX !== null && touchEndX !== null) {
            const diff = touchStartX - touchEndX;
            if (diff > 40 && currentTxnIndex < filteredTxns.length - 1) {
                setCurrentTxnIndex(i => Math.min(i + 1, filteredTxns.length - 1));
            } else if (diff < -40 && currentTxnIndex > 0) {
                setCurrentTxnIndex(i => Math.max(i - 1, 0));
            }
        }
        setTouchStartX(null);
        setTouchEndX(null);
    };

    return (
        <div className={`min-h-screen p-2 sm:p-6 transition-colors duration-300 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
            }`}>
            <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
                {/* Back Button */}
                <button
                    onClick={() => navigate('/')}
                    className={`flex items-center gap-2 transition-colors font-medium py-2 ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                        }`}
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Dashboard</span>
                </button>

                {/* Search Section - Improved mobile padding */}
                <div className={`rounded-2xl shadow-lg p-4 sm:p-6 transition-colors duration-300 ${isDarkMode ? 'bg-gray-800' : 'bg-white'
                    }`}>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search vehicles..."
                            value={searchQuery}
                            onChange={handleSearch}
                            className={`w-full px-4 py-2.5 pl-10 rounded-xl border focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base transition-colors duration-300 ${isDarkMode
                                ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400'
                                : 'border-gray-200 text-gray-900 placeholder-gray-500'
                                }`}
                        />
                        <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'
                            }`} />
                    </div>

                    {/* Search Results - Improved mobile view */}
                    {searchQuery && filteredVehicles.length > 0 && !selectedVehicle && (
                        <div className="mt-3 space-y-2 max-h-[300px] overflow-y-auto">
                            {filteredVehicles.map(vehicle => (
                                <button
                                    key={vehicle._id || vehicle.vehicleNumber + '_archived'}
                                    onClick={() => setSelectedVehicle(vehicle)}
                                    className={`w-full text-left p-3 sm:p-4 rounded-lg transition-colors flex items-center space-x-3 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                                        }`}
                                >
                                    <Car className="text-blue-500 w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className={`font-medium text-sm sm:text-base transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
                                                }`}>{vehicle.vehicleNumber}</p>
                                            <span className={`px-2 py-0.5 text-xs font-bold rounded-full transition-colors duration-300 ${isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                {vehicle.lotNumber || 'Open'}
                                            </span>
                                            {vehicle.isArchived && (
                                                <span className="px-2 py-0.5 bg-yellow-200 text-yellow-800 text-xs font-bold rounded-full ml-2">
                                                    Archived
                                                </span>
                                            )}
                                        </div>
                                        <p className={`text-xs sm:text-sm truncate transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                            }`}>{vehicle.vehicleDescription}</p>
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
                        <div className={`rounded-2xl shadow-lg overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-gray-800' : 'bg-white'
                            }`}>
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
                                        <span className={`px-2.5 py-1 text-sm font-semibold rounded-lg shadow-sm border ${selectedVehicle.status === 'active'
                                            ? 'bg-emerald-500/80 text-white border-emerald-400/50'
                                            : selectedVehicle.status === 'archived'
                                                ? 'bg-yellow-500/80 text-white border-yellow-400/50'
                                                : 'bg-red-500/80 text-white border-red-400/50'
                                            }`}>
                                            {selectedVehicle.status === 'active' ? 'Active' : selectedVehicle.status === 'archived' ? 'Archived' : 'Expired'}
                                        </span>
                                        {/* Premium Badge for Monthly Rental Vehicles (not archived) */}
                                        {selectedVehicle.rentalType === 'monthly' && !selectedVehicle.isArchived && isPremiumCustomer(selectedVehicle, transactions) && (
                                            <span className="px-2.5 py-1 text-sm font-semibold rounded-lg shadow-sm border bg-yellow-400 text-white border-yellow-300 flex items-center gap-1">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 17.75l-6.172 3.245 1.179-6.873-5-4.873 6.9-1.002L12 2.25l3.093 6.997 6.9 1.002-5 4.873 1.179 6.873z" /></svg>
                                                Premium
                                            </span>
                                        )}
                                        <button
                                            onClick={() => selectedVehicle.rentalType === 'monthly' ? handlePrintInvoice(selectedVehicle) : handlePrintDailyInvoice(selectedVehicle)}
                                            className="p-2 bg-white/20 rounded-lg text-white hover:bg-white/30 transition-colors border border-white/20 backdrop-blur-sm"
                                            title="Print Receipt"
                                        >
                                            <PrinterIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDownloadFullReport(selectedVehicle)}
                                            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/90 hover:bg-emerald-600 rounded-lg text-white transition-colors border border-emerald-400/50 backdrop-blur-sm shadow-lg"
                                            title="Download Full Report"
                                        >
                                            <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                                            <span className="hidden sm:inline text-sm font-semibold">Full Report</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Details Grid - Modern cards with better visual hierarchy */}
                            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                                {/* Vehicle Details Section */}
                                <div>
                                    <h3 className={`font-semibold mb-3 flex items-center gap-1.5 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'
                                        }`}>
                                        <Car className="w-4 h-4 text-blue-600" />
                                        <span>Vehicle Information</span>
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div className={`flex items-center space-x-3 p-4 rounded-xl border shadow-sm transition-colors duration-300 ${isDarkMode
                                            ? 'bg-gradient-to-br from-gray-700 to-blue-900/20 border-blue-800'
                                            : 'bg-gradient-to-br from-gray-50 to-blue-50 border-blue-100'
                                            }`}>
                                            <div className="bg-blue-100 p-2 rounded-full">
                                                <Car className="text-blue-600 w-4 h-4 sm:w-5 sm:h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                    }`}>Vehicle Number</p>
                                                <p className={`font-semibold text-sm sm:text-base transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
                                                    }`}>{selectedVehicle.vehicleNumber}</p>
                                            </div>
                                        </div>
                                        <div className={`flex items-center space-x-3 p-4 rounded-xl border shadow-sm transition-colors duration-300 ${isDarkMode
                                            ? 'bg-gradient-to-br from-gray-700 to-blue-900/20 border-blue-800'
                                            : 'bg-gradient-to-br from-gray-50 to-blue-50 border-blue-100'
                                            }`}>
                                            <div className="bg-blue-100 p-2 rounded-full">
                                                <Car className="text-blue-600 w-4 h-4 sm:w-5 sm:h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                    }`}>Description</p>
                                                <p className={`font-semibold text-sm sm:text-base transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
                                                    }`}>{selectedVehicle.vehicleDescription}</p>
                                            </div>
                                        </div>
                                        <div className={`flex items-center space-x-3 p-4 rounded-xl border shadow-sm transition-colors duration-300 ${isDarkMode
                                            ? 'bg-gradient-to-br from-gray-700 to-blue-900/20 border-blue-800'
                                            : 'bg-gradient-to-br from-gray-50 to-blue-50 border-blue-100'
                                            }`}>
                                            <div className="bg-blue-100 p-2 rounded-full">
                                                <MapPin className="text-blue-600 w-4 h-4 sm:w-5 sm:h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                    }`}>Lot Number</p>
                                                <p className={`font-semibold text-sm sm:text-base transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
                                                    }`}>{selectedVehicle.lotNumber || 'Open'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Owner Details Section */}
                                <div>
                                    <h3 className={`font-semibold mb-3 flex items-center gap-1.5 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'
                                        }`}>
                                        <User className="w-4 h-4 text-indigo-600" />
                                        <span>Owner Information</span>
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div className={`flex items-center space-x-3 p-4 rounded-xl border shadow-sm transition-colors duration-300 ${isDarkMode
                                            ? 'bg-gradient-to-br from-gray-700 to-indigo-900/20 border-indigo-800'
                                            : 'bg-gradient-to-br from-gray-50 to-indigo-50 border-indigo-100'
                                            }`}>
                                            <div className="bg-indigo-100 p-2 rounded-full">
                                                <User className="text-indigo-600 w-4 h-4 sm:w-5 sm:h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                    }`}>Owner Name</p>
                                                <p className={`font-semibold text-sm sm:text-base transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
                                                    }`}>{selectedVehicle.ownerName || '-'}</p>
                                            </div>
                                        </div>
                                        <div className={`flex items-center space-x-3 p-4 rounded-xl border shadow-sm transition-colors duration-300 ${isDarkMode
                                            ? 'bg-gradient-to-br from-gray-700 to-indigo-900/20 border-indigo-800'
                                            : 'bg-gradient-to-br from-gray-50 to-indigo-50 border-indigo-100'
                                            }`}>
                                            <div className="bg-indigo-100 p-2 rounded-full">
                                                <Phone className="text-indigo-600 w-4 h-4 sm:w-5 sm:h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                    }`}>Contact</p>
                                                <a
                                                    href={`tel:${selectedVehicle.contactNumber}`}
                                                    className={`font-semibold text-sm sm:text-base hover:underline transition-colors duration-300 ${isDarkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-800'
                                                        }`}
                                                >
                                                    {selectedVehicle.contactNumber || '-'}
                                                </a>
                                            </div>
                                        </div>
                                        <div className={`flex items-center space-x-3 p-4 rounded-xl border shadow-sm transition-colors duration-300 ${isDarkMode
                                            ? 'bg-gradient-to-br from-gray-700 to-indigo-900/20 border-indigo-800'
                                            : 'bg-gradient-to-br from-gray-50 to-indigo-50 border-indigo-100'
                                            }`}>
                                            <div className="bg-indigo-100 p-2 rounded-full">
                                                <Calendar className="text-indigo-600 w-4 h-4 sm:w-5 sm:h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                    }`}>Start Date</p>
                                                <p className={`font-semibold text-sm sm:text-base transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
                                                    }`}>
                                                    {new Date(selectedVehicle.startDate).toLocaleDateString('en-GB')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Rental Details Section */}
                                <div>
                                    <h3 className={`font-semibold mb-3 flex items-center gap-1.5 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'
                                        }`}>
                                        <IndianRupee className="w-4 h-4 text-emerald-600" />
                                        <span>Rental Information</span>
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div className={`flex items-center space-x-3 p-4 rounded-xl border shadow-sm transition-colors duration-300 ${isDarkMode
                                            ? 'bg-gradient-to-br from-gray-700 to-emerald-900/20 border-emerald-800'
                                            : 'bg-gradient-to-br from-gray-50 to-emerald-50 border-emerald-100'
                                            }`}>
                                            <div className="bg-emerald-100 p-2 rounded-full">
                                                <Calendar className="text-emerald-600 w-4 h-4 sm:w-5 sm:h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                    }`}>Rental Type</p>
                                                <p className={`font-semibold text-sm sm:text-base capitalize transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
                                                    }`}>{selectedVehicle.rentalType || '-'}</p>
                                            </div>
                                        </div>
                                        <div className={`flex items-center space-x-3 p-4 rounded-xl border shadow-sm transition-colors duration-300 ${isDarkMode
                                            ? 'bg-gradient-to-br from-gray-700 to-emerald-900/20 border-emerald-800'
                                            : 'bg-gradient-to-br from-gray-50 to-emerald-50 border-emerald-100'
                                            }`}>
                                            <div className="bg-emerald-100 p-2 rounded-full">
                                                <IndianRupee className="text-emerald-600 w-4 h-4 sm:w-5 sm:h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                    }`}>Rent Price</p>
                                                <p className={`font-semibold text-sm sm:text-base transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
                                                    }`}>₹{selectedVehicle.rentPrice.toLocaleString('en-IN')}</p>
                                            </div>
                                        </div>
                                        <div className={`flex items-center space-x-3 p-4 rounded-xl border shadow-sm transition-colors duration-300 ${isDarkMode
                                            ? 'bg-gradient-to-br from-gray-700 to-emerald-900/20 border-emerald-800'
                                            : 'bg-gradient-to-br from-gray-50 to-emerald-50 border-emerald-100'
                                            }`}>
                                            <div className="bg-emerald-100 p-2 rounded-full">
                                                <IndianRupee className="text-emerald-600 w-4 h-4 sm:w-5 sm:h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                    }`}>
                                                    {selectedVehicle.rentalType === 'monthly' ? 'Advance Amount' : 'Total Rental Price'}
                                                </p>
                                                <p className={`font-semibold text-sm sm:text-base transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
                                                    }`}>
                                                    ₹{selectedVehicle.rentalType === 'monthly'
                                                        ? (selectedVehicle.advanceAmount || 0).toLocaleString('en-IN')
                                                        : (selectedVehicle.rentPrice * selectedVehicle.numberOfDays).toLocaleString('en-IN')}
                                                    {selectedVehicle.rentalType === 'daily' && (
                                                        <span className={`text-xs ml-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                            }`}>
                                                            ({selectedVehicle.numberOfDays} days)
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                        {selectedVehicle.isArchived && selectedVehicle.rentalType === 'monthly' && (
                                            <>
                                                {/* Only show Refund Amount card when advance > 0 */}
                                                {selectedVehicle.advanceAmount > 0 && (
                                                    <div className={`flex items-center space-x-3 p-4 rounded-xl border shadow-sm transition-colors duration-300 ${isDarkMode
                                                        ? 'bg-gradient-to-br from-gray-700 to-emerald-900/20 border-emerald-800'
                                                        : 'bg-gradient-to-br from-gray-50 to-emerald-50 border-emerald-100'
                                                        }`}>
                                                        <div className="bg-emerald-100 p-2 rounded-full">
                                                            <IndianRupee className="text-emerald-600 w-4 h-4 sm:w-5 sm:h-5" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                                }`}>Refund Amount</p>
                                                            <p className={`font-semibold text-sm sm:text-base transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
                                                                }`}>
                                                                {(() => {
                                                                    // Find latest revenue transaction for this vehicle
                                                                    const latestRevenue = allRevenue
                                                                        .filter(r => r.vehicleNumber === selectedVehicle.vehicleNumber && r.revenueAmount > 0)
                                                                        .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate))[0];
                                                                    const advanceAmt = selectedVehicle.advanceAmount || 0;
                                                                    const paidAmt = latestRevenue ? latestRevenue.revenueAmount : 0;
                                                                    const refundAmt = advanceAmt - paidAmt;
                                                                    return `₹${refundAmt.toLocaleString('en-IN')}`;
                                                                })()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Always show Refund Date if it exists */}
                                                {selectedVehicle.refundDate && (
                                                    <div className={`flex items-center space-x-3 p-4 rounded-xl border shadow-sm transition-colors duration-300 ${isDarkMode
                                                        ? 'bg-gradient-to-br from-gray-700 to-emerald-900/20 border-emerald-800'
                                                        : 'bg-gradient-to-br from-gray-50 to-emerald-50 border-emerald-100'
                                                        }`}>
                                                        <div className="bg-emerald-100 p-2 rounded-full">
                                                            <Calendar className="text-emerald-600 w-4 h-4 sm:w-5 sm:h-5" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                                }`}>Refund Date</p>
                                                            <p className={`font-semibold text-sm sm:text-base transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
                                                                }`}>
                                                                {new Date(selectedVehicle.refundDate).toLocaleDateString('en-GB')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Images Section - Modern gallery style */}
                        <div className={`rounded-2xl shadow-lg p-4 sm:p-6 transition-colors duration-300 ${isDarkMode ? 'bg-gray-800' : 'bg-white'
                            }`}>
                            <h3 className={`text-lg font-semibold mb-4 flex items-center gap-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'
                                }`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Documents & Images
                            </h3>

                            {(!selectedVehicle.vehicleImage?.url && !selectedVehicle.document1Image?.url && !selectedVehicle.document2Image?.url) ? (
                                <div className={`text-center py-8 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'
                                    }`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-16 w-16 mx-auto mb-4 transition-colors duration-300 ${isDarkMode ? 'text-gray-600' : 'text-gray-300'
                                        }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p className={`text-lg font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
                                        }`}>No images available</p>
                                    <p className={`text-sm mt-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                        }`}>No vehicle images or documents have been uploaded.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {selectedVehicle.vehicleImage?.url && (
                                        <div
                                            onClick={() => handleImageClick(selectedVehicle.vehicleImage.url, 'Vehicle Image', selectedVehicle)}
                                            className="cursor-pointer group transform transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                                        >
                                            <p className={`text-sm mb-2 flex items-center gap-1.5 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                }`}>
                                                <Car className="w-3.5 h-3.5 text-blue-500" />
                                                Vehicle Image
                                            </p>
                                            <div className={`relative overflow-hidden rounded-lg border shadow-sm transition-colors duration-300 ${isDarkMode ? 'border-gray-600' : 'border-gray-200'
                                                }`}>
                                                <div className={`aspect-w-16 aspect-h-10 transition-colors duration-300 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                                                    }`}>
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
                                            <p className={`text-sm mb-2 flex items-center gap-1.5 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                }`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                                </svg>
                                                Aadhaar Card
                                            </p>
                                            <div className={`relative overflow-hidden rounded-lg border shadow-sm transition-colors duration-300 ${isDarkMode ? 'border-gray-600' : 'border-gray-200'
                                                }`}>
                                                <div className={`aspect-w-16 aspect-h-10 transition-colors duration-300 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                                                    }`}>
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
                                            <p className={`text-sm mb-2 flex items-center gap-1.5 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                }`}>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                RC/License
                                            </p>
                                            <div className={`relative overflow-hidden rounded-lg border shadow-sm transition-colors duration-300 ${isDarkMode ? 'border-gray-600' : 'border-gray-200'
                                                }`}>
                                                <div className={`aspect-w-16 aspect-h-10 transition-colors duration-300 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                                                    }`}>
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
                        <div className={`rounded-2xl shadow-lg overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-gray-800' : 'bg-white'
                            }`}>
                            <div className="bg-gradient-to-r from-blue-600 to-blue-600 p-4 sm:p-6">
                                <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                                    <Receipt className="w-5 h-5" />
                                    Transaction History
                                </h3>
                            </div>

                            {transactions.length === 0 ? (
                                <div className="p-8 text-center">
                                    <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors duration-300 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                                        }`}>
                                        <Receipt className={`w-8 h-8 transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'
                                            }`} />
                                    </div>
                                    <h3 className={`text-lg font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-500'
                                        }`}>No transactions found</h3>
                                    <p className={`text-sm mt-2 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-400'
                                        }`}>This vehicle doesn't have any recorded transactions.</p>
                                </div>
                            ) : (
                                <div className="p-4">
                                    {/* Cards instead of table for better mobile */}
                                    <div className="hidden md:block">
                                        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                                            <table className={`min-w-full divide-y rounded-lg overflow-hidden transition-colors duration-300 ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'
                                                }`}>
                                                <thead>
                                                    <tr className={`transition-colors duration-300 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
                                                        }`}>
                                                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider rounded-tl-lg transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                            }`}>
                                                            S.No
                                                        </th>
                                                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                            }`}>
                                                            Date
                                                        </th>
                                                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                            }`}>
                                                            Type
                                                        </th>
                                                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                            }`}>
                                                            Mode
                                                        </th>
                                                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                            }`}>
                                                            Received By
                                                        </th>
                                                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider rounded-tr-lg transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                            }`}>
                                                            Amount
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className={`divide-y transition-colors duration-300 ${isDarkMode ? 'bg-gray-800 divide-gray-700' : 'bg-white divide-gray-100'
                                                    }`}>
                                                    {transactions
                                                        .filter(transaction => transaction.revenueAmount > 0)
                                                        .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate))
                                                        .map((transaction, index) => (
                                                            <tr
                                                                key={transaction._id}
                                                                className={`transition-colors duration-150 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-blue-50'
                                                                    }`}
                                                            >
                                                                <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
                                                                    }`}>
                                                                    <span className="bg-blue-100 text-blue-800 font-medium px-2.5 py-1 rounded-full text-xs">
                                                                        {index + 1}
                                                                    </span>
                                                                </td>
                                                                <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
                                                                    }`}>
                                                                    <div className="flex flex-col">
                                                                        <span className="font-medium">
                                                                            {new Date(transaction.transactionDate).toLocaleDateString('en-GB')}
                                                                        </span>
                                                                        <span className={`text-xs transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                                            }`}>
                                                                            {new Date(transaction.transactionDate).toLocaleTimeString('en-GB', {
                                                                                hour: '2-digit',
                                                                                minute: '2-digit'
                                                                            })}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
                                                                    }`}>
                                                                    {transaction.transactionType}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${transaction.transactionMode === 'UPI'
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
                                                                <td className={`px-6 py-4 whitespace-nowrap text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
                                                                    }`}>
                                                                    <div className="flex items-center space-x-2">
                                                                        <div className={`p-1 rounded-full transition-colors duration-300 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-100'
                                                                            }`}>
                                                                            <User className={`w-3 h-3 transition-colors duration-300 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
                                                                                }`} />
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
                                    <div className="md:hidden max-h-[500px] overflow-y-auto">
                                        {filteredTxns.length > 0 && (
                                            <div>
                                                <div
                                                    className="w-full relative"
                                                    onTouchStart={handleTouchStart}
                                                    onTouchMove={handleTouchMove}
                                                    onTouchEnd={handleTouchEnd}
                                                >
                                                    {/* Swipe Indicators */}
                                                    <div className="absolute inset-y-0 left-0 w-12 flex items-center justify-center pointer-events-none">
                                                        <div className="bg-gradient-to-r from-blue-500/20 to-transparent w-full h-full flex items-center justify-center">
                                                            <div className="transform -rotate-90 text-blue-500/50 flex items-center gap-1">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                                </svg>
                                                                <span className="text-xs font-medium">Swipe</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="absolute inset-y-0 right-0 w-12 flex items-center justify-center pointer-events-none">
                                                        <div className="bg-gradient-to-l from-blue-500/20 to-transparent w-full h-full flex items-center justify-center">
                                                            <div className="transform rotate-90 text-blue-500/50 flex items-center gap-1">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                                </svg>
                                                                <span className="text-xs font-medium">Swipe</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Transaction Card with enhanced effects */}
                                                    <div className={`w-full border rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
                                                        }`}>
                                                        <div className={`p-4 border-b transition-colors duration-300 ${isDarkMode
                                                            ? 'border-gray-700 bg-gradient-to-r from-gray-700 to-gray-800'
                                                            : 'border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50'
                                                            }`}>
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <div className={`font-semibold transition-colors duration-300 ${isDarkMode ? 'text-blue-300' : 'text-blue-900'
                                                                        }`}>{filteredTxns[currentTxnIndex].transactionType}</div>
                                                                </div>
                                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium shadow-sm ${filteredTxns[currentTxnIndex].transactionMode === 'UPI'
                                                                    ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                                                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                                    }`}>
                                                                    {filteredTxns[currentTxnIndex].transactionMode === 'UPI' ? (
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
                                                        <div className={`p-4 space-y-3 transition-colors duration-300 ${isDarkMode
                                                            ? 'bg-gradient-to-br from-gray-800 to-gray-900'
                                                            : 'bg-gradient-to-br from-white to-gray-50'
                                                            }`}>
                                                            <div className="flex justify-between">
                                                                <span className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                                    }`}>Date</span>
                                                                <div className="flex flex-col items-end">
                                                                    <span className={`text-sm font-medium transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
                                                                        }`}>
                                                                        {new Date(filteredTxns[currentTxnIndex].transactionDate).toLocaleDateString('en-GB')}
                                                                    </span>
                                                                    <span className={`text-xs mt-0.5 transition-colors duration-300 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'
                                                                        }`}>
                                                                        {new Date(filteredTxns[currentTxnIndex].transactionDate).toLocaleTimeString('en-GB', {
                                                                            hour: '2-digit',
                                                                            minute: '2-digit',
                                                                            hour12: true
                                                                        })}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                                    }`}>Received By</span>
                                                                <span className={`text-sm font-medium flex items-center transition-colors duration-300 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'
                                                                    }`}>
                                                                    <User className={`w-3 h-3 mr-1 transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                                        }`} />
                                                                    {filteredTxns[currentTxnIndex].receivedBy || 'Admin'}
                                                                </span>
                                                            </div>
                                                            <div className={`flex justify-between pt-2 border-t transition-colors duration-300 ${isDarkMode ? 'border-gray-700' : 'border-gray-100'
                                                                }`}>
                                                                <span className={`text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                                    }`}>Amount</span>
                                                                <span className="text-green-600 font-semibold flex items-center">
                                                                    <IndianRupee className="w-3.5 h-3.5 mr-0.5" />
                                                                    {filteredTxns[currentTxnIndex].revenueAmount.toLocaleString('en-IN')}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Enhanced pagination dots */}
                                                <div className="flex justify-center mt-4 gap-2">
                                                    {filteredTxns.map((_, idx) => (
                                                        <span
                                                            key={idx}
                                                            className={`inline-block w-2 h-2 rounded-full transition-all duration-300 ${idx === currentTxnIndex
                                                                ? 'bg-blue-500 w-4'
                                                                : isDarkMode
                                                                    ? 'bg-gray-600 hover:bg-gray-500'
                                                                    : 'bg-gray-300 hover:bg-gray-400'
                                                                }`}
                                                        />
                                                    ))}
                                                </div>
                                                {/* Transaction counter */}
                                                <div className={`text-center mt-2 text-sm transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                    }`}>
                                                    Transaction {currentTxnIndex + 1} of {filteredTxns.length}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Transaction Summary - NEW */}
                        {transactions.length > 0 && (
                            <div className={`rounded-2xl shadow-lg overflow-hidden transition-colors duration-300 ${isDarkMode ? 'bg-gray-800' : 'bg-white'
                                }`}>
                                <div className="bg-gradient-to-r from-green-600 to-green-600 p-4 sm:p-6">
                                    <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                                        <IndianRupee className="w-5 h-5" />
                                        Payment Summary
                                    </h3>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        {/* Total Paid */}
                                        <div className={`bg-gradient-to-br rounded-2xl p-5 border transition-colors duration-300 ${isDarkMode
                                            ? 'from-emerald-900/20 to-teal-900/20 border-emerald-800'
                                            : 'from-emerald-50 to-teal-50 border-emerald-100'
                                            }`}>
                                            <div className="flex flex-col">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className={`font-medium text-sm transition-colors duration-300 ${isDarkMode ? 'text-emerald-300' : 'text-emerald-800'
                                                        }`}>Total Paid</span>
                                                    <div className="bg-emerald-100 p-2 rounded-full">
                                                        <IndianRupee className="w-4 h-4 text-emerald-700" />
                                                    </div>
                                                </div>
                                                <div className={`text-2xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-emerald-300' : 'text-emerald-800'
                                                    }`}>
                                                    ₹{transactions
                                                        .filter(t => t.revenueAmount > 0)
                                                        .reduce((total, t) => total + t.revenueAmount, 0)
                                                        .toLocaleString('en-IN')}
                                                </div>
                                                <div className={`text-xs mt-1 transition-colors duration-300 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-700'
                                                    }`}>
                                                    {transactions.filter(t => t.revenueAmount > 0).length} payment(s)
                                                </div>
                                            </div>
                                        </div>

                                        {/* Last Payment */}
                                        <div className={`bg-gradient-to-br rounded-2xl p-5 border transition-colors duration-300 ${isDarkMode
                                            ? 'from-blue-900/20 to-indigo-900/20 border-blue-800'
                                            : 'from-blue-50 to-indigo-50 border-blue-100'
                                            }`}>
                                            <div className="flex flex-col">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className={`font-medium text-sm transition-colors duration-300 ${isDarkMode ? 'text-blue-300' : 'text-blue-800'
                                                        }`}>Last Payment</span>
                                                    <div className="bg-blue-100 p-2 rounded-full">
                                                        <Calendar className="w-4 h-4 text-blue-700" />
                                                    </div>
                                                </div>
                                                {transactions.filter(t => t.revenueAmount > 0).length > 0 ? (
                                                    <>
                                                        <div className={`text-2xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-blue-300' : 'text-blue-800'
                                                            }`}>
                                                            ₹{transactions
                                                                .filter(t => t.revenueAmount > 0)
                                                                .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate))[0]
                                                                .revenueAmount.toLocaleString('en-IN')}
                                                        </div>
                                                        <div className={`text-xs mt-1 transition-colors duration-300 ${isDarkMode ? 'text-blue-400' : 'text-blue-700'
                                                            }`}>
                                                            {new Date(transactions
                                                                .filter(t => t.revenueAmount > 0)
                                                                .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate))[0]
                                                                .transactionDate).toLocaleDateString('en-GB')}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className={`transition-colors duration-300 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                        }`}>No payments</div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Payment Mode */}
                                        <div className={`bg-gradient-to-br rounded-2xl p-5 border transition-colors duration-300 ${isDarkMode
                                            ? 'from-purple-900/20 to-pink-900/20 border-purple-800'
                                            : 'from-purple-50 to-pink-50 border-purple-100'
                                            }`}>
                                            <div className="flex flex-col">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className={`font-medium text-sm transition-colors duration-300 ${isDarkMode ? 'text-purple-300' : 'text-purple-800'
                                                        }`}>Payment Methods</span>
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