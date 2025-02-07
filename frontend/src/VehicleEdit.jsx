import { useState } from 'react';
import { XIcon, SaveIcon, Trash2Icon, PlusCircleIcon, PencilIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';

const VehicleEdit = ({ vehicle, onClose, onUpdate, onDelete }) => {
    const [updatedVehicle, setUpdatedVehicle] = useState({ ...vehicle });
    const [additionalDays, setAdditionalDays] = useState('');
    const [showExtendForm, setShowExtendForm] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    const handleTextInput = (e, field) => {
        let value = e.target.value;
        if (field === 'vehicleNumber') {
            value = value.toUpperCase().replace(/\s+/g, '');
        }
        else if (['vehicleDescription', 'ownerName', 'lotNumber', 'contactNumber'].includes(field)) {
            value = value.toUpperCase();
        }
        setUpdatedVehicle({ ...updatedVehicle, [field]: value });
    };

    const handleNumberInput = (e, field) => {
        setUpdatedVehicle({ ...updatedVehicle, [field]: e.target.value });
    };

    // VehicleEdit Component modifications
const handleSave = async () => {
    try {
        // Remove startDate and endDate from the update data
        const { startDate, endDate, ...updateData } = updatedVehicle;
        
        await fetch(`https://spcarparkingbknd.onrender.com/updateVehicle/${vehicle._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updateData),
        });
        toast.success("Vehicle updated successfully");
        setIsEditMode(false);
        onUpdate();
        onClose();
    } catch (error) {
        toast.error("Failed to update vehicle");
    }
};

const handleExtendRental = async () => {
    if (!additionalDays || additionalDays <= 0) {
        toast.error("Please enter a valid number of days");
        return;
    }

    try {
        const response = await fetch(`https://spcarparkingbknd.onrender.com/extendRental/${vehicle._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                additionalDays: Number(additionalDays),
                currentEndDate: updatedVehicle.endDate // Send current end date
            }),
        });

        if (!response.ok) throw new Error('Failed to extend rental');

        const data = await response.json();
        setUpdatedVehicle(data.vehicle);
        toast.success(`Rental extended by ${additionalDays} days`);
        setShowExtendForm(false);
        setAdditionalDays('');
        onUpdate();
    } catch (error) {
        toast.error("Failed to extend rental");
    }
};

