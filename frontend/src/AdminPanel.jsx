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
            doc.text('Welcomes You', pageWidth/2, 35, { align: 'center' });
            
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

            // Add a green line after the image
            doc.setDrawColor(0, 128, 0);
            doc.setLineWidth(0.5);
            doc.line(startX1, doc.autoTable.previous.finalY + (vehicle.vehicleImage?.url ? 60 : 5), startX1 + columnWidth, doc.autoTable.previous.finalY + (vehicle.vehicleImage?.url ? 60 : 5));
    
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
                ['3.', 'No unauthorized vehicle transfers']
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
            doc.setTextColor(128, 128, 128);
            const footer = "This is a computer-generated document. No signature is required.";
            doc.text(footer, pageWidth/2, pageHeight - 15, { align: 'center' });
    
            // Save
            doc.save(`SP_Parking_Receipt_${vehicle.vehicleNumber}.pdf`);
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

    return (
        <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-xl overflow-hidden">
            <Toaster position="top-right" />
            
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 flex justify-between items-center">
                <h1 className="text-3xl font-bold text-white">Vehicles Database</h1>
                <button 
                    onClick={fetchVehicles} 
                    className="text-white hover:bg-white/20 p-2 rounded-full transition-all"
                >
                    <RefreshCwIcon />
                </button>
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
                                    onClick={() => handlePrintInvoice(vehicle)}
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