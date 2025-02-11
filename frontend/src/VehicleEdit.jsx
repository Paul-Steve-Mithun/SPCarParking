import { useState } from 'react';
import { XIcon, SaveIcon, Trash2Icon, PlusCircleIcon, PencilIcon, UploadIcon, Wallet, CreditCard } from 'lucide-react';
import { toast } from 'react-hot-toast';

const modalAnimation = {
    enter: "transition-all duration-300 ease-out",
    enterFrom: "opacity-0 scale-95",
    enterTo: "opacity-100 scale-100",
    leave: "transition-all duration-200 ease-in",
    leaveFrom: "opacity-100 scale-100",
    leaveTo: "opacity-0 scale-95"
};

const VehicleEdit = ({ vehicle, onClose, onUpdate, onDelete }) => {
    const [updatedVehicle, setUpdatedVehicle] = useState({ 
        ...vehicle,
        vehicleType: vehicle.vehicleType || 'own'
    });
    const [additionalDays, setAdditionalDays] = useState('');
    const [showExtendForm, setShowExtendForm] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [files, setFiles] = useState({
        vehicleImage: null,
        document1Image: null,
        document2Image: null
    });
    const [previews, setPreviews] = useState({
        vehicleImage: vehicle?.vehicleImage?.url || null,
        document1Image: vehicle?.document1Image?.url || null,
        document2Image: vehicle?.document2Image?.url || null
    });
    const [extensionTransactionMode, setExtensionTransactionMode] = useState('Cash');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

    const handleFileChange = (e, field) => {
        const file = e.target.files[0];
        if (file) {
            setFiles(prev => ({ ...prev, [field]: file }));
            const previewUrl = URL.createObjectURL(file);
            setPreviews(prev => ({ ...prev, [field]: previewUrl }));
        }
    };

    const ImageUploadField = ({ label, field }) => (
        <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">{label}</label>
            <div className="flex items-center space-x-4">
                <div className="relative w-24 h-24 flex-shrink-0">
                    {previews[field] ? (
                        <div className="relative w-full h-full">
                            <img 
                                src={previews[field]} 
                                alt={label}
                                className="w-full h-full object-cover rounded-lg"
                            />
                            {isEditMode && (
                                <button
                                    onClick={() => handleRemoveImage(field)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                                >
                                    <XIcon className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                            <UploadIcon className="w-8 h-8 text-gray-400" />
                        </div>
                    )}
                </div>
                {isEditMode && (
                    <div className="flex-grow">
                        <label className="block w-full">
                            <span className="sr-only">Choose file</span>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileChange(e, field)}
                                className="block w-full text-sm text-gray-500
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded-full file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-blue-50 file:text-blue-700
                                    hover:file:bg-blue-100"
                            />
                        </label>
                    </div>
                )}
            </div>
        </div>
    );

    const [removedImages, setRemovedImages] = useState([]);

    const handleRemoveImage = (field) => {
        setFiles(prev => ({ ...prev, [field]: null }));
        setPreviews(prev => ({ ...prev, [field]: null }));
        setRemovedImages(prev => [...prev, field]);
    };

    const handleSave = async () => {
        try {
            const formData = new FormData();
            const vehicleDataWithRemovals = {
                ...updatedVehicle,
                removeImages: removedImages
            };
            
            formData.append('vehicleData', JSON.stringify(vehicleDataWithRemovals));
            
            if (files.vehicleImage) formData.append('vehicleImage', files.vehicleImage);
            if (files.document1Image) formData.append('document1Image', files.document1Image);
            if (files.document2Image) formData.append('document2Image', files.document2Image);

            const response = await fetch(`https://spcarparkingbknd.onrender.com/updateVehicle/${vehicle._id}`, {
                method: "PUT",
                body: formData
            });

            if (!response.ok) throw new Error('Failed to update vehicle');

            const data = await response.json();
            setUpdatedVehicle(data.vehicle);
            setRemovedImages([]);
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
                    currentEndDate: updatedVehicle.endDate,
                    transactionMode: extensionTransactionMode
                }),
            });

            if (!response.ok) throw new Error('Failed to extend rental');

            const data = await response.json();
            setUpdatedVehicle(data.vehicle);
            toast.success(`Rental extended by ${additionalDays} days`);
            setShowExtendForm(false);
            setAdditionalDays('');
            setExtensionTransactionMode('Cash');
            onUpdate();
        } catch (error) {
            toast.error("Failed to extend rental");
        }
    };

    const handleDelete = async () => {
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        try {
            // First update the advance record with refund details
            if (vehicle.rentalType === 'monthly') {
                const advanceResponse = await fetch(`https://spcarparkingbknd.onrender.com/advances/refund/${vehicle.vehicleNumber}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        advanceRefund: vehicle.advanceAmount
                    })
                });

                if (!advanceResponse.ok) {
                    throw new Error('Failed to update advance refund');
                }
            }

            // Then delete the vehicle using the existing removeVehicle endpoint
            const response = await fetch(`https://spcarparkingbknd.onrender.com/removeVehicle/${vehicle._id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete vehicle');
            }

            onDelete(vehicle._id);
            onClose();
        } catch (error) {
            toast.error('Failed to delete vehicle');
            console.error('Error:', error);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-hidden">
            <div className="relative w-full max-w-7xl max-h-[95vh] bg-white rounded-xl shadow-lg flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6">
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold text-white">Edit Vehicle Details</h1>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setIsEditMode(!isEditMode)}
                                className="text-white hover:bg-white/20 px-4 py-2 rounded-lg transition-all flex items-center gap-2"
                            >
                                <PencilIcon className="w-5 h-5" />
                                <span>{isEditMode ? 'Cancel Edit' : 'Edit Details'}</span>
                            </button>
                            <button 
                                onClick={onClose}
                                className="text-white hover:bg-white/20 p-2 rounded-lg transition-all"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Form Content */}
                <div className="flex-grow overflow-y-auto p-6">
                    {/* Extend Rental Section */}
                    {updatedVehicle.rentalType === 'daily' && (
                        <div className="bg-blue-50 p-4 rounded-lg mb-6">
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
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
                                <div className="mt-4 space-y-4">
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <input
                                            type="number"
                                            value={additionalDays}
                                            onChange={(e) => setAdditionalDays(e.target.value)}
                                            className="flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="Enter days to extend"
                                            min="1"
                                        />
                                        <button
                                            onClick={handleExtendRental}
                                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            Extend
                                        </button>
                                    </div>

                                    {/* Transaction Mode Selection */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setExtensionTransactionMode('Cash')}
                                            className={`px-4 py-2 rounded-lg flex items-center justify-center ${
                                                extensionTransactionMode === 'Cash'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-100 text-gray-700'
                                            }`}
                                        >
                                            <Wallet className="h-5 w-5 mr-2" />
                                            Cash
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setExtensionTransactionMode('UPI')}
                                            className={`px-4 py-2 rounded-lg flex items-center justify-center ${
                                                extensionTransactionMode === 'UPI'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-100 text-gray-700'
                                            }`}
                                        >
                                            <CreditCard className="h-5 w-5 mr-2" />
                                            UPI
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Main Form Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Vehicle Information Column */}
                        <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h2 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">Vehicle Information</h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-gray-700 font-medium mb-2">Vehicle Number</label>
                                        <input 
                                            type="text"
                                            value={updatedVehicle.vehicleNumber}
                                            onChange={(e) => handleTextInput(e, 'vehicleNumber')}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                            disabled={!isEditMode}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 font-medium mb-2">Vehicle Description</label>
                                        <input 
                                            type="text"
                                            value={updatedVehicle.vehicleDescription}
                                            onChange={(e) => handleTextInput(e, 'vehicleDescription')}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                            disabled={!isEditMode}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 font-medium mb-2">Vehicle Board Type</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                type="button"
                                                onClick={() => isEditMode && setUpdatedVehicle({...updatedVehicle, vehicleType: 'own'})}
                                                className={`px-4 py-2 rounded-lg flex items-center justify-center ${
                                                    updatedVehicle.vehicleType === 'own'
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-gray-100 text-gray-700'
                                                } ${!isEditMode && 'opacity-50 cursor-not-allowed'}`}
                                                disabled={!isEditMode}
                                            >
                                                Own Board
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => isEditMode && setUpdatedVehicle({...updatedVehicle, vehicleType: 'tboard'})}
                                                className={`px-4 py-2 rounded-lg flex items-center justify-center ${
                                                    updatedVehicle.vehicleType === 'tboard'
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-gray-100 text-gray-700'
                                                } ${!isEditMode && 'opacity-50 cursor-not-allowed'}`}
                                                disabled={!isEditMode}
                                            >
                                                T Board
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 font-medium mb-2">Lot Number</label>
                                        <input 
                                            type="text"
                                            value={updatedVehicle.lotNumber}
                                            onChange={(e) => handleTextInput(e, 'lotNumber')}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                            disabled={!isEditMode}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Owner Details Column */}
                        <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h2 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">Owner Details</h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-gray-700 font-medium mb-2">Owner Name</label>
                                        <input 
                                            type="text"
                                            value={updatedVehicle.ownerName}
                                            onChange={(e) => handleTextInput(e, 'ownerName')}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                            disabled={!isEditMode}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-gray-700 font-medium mb-2">Contact Number</label>
                                        <input 
                                            type="text"
                                            value={updatedVehicle.contactNumber}
                                            onChange={(e) => handleTextInput(e, 'contactNumber')}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                            disabled={!isEditMode}
                                        />
                                    </div>

                                    {/* Document Upload Section */}
                                    <div className="mt-6 space-y-4">
                                        <h3 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">Document Upload</h3>
                                        
                                        {/* Vehicle Image Upload */}
                                        <div className="space-y-2">
                                            <label className="block text-gray-700 font-medium">Vehicle Photo</label>
                                            <div className="flex items-center space-x-4">
                                                <div className="flex-1">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => handleFileChange(e, 'vehicleImage')}
                                                        className="hidden"
                                                        id="vehicleImage"
                                                        disabled={!isEditMode}
                                                    />
                                                    <label
                                                        htmlFor="vehicleImage"
                                                        className={`flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg ${
                                                            isEditMode ? 'cursor-pointer hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'
                                                        }`}
                                                    >
                                                        <UploadIcon className="w-5 h-5 mr-2" />
                                                        Choose File
                                                    </label>
                                                </div>
                                                {previews.vehicleImage && (
                                                    <img
                                                        src={previews.vehicleImage}
                                                        alt="Vehicle preview"
                                                        className="w-16 h-16 object-cover rounded"
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-gray-700 font-medium">Aadhar Card</label>
                                            <div className="flex items-center space-x-4">
                                                <div className="flex-1">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => handleFileChange(e, 'document1Image')}
                                                        className="hidden"
                                                        id="document1Image"
                                                        disabled={!isEditMode}
                                                    />
                                                    <label
                                                        htmlFor="document1Image"
                                                        className={`flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg ${
                                                            isEditMode ? 'cursor-pointer hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'
                                                        }`}
                                                    >
                                                        <UploadIcon className="w-5 h-5 mr-2" />
                                                        Choose File
                                                    </label>
                                                </div>
                                                {previews.document1Image && (
                                                    <img
                                                        src={previews.document1Image}
                                                        alt="Aadhaar preview"
                                                        className="w-16 h-16 object-cover rounded"
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="block text-gray-700 font-medium">Rc/Driving License</label>
                                            <div className="flex items-center space-x-4">
                                                <div className="flex-1">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => handleFileChange(e, 'document2Image')}
                                                        className="hidden"
                                                        id="document2Image"
                                                        disabled={!isEditMode}
                                                    />
                                                    <label
                                                        htmlFor="document2Image"
                                                        className={`flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg ${
                                                            isEditMode ? 'cursor-pointer hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'
                                                        }`}
                                                    >
                                                        <UploadIcon className="w-5 h-5 mr-2" />
                                                        Choose File
                                                    </label>
                                                </div>
                                                {previews.document2Image && (
                                                    <img
                                                        src={previews.document2Image}
                                                        alt="Document preview"
                                                        className="w-16 h-16 object-cover rounded"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Rental Details Column */}
                        <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h2 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">Rental Details</h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-gray-700 font-medium mb-2">Parking Type</label>
                                        <select 
                                            value={updatedVehicle.parkingType}
                                            onChange={(e) => setUpdatedVehicle({...updatedVehicle, parkingType: e.target.value})}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                            disabled={!isEditMode}
                                        >
                                            <option value="private">Private Parking</option>
                                            <option value="open">Open Parking</option>
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
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
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
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                                placeholder="Enter number of days"
                                                min="1"
                                                disabled={!isEditMode}
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <div className="flex justify-between items-center">
                                            <label className="block text-gray-700 font-medium mb-2">Rental Price (₹)</label>
                                            {updatedVehicle.rentalType === 'daily' && 
                                             updatedVehicle.numberOfDays && 
                                             updatedVehicle.rentPrice && (
                                                <span className="text-blue-700 font-medium">
                                                    Total: ₹{Number(updatedVehicle.numberOfDays) * Number(updatedVehicle.rentPrice)}
                                                </span>
                                            )}
                                        </div>
                                        <input 
                                            type="number"
                                            value={updatedVehicle.rentPrice}
                                            onChange={(e) => handleNumberInput(e, 'rentPrice')}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                            placeholder="Enter rental price"
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
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                                                placeholder="Enter advance amount"
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
                <div className="sticky bottom-0 p-6 bg-white border-t">
                    <div className="flex gap-4">
                        <button 
                            onClick={handleSave}
                            className="flex-1 flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
                            disabled={!isEditMode}
                        >
                            <SaveIcon className="w-5 h-5 mr-2" />
                            Save Changes
                        </button>
                        <button 
                            onClick={handleDelete}
                            className="flex-1 flex items-center justify-center bg-red-500 text-white py-3 rounded-lg hover:bg-red-600 transition-all disabled:opacity-50"
                            disabled={!isEditMode}
                        >
                            <Trash2Icon className="w-5 h-5 mr-2" />
                            End Contract
                        </button>
                    </div>
                </div>
            </div>

            {showDeleteConfirm && (
                <div 
                    className="fixed inset-0 z-[60] overflow-y-auto"
                    aria-labelledby="modal-title" 
                    role="dialog" 
                    aria-modal="true"
                >
                    <div className="flex items-center justify-center min-h-screen p-4">
                        {/* Backdrop with blur */}
                        <div 
                            className={`fixed inset-0 backdrop-blur-sm bg-black/30 ${modalAnimation.enter} ${
                                showDeleteConfirm ? 'bg-opacity-50' : 'bg-opacity-0'
                            }`} 
                            aria-hidden="true"
                        ></div>

                        {/* Modal */}
                        <div 
                            className={`relative bg-white rounded-lg max-w-sm w-full mx-4 ${modalAnimation.enter} ${
                                showDeleteConfirm ? modalAnimation.enterTo : modalAnimation.leaveTo
                            }`}
                        >
                            <div className="p-6">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">
                                    End Contract
                                </h3>
                                <p className="text-gray-600 mb-6">
                                    Are you sure you want to end the contract for this vehicle? This action cannot be undone.
                                </p>
                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmDelete}
                                        className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                    >
                                        End Contract
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VehicleEdit; 