return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-hidden">
        <div className="relative w-full max-w-4xl max-h-[95vh] bg-white rounded-xl shadow-lg flex flex-col overflow-hidden">
            {/* Header - Fixed Position with Safe Spacing */}
            <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-500 to-purple-600 p-4 flex justify-between items-center safe-top">
                <h2 className="text-xl font-bold text-white truncate pr-4">Edit Vehicle Details</h2>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setIsEditMode(!isEditMode)}
                        className="text-white hover:bg-white/20 p-2 rounded-full transition-all flex items-center gap-2"
                    >
                        <PencilIcon className="w-5 h-5" />
                        <span className="hidden sm:inline">
                            {isEditMode ? 'Cancel Edit' : 'Edit Details'}
                        </span>
                    </button>
                    <button 
                        onClick={onClose}
                        className="text-white hover:bg-white/20 p-2 rounded-full transition-all"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Scrollable Content with Bottom Padding */}
            <div className="flex-grow overflow-y-auto px-4 pb-24 pt-4 space-y-6">
                {/* Extend Rental Section */}
                {updatedVehicle.rentalType === 'daily' && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
                            <h3 className="text-lg font-semibold text-blue-800">Rental Extension</h3>
                            <button
                                onClick={() => setShowExtendForm(!showExtendForm)}
                                className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
                            >
                                <PlusCircleIcon className="w-5 h-5" />
                                {showExtendForm ? 'Cancel Extension' : 'Extend Rental'}
                            </button>
                        </div>
                        
                        {showExtendForm && (
                            <div className="mt-4 flex flex-col sm:flex-row gap-4">
                                <div className="flex-1">
                                    <input
                                        type="number"
                                        value={additionalDays}
                                        onChange={(e) => setAdditionalDays(e.target.value)}
                                        className="w-full px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter days to extend"
                                        min="1"
                                    />
                                </div>
                                <button
                                    onClick={handleExtendRental}
                                    className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Extend
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Vehicle Information Column */}
                    <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">Vehicle Information</h3>
                            {/* Input fields with responsive adjustments */}
                            <div className="space-y-4">
                                {/* Input fields remain the same, just ensure responsive design */}
                                <div>
                                    <label className="block text-gray-700 font-medium mb-2">Vehicle Number</label>
                                    <input 
                                        type="text"
                                        value={updatedVehicle.vehicleNumber}
                                        onChange={(e) => handleTextInput(e, 'vehicleNumber')}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                                        placeholder="Enter vehicle number"
                                        required
                                        disabled={!isEditMode}
                                    />
                                </div>
                                    <div>
                                        <label className="block text-gray-700 font-medium mb-2">Vehicle Description</label>
                                        <input 
                                            type="text"
                                            value={updatedVehicle.vehicleDescription}
                                            onChange={(e) => handleTextInput(e, 'vehicleDescription')}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                                            placeholder="Enter vehicle description"
                                            required
                                            disabled={!isEditMode}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 font-medium mb-2">Lot Number</label>
                                        <input 
                                            type="text"
                                            value={updatedVehicle.lotNumber}
                                            onChange={(e) => handleTextInput(e, 'lotNumber')}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                                            placeholder="Enter lot number"
                                            disabled={!isEditMode}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Owner Details Column */}
                        <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h3 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">Owner Details</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-gray-700 font-medium mb-2">Owner Name</label>
                                        <input 
                                            type="text"
                                            value={updatedVehicle.ownerName}
                                            onChange={(e) => handleTextInput(e, 'ownerName')}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                                            placeholder="Enter owner name"
                                            required
                                            disabled={!isEditMode}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 font-medium mb-2">Contact Number</label>
                                        <input 
                                            type="text"
                                            value={updatedVehicle.contactNumber}
                                            onChange={(e) => handleTextInput(e, 'contactNumber')}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                                            placeholder="Enter contact number"
                                            required
                                            disabled={!isEditMode}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Rental Details Column */}
                        <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h3 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">Rental Details</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-gray-700 font-medium mb-2">Parking Type</label>
                                        <select 
                                            value={updatedVehicle.parkingType}
                                            onChange={(e) => setUpdatedVehicle({...updatedVehicle, parkingType: e.target.value})}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                                            disabled={!isEditMode}
                                        >
                                            <option value="private">Private Lot</option>
                                            <option value="open">Open Space</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 font-medium mb-2">Rental Type</label>
                                        <select 
                                            value={updatedVehicle.rentalType}
                                            onChange={(e) => setUpdatedVehicle({
                                                ...updatedVehicle, 
                                                rentalType: e.target.value,
                                                advanceAmount: e.target.value === 'monthly' ? '5000' : '',
                                                numberOfDays: e.target.value === 'daily' ? '' : ''
                                            })}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                                            disabled={!isEditMode}
                                        >
                                            <option value="monthly">Monthly</option>
                                            <option value="daily">Daily</option>
                                        </select>
                                    </div>

                                    {updatedVehicle.rentalType === 'daily' && (
                                        <div>
                                            <label className="block text-gray-700 font-medium mb-2">Number of Days</label>
                                            <input 
                                                type="number"
                                                value={updatedVehicle.numberOfDays}
                                                onChange={(e) => handleNumberInput(e, 'numberOfDays')}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                                                placeholder="Enter number of days"
                                                required
                                                min="1"
                                                disabled={!isEditMode}
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <div className="flex justify-between items-center">
                                            <label className="block text-gray-700 font-medium mb-2">Rental Price (₹)</label>
                                            {updatedVehicle.rentalType === 'daily' && updatedVehicle.numberOfDays && updatedVehicle.rentPrice && (
                                                <span className="text-blue-700 font-medium">
                                                    Total: ₹{Number(updatedVehicle.numberOfDays) * Number(updatedVehicle.rentPrice)}
                                                </span>
                                            )}
                                        </div>
                                        <input 
                                            type="number"
                                            value={updatedVehicle.rentPrice}
                                            onChange={(e) => handleNumberInput(e, 'rentPrice')}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                                            placeholder="Enter rental price"
                                            required
                                            min="0"
                                            disabled={!isEditMode}
                                        />
                                    </div>

                                    {updatedVehicle.rentalType === 'monthly' && (
    <div>
        <label className="block text-gray-700 font-medium mb-2">Advance Amount (₹)</label>
        <input 
            type="number"
            value={updatedVehicle.advanceAmount}
            onChange={(e) => handleNumberInput(e, 'advanceAmount')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
            placeholder="Enter advance amount"
            required
            min="0"
            disabled={!isEditMode}
        />
    </div>
)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="sticky bottom-0 p-4 bg-gray-50 border-t z-10 safe-bottom">
                    <div className="flex gap-4">
                        <button 
                            onClick={handleSave}
                            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg hover:opacity-90 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!isEditMode}
                        >
                            <SaveIcon className="w-5 h-5 mr-2" />
                            Save Changes
                        </button>
                        <button 
                            onClick={() => onDelete(vehicle._id)}
                            className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-lg transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!isEditMode}
                        >
                            <Trash2Icon className="w-5 h-5 mr-2" />
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VehicleEdit;