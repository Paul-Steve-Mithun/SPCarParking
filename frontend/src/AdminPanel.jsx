import { useEffect, useState } from 'react';
import { TrashIcon, RefreshCwIcon, SearchIcon, PencilIcon, UserCog2Icon, PrinterIcon } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import VehicleEdit from './VehicleEdit';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import QRCode from 'qrcode'

export function AdminPanel() {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [printLoading, setPrintLoading] = useState(false);

    const fetchVehicles = async () => {
        setLoading(true);
        try {
            const response = await fetch('https://spcarparkingbackend.vercel.app/vehicles');
            const data = await response.json();
            setVehicles(data);
        } catch (error) {
            toast.error('Failed to fetch vehicles');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVehicles();
        const intervalId = setInterval(fetchVehicles, 60000);
        return () => clearInterval(intervalId);
    }, []);

    const removeVehicle = async (id) => {
        try {
            await fetch(`https://spcarparkingbackend.vercel.app/removeVehicle/${id}`, { method: 'DELETE' });
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
            doc.text('PARKING RECEIPT', pageWidth/2, 35, { align: 'center' });
            
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
                ['Lot Number:', vehicle.lotNumber],
                ['Status:', vehicle.status],
                ['Rental Type:', vehicle.rentalType],
                ['Advance Amount:', `INR ${vehicle.advanceAmount}`],
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
    
            // Right Column
            createSection('Owner Details', startX2, 55);
    
            const ownerDetails = [
                ['Name:', vehicle.ownerName || 'N/A'],
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
            createSection('Terms & Conditions', startX2, doc.autoTable.previous.finalY + 15);
    
            const terms = [
                ['1.', 'Rental fees are non-refundable'],
                ['2.', 'Vehicle must be maintained in good condition'],
                ['3.', 'Parking spot must be kept clean'],
                ['4.', 'No unauthorized vehicle transfers'],
                ['5.', 'Timely renewal of rental agreement']
            ];
    
            doc.autoTable({
                startY: doc.autoTable.previous.finalY + 20,
                margin: { left: startX2 },
                head: [],
                body: terms,
                theme: 'plain',
                styles: { 
                    fontSize: 10,
                    cellPadding: 3,
                    font: 'helvetica',
                    textColor: [44, 62, 80]
                },
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 10 },
                    1: { cellWidth: 75 }
                }
            });
    
            // QR Code Section
            createSection('Scan QR to Pay', startX2, doc.autoTable.previous.finalY + 15);
            
            // Generate QR Code with correct total amount
            const qrData = `upi://pay?pa=paulcars2000@oksbi&pn=PAULCARS&am=${totalAmount}&tr=${vehicle._id}&tn=SP_CAR_PARKING_${vehicle.vehicleNumber}`;
            const qrDataUrl = await QRCode.toDataURL(qrData, {
                width: 40,
                margin: 3,
                color: {
                    dark: '#000000',
                    light: '#ffffff'
                }
            });
            
            // Add QR code to PDF
            doc.addImage(qrDataUrl, 'PNG', startX2, doc.autoTable.previous.finalY + 20, 80, 80);
    
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

    const filteredVehicles = vehicles.filter(vehicle =>
        vehicle.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.ownerName.toLowerCase().includes(searchTerm.toLowerCase())
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
        const end = new Date(endDate);
        const now = new Date();
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
                        placeholder="Search by vehicle number or owner name..." 
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
                            className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex-grow cursor-pointer" onClick={() => setSelectedVehicle(vehicle)}>
                                <div className="flex items-center gap-3">
                                    <p className="font-semibold text-gray-800">{vehicle.vehicleNumber}</p>
                                    <span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                                        {vehicle.lotNumber || 'No Lot'}
                                    </span>
                                    <StatusBadge status={vehicle.status} endDate={vehicle.endDate} />
                                </div>
                                <p className="text-sm text-gray-500 mt-1">{vehicle.vehicleDescription}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-sm text-gray-500">{renderRentalInfo(vehicle)}</p>
                                    {vehicle.rentalType === 'daily' && (
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                                            Total: ₹{vehicle.rentPrice * vehicle.numberOfDays}
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {getRemainingTime(vehicle.endDate)}
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                            <button
                                onClick={() => handlePrintInvoice(vehicle)}
                                className="text-gray-600 hover:text-blue-600 transition-colors"
                            >
                                    <PrinterIcon className="w-5 h-5" />
                                </button>
                                <button onClick={() => setSelectedVehicle(vehicle)}>
                                    <UserCog2Icon className="w-5 h-5 text-gray-600 hover:text-blue-600" />
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