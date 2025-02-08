import { useState } from 'react';
import { CheckIcon, TrashIcon, XIcon, PlusCircleIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';

const VehicleActions = ({ vehicle, onClose, onRefresh }) => {
    const [loading, setLoading] = useState(false);
    const [showExtendForm, setShowExtendForm] = useState(false);
    const [additionalDays, setAdditionalDays] = useState('');

    const handlePaidRent = async () => {
        setLoading(true);
        try {
            const currentDate = new Date();
            // Create a new date by adding 1 month to the current date
            const nextMonth = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
    
            const response = await fetch(`https://spcarparkingbknd.onrender.com/reactivateVehicle/${vehicle._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: 'active',
                    endDate: nextMonth
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

    const handleDeleteVehicle = async () => {
        setLoading(true);
        try {
            const response = await fetch(`https://spcarparkingbknd.onrender.com/removeVehicle/${vehicle._id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                toast.success('Vehicle removed successfully');
                onRefresh();
                onClose();
            } else {
                toast.error('Failed to remove vehicle');
            }
        } catch (error) {
            toast.error('Error deleting vehicle');
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
                body: JSON.stringify({ additionalDays: Number(additionalDays) }),
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
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-white">Vehicle: {vehicle.vehicleNumber}</h2>
                        <button 
                            onClick={onClose}
                            disabled={loading}
                            className="text-white hover:text-gray-200 disabled:opacity-50"
                        >
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div className="p-6">
                    <p className="text-gray-600 mb-6">Select an action for this vehicle:</p>
                    <div className="flex flex-col gap-3">
                        {vehicle.rentalType === 'daily' && (
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">Extend Rental Period</span>
                                    <button
                                        onClick={() => setShowExtendForm(!showExtendForm)}
                                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                                    >
                                        <PlusCircleIcon className="w-4 h-4" />
                                        {showExtendForm ? 'Cancel' : 'Extend'}
                                    </button>
                                </div>
                                
                                {showExtendForm && (
                                    <div className="flex gap-2 mb-4">
                                        <input
                                            type="number"
                                            value={additionalDays}
                                            onChange={(e) => setAdditionalDays(e.target.value)}
                                            className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Number of days"
                                            min="1"
                                        />
                                        <button
                                            onClick={handleExtendRental}
                                            disabled={loading}
                                            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                                        >
                                            Extend
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        <button 
                            onClick={handlePaidRent}
                            disabled={loading}
                            className="w-full flex items-center justify-center bg-green-500 text-white px-4 py-3 rounded hover:bg-green-600 transition-colors disabled:opacity-50 font-medium"
                        >
                            <CheckIcon className="w-5 h-5 mr-2" /> 
                            <span>Paid (Extend 30 Days)</span>
                        </button>
                        <button 
                            onClick={handleDeleteVehicle}
                            disabled={loading}
                            className="w-full flex items-center justify-center bg-red-500 text-white px-4 py-3 rounded hover:bg-red-600 transition-colors disabled:opacity-50 font-medium"
                        >
                            <TrashIcon className="w-5 h-5 mr-2" /> 
                            <span>Delete Vehicle</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VehicleActions;