import { useState, useEffect } from 'react';
import { Search, Car, User, Phone, MapPin, IndianRupee, Calendar, CreditCard, DollarSign, X, PrinterIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import QRCode from 'qrcode';

export function VehicleInfo() {
    const [vehicles, setVehicles] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);

    useEffect(() => {
        fetchVehicles();
    }, []);

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
                ['Start Date:', new Date(vehicle.startDate).toLocaleDateString('en-GB')],
                ['End Date:', new Date(vehicle.endDate).toLocaleDateString('en-GB')],
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

            // Add Vehicle Image Section with smaller dimensions
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
                    const imageX = startX1 + ((columnWidth - imageWidth) / 2); // Center horizontally

                    doc.addImage(
                        imgBase64, 
                        'JPEG', 
                        imageX,  // centered X position
                        doc.autoTable.previous.finalY + 5,
                        imageWidth,
                        50
                    );
                } catch (imgError) {
                    console.error('Error loading vehicle image:', imgError);
                }
            }

            
    
            // Right Column - adjust Y position
            const rightColumnY = vehicle.vehicleImage?.url ? 
                doc.autoTable.previous.finalY + 60 : 55; // reduced from 80
            
            createSection('Owner Details', startX2, 55); // Keep at top
    
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
    
            // Terms and Conditions - Reduced padding
            createSection('Terms & Conditions', startX2, doc.autoTable.previous.finalY + 10); // reduced from 15
    
            const terms = [
                ['1.', 'Rent must be paid before 5th of each month'],
                ['2.', 'Parking spot must be kept clean'],
                ['3.', 'No unauthorized vehicle transfers'],
                ['4.', 'Save Water and Electricity']
            ];
    
            doc.autoTable({
                startY: doc.autoTable.previous.finalY + 15, // reduced from 20
                margin: { left: startX2 },
                head: [],
                body: terms,
                theme: 'plain',
                styles: { 
                    fontSize: 10,
                    cellPadding: 2, // reduced from 3
                    font: 'helvetica',
                    textColor: [44, 62, 80]
                },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 10 },
                    1: { cellWidth: 75 }
                }
            });
    
            // QR Code Section - Reduced size and padding
            doc.setFontSize(16);
            doc.setTextColor(0, 128, 0);
            doc.text('Scan QR to Pay', startX2, doc.autoTable.previous.finalY + 10);
            // Add smaller text
            doc.setFontSize(10);
            doc.text('(Ignore if already paid)', startX2, doc.autoTable.previous.finalY + 20);
            // Add the green line
            doc.setDrawColor(0, 128, 0);
            doc.setLineWidth(0.5);
            doc.line(startX2, doc.autoTable.previous.finalY + 12, startX2 + columnWidth, doc.autoTable.previous.finalY + 12);
            doc.setTextColor(44, 62, 80);
            
            // Generate smaller QR Code
            const qrData = `upi://pay?pa=paulcars2000@oksbi&pn=PAULCARS&am=${totalAmount}&tr=${vehicle._id}&tn=SP_CAR_PARKING_${vehicle.vehicleNumber}`;
            const qrDataUrl = await QRCode.toDataURL(qrData, {
                width: 30,
                margin: 2,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            });
            
            // Center QR code in right column
            const qrWidth = 60;
            const qrX = startX2 + ((columnWidth - qrWidth) / 2); // Center horizontally

            doc.addImage(
                qrDataUrl, 
                'PNG', 
                qrX,  // centered X position
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
    
            // Save
            doc.save(`SP_Parking_Receipt_${vehicle.vehicleNumber}.pdf`);
            toast.success('Receipt generated successfully');
        } catch (error) {
            console.error('Error generating receipt:', error);
            toast.error('Failed to generate receipt');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pt-6 px-4">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Search Section */}
                <div className="bg-white rounded-2xl shadow-lg p-6">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search by vehicle number, description, owner name, or lot number..."
                            value={searchQuery}
                            onChange={handleSearch}
                            className="w-full px-4 py-3 pl-12 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    </div>

                    {searchQuery && filteredVehicles.length > 0 && !selectedVehicle && (
                        <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
                            {filteredVehicles.map(vehicle => (
                                <button
                                    key={vehicle._id}
                                    onClick={() => setSelectedVehicle(vehicle)}
                                    className="w-full text-left p-4 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-4"
                                >
                                    <Car className="text-blue-500" />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium">{vehicle.vehicleNumber}</p>
                                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full">
                                                {vehicle.lotNumber || 'Open'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500">{vehicle.vehicleDescription}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Vehicle Details Section */}
                {selectedVehicle && (
                    <div className="space-y-6">
                        {/* Basic Info Card */}
                        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 sm:p-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg sm:text-2xl font-bold text-white">Vehicle Details</h2>
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1.5 bg-white/30 text-white text-sm sm:text-base font-extrabold rounded-lg shadow-lg">
                                            {selectedVehicle.lotNumber || 'Open'}
                                        </span>
                                        <button
                                            onClick={() => handlePrintInvoice(selectedVehicle)}
                                            className="p-2 bg-white/20 rounded-lg text-white hover:bg-white/30 transition-colors"
                                            title="Print Receipt"
                                        >
                                            <PrinterIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-6 space-y-6">
                                {/* Row 1: Vehicle Number - Vehicle Description - Vehicle Type */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="flex items-center space-x-3">
                                        <Car className="text-blue-500 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-sm text-gray-500">Vehicle Number</p>
                                            <p className="font-medium truncate">{selectedVehicle.vehicleNumber}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <Car className="text-blue-500 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-sm text-gray-500">Vehicle Description</p>
                                            <p className="font-medium truncate">{selectedVehicle.vehicleDescription}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <Car className="text-blue-500 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-sm text-gray-500">Vehicle Type</p>
                                            <p className="font-medium truncate">
                                                {selectedVehicle.vehicleType === 'own' ? 'Own Board' : 'T Board'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Row 2: Owner Name - Contact - Start Date */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="flex items-center space-x-3">
                                        <User className="text-blue-500 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-sm text-gray-500">Owner Name</p>
                                            <p className="font-medium truncate">{selectedVehicle.ownerName}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <Phone className="text-blue-500 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-sm text-gray-500">Contact Number</p>
                                            <a 
                                                href={`tel:${selectedVehicle.contactNumber}`}
                                                className="font-medium truncate text-blue-600 hover:text-blue-800 hover:underline"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {selectedVehicle.contactNumber}
                                            </a>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <Calendar className="text-blue-500 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-sm text-gray-500">Start Date</p>
                                            <p className="font-medium truncate">
                                                {new Date(selectedVehicle.startDate).toLocaleDateString('en-GB')}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Row 3: Rental Type - Rent Price - Total Rental Price/Advance */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="flex items-center space-x-3">
                                        <Calendar className="text-blue-500 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-sm text-gray-500">Rental Type</p>
                                            <p className="font-medium capitalize truncate">{selectedVehicle.rentalType}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <IndianRupee className="text-blue-500 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-sm text-gray-500">Rent Price</p>
                                            <p className="font-medium truncate">₹{selectedVehicle.rentPrice}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <IndianRupee className="text-blue-500 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-sm text-gray-500">
                                                {selectedVehicle.rentalType === 'monthly' ? 'Advance Amount' : 'Total Rental Price'}
                                            </p>
                                            <p className="font-medium truncate">
                                                ₹{selectedVehicle.rentalType === 'monthly' 
                                                    ? selectedVehicle.advanceAmount 
                                                    : selectedVehicle.rentPrice * selectedVehicle.numberOfDays}
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

                        {/* Images Section */}
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <h3 className="text-lg font-semibold mb-4">Documents & Images</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {selectedVehicle.vehicleImage?.url && (
                                    <div 
                                        onClick={() => handleImageClick(selectedVehicle.vehicleImage.url, 'Vehicle Image', selectedVehicle)}
                                        className="cursor-pointer group"
                                    >
                                        <p className="text-sm text-gray-500 mb-2">Vehicle Image</p>
                                        <div className="relative overflow-hidden rounded-lg">
                                            <img 
                                                src={selectedVehicle.vehicleImage.url} 
                                                alt="Vehicle" 
                                                className="w-full h-48 object-cover rounded-lg transition-transform duration-300 group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all duration-300">
                                                <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/50 px-3 py-1 rounded-full text-sm">
                                                    Click to expand
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {selectedVehicle.document1Image?.url && (
                                    <div 
                                        onClick={() => handleImageClick(selectedVehicle.document1Image.url, 'Aadhaar Card', selectedVehicle)}
                                        className="cursor-pointer group"
                                    >
                                        <p className="text-sm text-gray-500 mb-2">Aadhaar Card</p>
                                        <div className="relative overflow-hidden rounded-lg">
                                            <img 
                                                src={selectedVehicle.document1Image.url} 
                                                alt="Document 1" 
                                                className="w-full h-48 object-cover rounded-lg transition-transform duration-300 group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all duration-300">
                                                <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/50 px-3 py-1 rounded-full text-sm">
                                                    Click to expand
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {selectedVehicle.document2Image?.url && (
                                    <div 
                                        onClick={() => handleImageClick(selectedVehicle.document2Image.url, 'RC/License', selectedVehicle)}
                                        className="cursor-pointer group"
                                    >
                                        <p className="text-sm text-gray-500 mb-2">RC/License</p>
                                        <div className="relative overflow-hidden rounded-lg">
                                            <img 
                                                src={selectedVehicle.document2Image.url} 
                                                alt="Document 2" 
                                                className="w-full h-48 object-cover rounded-lg transition-transform duration-300 group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all duration-300">
                                                <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/50 px-3 py-1 rounded-full text-sm">
                                                    Click to expand
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Transaction History */}
                        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6">
                                <h3 className="text-xl font-bold text-white">Transaction History</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
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
                                                Amount
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {transactions.map((transaction) => (
                                            <tr key={transaction._id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {new Date(transaction.transactionDate).toLocaleDateString('en-GB')}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {transaction.transactionType}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                        transaction.transactionMode === 'UPI' 
                                                            ? 'bg-blue-100 text-blue-800' 
                                                            : 'bg-green-100 text-green-800'
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
                                                    ₹{transaction.revenueAmount}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Add Image Viewer Modal */}
            {selectedImage && (
                <div 
                    className="fixed inset-0 backdrop-blur-md bg-black/70 z-50 flex items-center justify-center"
                    onClick={handleCloseViewer}
                >
                    <div className="max-w-7xl mx-auto px-4 relative">
                        <button 
                            onClick={handleCloseViewer}
                            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
                        >
                            <X className="w-8 h-8" />
                        </button>
                        <div className="text-center mb-4 text-white">
                            <h3 className="text-xl font-semibold">{selectedImage.title}</h3>
                            <p className="text-sm mt-1">{selectedImage.vehicleNumber}</p>
                            <p className="text-sm mt-1">{selectedImage.vehicleDescription}</p>
                        </div>
                        <img 
                            src={selectedImage.url} 
                            alt={selectedImage.title}
                            className="max-h-[85vh] max-w-full object-contain mx-auto rounded-lg shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default VehicleInfo; 