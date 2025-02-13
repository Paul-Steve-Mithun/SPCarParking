import { useState } from 'react';
import { CheckIcon, TrashIcon, XIcon, PlusCircleIcon, Wallet, CreditCard, IndianRupee } from 'lucide-react';
import { toast } from 'react-hot-toast';

const VehicleActions = ({ vehicle, onClose, onRefresh }) => {
    const [loading, setLoading] = useState(false);
    const [showExtendForm, setShowExtendForm] = useState(false);
    const [additionalDays, setAdditionalDays] = useState('');
    const [transactionMode, setTransactionMode] = useState('Cash');
    const [customRentPrice, setCustomRentPrice] = useState('');

    const handlePaidRent = async () => {
        setLoading(true);
        try {
            const currentDate = new Date();
            const nextMonth = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
    
            const response = await fetch(`https://spcarparkingbknd.onrender.com/reactivateVehicle/${vehicle._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: 'active',
                    endDate: nextMonth,
                    transactionMode: transactionMode,
                    rentPrice: customRentPrice ? Number(customRentPrice) : vehicle.rentPrice
                })
            });
    
            if (response.ok) {
                toast.success('Vehicle reactivated for one month');
                onRefresh();
                onClose();
            } else {
                toast.error('Failed to reactivate vehicle');
            }
        } catch (error) {
            toast.error('Error processing payment');
        } finally {
            setLoading(false);
        }
    };

    const handleExtendRental = async () => {
        if (!additionalDays || additionalDays <= 0) {
            toast.error("Please enter a valid number of days");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`https://spcarparkingbknd.onrender.com/extendRental/${vehicle._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    additionalDays: Number(additionalDays),
                    transactionMode: transactionMode 
                }),
            });

            if (!response.ok) throw new Error('Failed to extend rental');

            toast.success(`Rental extended by ${additionalDays} days`);
            setShowExtendForm(false);
            setAdditionalDays('');
            onRefresh();
            onClose();
        } catch (error) {
            toast.error("Failed to extend rental");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="fixed inset-0 bg-black/50" onClick={onClose} />
            <div className="relative bg-white rounded-lg shadow-xl overflow-hidden w-96">
                <div className="bg-gradient-to-r from-red-500 to-red-600 p-6">
                    <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <h2 className="text-xl font-bold text-white">{vehicle.vehicleNumber}</h2>
                                <span className="px-4 py-1.5 bg-white/20 text-white font-bold rounded-full text-base">
                                    {vehicle.lotNumber || 'Open'}
                                </span>
                            </div>
                            <button 
                                onClick={onClose}
                                disabled={loading}
                                className="text-white hover:text-gray-200 disabled:opacity-50"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <span className="text-sm text-white/80">{vehicle.vehicleDescription}</span>
                    </div>
                </div>
                <div className="p-6">
                    <p className="text-gray-600 mb-6">Select an action for this vehicle:</p>
                    <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <button
                                type="button"
                                onClick={() => setTransactionMode('Cash')}
                                className={`px-4 py-2 rounded-lg flex items-center justify-center ${
                                    transactionMode === 'Cash'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700'
                                }`}
                            >
                                <Wallet className="h-5 w-5 mr-2" />
                                Cash
                            </button>
                            <button
                                type="button"
                                onClick={() => setTransactionMode('UPI')}
                                className={`px-4 py-2 rounded-lg flex items-center justify-center ${
                                    transactionMode === 'UPI'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700'
                                }`}
                            >
                                <CreditCard className="h-5 w-5 mr-2" />
                                UPI
                            </button>
                        </div>

                        {vehicle.rentalType === 'daily' ? (
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">Extend Rental Period</span>
                                    <button
                                        onClick={() => setShowExtendForm(!showExtendForm)}
                                        className="text-green-600 hover:text-green-800 text-base flex items-center gap-2"
                                    >
                                        <PlusCircleIcon className="w-5 h-5" />
                                        {showExtendForm ? 'Cancel' : 'Extend Rental'}
                                    </button>
                                </div>
                                
                                {showExtendForm && (
                                    <div className="flex flex-col gap-2">
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                value={additionalDays}
                                                onChange={(e) => setAdditionalDays(e.target.value)}
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                                                placeholder="Number of days"
                                                min="1"
                                            />
                                            <button
                                                onClick={handleExtendRental}
                                                disabled={loading}
                                                className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 disabled:opacity-50 text-base font-medium"
                                            >
                                                Pay & Extend
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="relative">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Rent Amount (Optional)
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <IndianRupee className="h-5 w-5 text-gray-400" />
                                        </div>
                                        <input
                                            type="number"
                                            value={customRentPrice}
                                            onChange={(e) => setCustomRentPrice(e.target.value)}
                                            placeholder={`Current: ₹${vehicle.rentPrice}`}
                                            className="pl-10 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            min="0"
                                        />
                                    </div>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Leave empty to use current rent price
                                    </p>
                                </div>

                                <button 
                                    onClick={handlePaidRent}
                                    disabled={loading}
                                    className="w-full flex items-center justify-center bg-green-500 text-white px-4 py-3 rounded hover:bg-green-600 transition-colors disabled:opacity-50 text-base font-medium"
                                >
                                    <CheckIcon className="w-6 h-6 mr-2" />
                                    <span>Extend 30 Days</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VehicleActions;