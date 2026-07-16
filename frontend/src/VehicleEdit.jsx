import { useState, Fragment, useEffect } from 'react';
import { useTheme } from './contexts/ThemeContext';
import { XIcon, SaveIcon, Trash2Icon, PlusCircleIcon, PencilIcon, UploadIcon, Wallet, CreditCard, AlertCircle, Save, XCircle, CheckCircle, Car, User, Calendar, IndianRupee, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Dialog, Transition } from '@headlessui/react';

const modalAnimation = {
    enter: "transition-all duration-300 ease-out",
    enterFrom: "opacity-0 scale-95",
    enterTo: "opacity-100 scale-100",
    leave: "transition-all duration-200 ease-in",
    leaveFrom: "opacity-100 scale-100",
    leaveTo: "opacity-0 scale-95"
};

const VehicleEdit = ({ vehicle, onClose, onUpdate, onDelete }) => {
    const { isDarkMode } = useTheme();
    const [updatedVehicle, setUpdatedVehicle] = useState({
        ...vehicle,
        vehicleType: vehicle.vehicleType || 'own'
    });
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
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showEndContractModal, setShowEndContractModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [availableLots, setAvailableLots] = useState([]);
    const [selectedLotType, setSelectedLotType] = useState('all');

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

    const handleSaveChanges = async () => {
        try {
            setIsLoading(true);
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
        } finally {
            setIsLoading(false);
            setShowSaveModal(false);
        }
    };

    const handleDelete = async () => {
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        try {
            setIsLoading(true);
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
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setShowSaveModal(true);
    };

    const handleEndContract = () => {
        setShowEndContractModal(true);
    };

    const handleConfirmEndContract = () => {
        setShowEndContractModal(false);
        setShowDeleteConfirm(true);
    };

    const generateAllLots = () => {
        const aLots = Array.from({ length: 20 }, (_, i) => `A${i + 1}`);
        const bLots = Array.from({ length: 21 }, (_, i) => `B${i + 1}`);
        const cLots = Array.from({ length: 22 }, (_, i) => `C${i + 1}`);
        const dLots = Array.from({ length: 20 }, (_, i) => `D${i + 1}`);
        const eLots = Array.from({ length: 20 }, (_, i) => `E${i + 1}`);
        const oLots = Array.from({ length: 20 }, (_, i) => `O${i + 1}`); // O1-O20
        return [...aLots, ...bLots, ...cLots, ...dLots, ...eLots, ...oLots];
    };

    useEffect(() => {
        const fetchAvailableLots = async () => {
            try {
                const response = await fetch('https://spcarparkingbknd.onrender.com/vehicles');
                const vehicles = await response.json();
                const occupiedLots = vehicles
                    .filter(v => v._id !== vehicle._id) // Exclude current vehicle
                    .map(v => v.lotNumber);

                // Calculate available lots
                const allLots = generateAllLots();
                const available = allLots.filter(lot => !occupiedLots.includes(lot));

                // Include current vehicle's lot
                if (vehicle.lotNumber && !available.includes(vehicle.lotNumber)) {
                    available.push(vehicle.lotNumber);
                }

                setAvailableLots(available);
            } catch (error) {
                console.error('Error fetching lots:', error);
                toast.error('Error loading available lots');
            }
        };

        fetchAvailableLots();
    }, [vehicle._id, vehicle.lotNumber]);

    const getFilteredLots = () => {
        // Always include exactly one Open button
        const openButton = ['Open'];

        // Filter out any "Open" values from availableLots to prevent duplicates
        const filteredAvailableLots = availableLots.filter(lot => lot && lot !== 'Open');

        switch (selectedLotType) {
            case 'a':
                return [...openButton, ...filteredAvailableLots.filter(lot => lot.startsWith('A'))];
            case 'b':
                return [...openButton, ...filteredAvailableLots.filter(lot => lot.startsWith('B'))];
            case 'c':
                return [...openButton, ...filteredAvailableLots.filter(lot => lot.startsWith('C'))];
            case 'd':
                return [...openButton, ...filteredAvailableLots.filter(lot => lot.startsWith('D'))];
            case 'e':
                return [...openButton, ...filteredAvailableLots.filter(lot => lot.startsWith('E'))];
            case 'o':
                return [...openButton, ...filteredAvailableLots.filter(lot => lot.startsWith('O'))];
            default:
                return [...openButton, ...filteredAvailableLots]; // Show all non-empty lots
        }
    };

    return (
        <Dialog open={true} onClose={onClose} className="relative z-50">
            {/* Backdrop */}
            <div className={`fixed inset-0 ${isDarkMode ? 'bg-black/80' : 'bg-black/50'}`} aria-hidden="true" />
            
            <div className="fixed inset-0 flex items-center justify-center p-4 overflow-hidden">
                <Dialog.Panel className={`relative w-full max-w-7xl max-h-[95vh] rounded-xl shadow-lg flex flex-col overflow-hidden ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-600 p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0">
                        <h1 className="text-xl sm:text-3xl font-bold text-white text-center sm:text-left">Edit Vehicle Details</h1>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    if (isEditMode) {
                                        // Cancel edit - reset to original values
                                        setUpdatedVehicle({
                                            ...vehicle,
                                            vehicleType: vehicle.vehicleType || 'own'
                                        });
                                        setSelectedLotType('all');
                                    } else {
                                        // Enter edit mode
                                        setIsEditMode(true);
                                        setSelectedLotType('all');
                                    }
                                    setIsEditMode(!isEditMode);
                                }}
                                className="text-white hover:bg-white/20 px-3 sm:px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm sm:text-base"
                            >
                                <PencilIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                                <span>{isEditMode ? 'Cancel Edit' : 'Edit Details'}</span>
                            </button>
                            <button
                                onClick={onClose}
                                className="text-white hover:bg-white/20 p-2 rounded-lg transition-all"
                            >
                                <XIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Form Content */}
                <div className="flex-grow overflow-y-auto p-4 sm:p-6">
                    {/* Main Form Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                        {/* Vehicle Information Column */}
                        <div className="space-y-4">
                            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} p-4 rounded-lg`}>
                                <h2 className={`text-lg sm:text-xl font-semibold border-b pb-2 mb-4 ${isDarkMode ? 'text-gray-100 border-gray-700' : 'text-gray-800 border-gray-200'}`}>Vehicle Information</h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className={`block font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Vehicle Number</label>
                                        <input
                                            type="text"
                                            value={updatedVehicle.vehicleNumber}
                                            onChange={(e) => handleTextInput(e, 'vehicleNumber')}
                                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-100 placeholder-gray-400' : 'border-gray-300 text-gray-900 placeholder-gray-500'} ${!isEditMode ? (isDarkMode ? 'bg-gray-900' : 'bg-gray-100') : ''}`}
                                            disabled={!isEditMode}
                                        />
                                    </div>
                                    <div>
                                        <label className={`block font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Vehicle Description</label>
                                        <input
                                            type="text"
                                            value={updatedVehicle.vehicleDescription}
                                            onChange={(e) => handleTextInput(e, 'vehicleDescription')}
                                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-100 placeholder-gray-400' : 'border-gray-300 text-gray-900 placeholder-gray-500'} ${!isEditMode ? (isDarkMode ? 'bg-gray-900' : 'bg-gray-100') : ''}`}
                                            disabled={!isEditMode}
                                        />
                                    </div>
                                    <div>
                                        <label className={`block font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Vehicle Board Type</label>
                                        <div className="grid grid-cols-2 gap-4">
                                            <button
                                                type="button"
                                                onClick={() => isEditMode && setUpdatedVehicle({ ...updatedVehicle, vehicleType: 'own' })}
                                                className={`relative px-4 py-2 rounded-lg flex items-center justify-center transition-all duration-200 ${updatedVehicle.vehicleType === 'own' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/50 transform scale-[1.02]' : isDarkMode ? 'bg-gray-900 text-gray-300 hover:bg-gray-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} ${!isEditMode && 'opacity-50 cursor-not-allowed'}`}
                                                disabled={!isEditMode}
                                            >
                                                Own Board
                                                {updatedVehicle.vehicleType === 'own' && (
                                                    <span className="absolute -right-1 -top-1 w-3 h-3 bg-green-500 rounded-full"></span>
                                                )}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => isEditMode && setUpdatedVehicle({ ...updatedVehicle, vehicleType: 'tboard' })}
                                                className={`relative px-4 py-2 rounded-lg flex items-center justify-center transition-all duration-200 ${updatedVehicle.vehicleType === 'tboard' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/50 transform scale-[1.02]' : isDarkMode ? 'bg-gray-900 text-gray-300 hover:bg-gray-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} ${!isEditMode && 'opacity-50 cursor-not-allowed'}`}
                                                disabled={!isEditMode}
                                            >
                                                T Board
                                                {updatedVehicle.vehicleType === 'tboard' && (
                                                    <span className="absolute -right-1 -top-1 w-3 h-3 bg-green-500 rounded-full"></span>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={`block font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Lot Number</label>
                                        <input
                                            type="text"
                                            value={
                                                updatedVehicle.lotNumber
                                                    ? updatedVehicle.lotNumber
                                                    : updatedVehicle.parkingType === 'open' ? 'Open' : ''
                                            }
                                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-100 placeholder-gray-400' : 'border-gray-300 text-gray-900 placeholder-gray-500'} ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}
                                            disabled={true}
                                        />

                                        {isEditMode && (
                                            <>
                                                {/* Lot Type Selector */}
                                                <div className="mt-2 mb-3">
                                                    <div className="flex flex-wrap gap-2 sm:gap-4">
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedLotType('a')}
                                                            className={`px-3 py-2 min-w-[110px] rounded-md text-sm sm:text-base transition-all ${selectedLotType === 'a'
                                                                ? 'bg-blue-600 text-white'
                                                                : isDarkMode
                                                                    ? 'bg-gray-600 text-gray-300'
                                                                    : 'bg-gray-100 text-gray-700'
                                                                }`}
                                                        >
                                                            A Wing (A1-A20)
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedLotType('b')}
                                                            className={`px-3 py-2 min-w-[110px] rounded-md text-sm sm:text-base transition-all ${selectedLotType === 'b'
                                                                ? 'bg-blue-600 text-white'
                                                                : isDarkMode
                                                                    ? 'bg-gray-600 text-gray-300'
                                                                    : 'bg-gray-100 text-gray-700'
                                                                }`}
                                                        >
                                                            B Wing (B1-B21)
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedLotType('c')}
                                                            className={`px-3 py-2 min-w-[110px] rounded-md text-sm sm:text-base transition-all ${selectedLotType === 'c'
                                                                ? 'bg-blue-600 text-white'
                                                                : isDarkMode
                                                                    ? 'bg-gray-600 text-gray-300'
                                                                    : 'bg-gray-100 text-gray-700'
                                                                }`}
                                                        >
                                                            C Wing (C1-C22)
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedLotType('d')}
                                                            className={`px-3 py-2 min-w-[110px] rounded-md text-sm sm:text-base transition-all ${selectedLotType === 'd'
                                                                ? 'bg-blue-600 text-white'
                                                                : isDarkMode
                                                                    ? 'bg-gray-600 text-gray-300'
                                                                    : 'bg-gray-100 text-gray-700'
                                                                }`}
                                                        >
                                                            D Wing (D1-D20)
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedLotType('e')}
                                                            className={`px-3 py-2 min-w-[110px] rounded-md text-sm sm:text-base transition-all ${selectedLotType === 'e'
                                                                ? 'bg-blue-600 text-white'
                                                                : isDarkMode
                                                                    ? 'bg-gray-600 text-gray-300'
                                                                    : 'bg-gray-100 text-gray-700'
                                                                }`}
                                                        >
                                                            E Wing (E1-E20)
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedLotType('o')}
                                                            className={`px-3 py-2 min-w-[110px] rounded-md text-sm sm:text-base transition-all ${selectedLotType === 'o'
                                                                ? 'bg-blue-600 text-white'
                                                                : isDarkMode
                                                                    ? 'bg-gray-600 text-gray-300'
                                                                    : 'bg-gray-100 text-gray-700'
                                                                }`}
                                                        >
                                                            O Wing (O1-O20)
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Available Lots Display */}
                                                <div className="mt-2">
                                                    <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Available Lots:</p>
                                                    <div className="flex flex-wrap gap-2 mt-1 max-h-40 overflow-y-auto">
                                                        {getFilteredLots().map((lot) => (
                                                            <button
                                                                key={lot}
                                                                type="button"
                                                                onClick={() => {
                                                                    if (lot === 'Open') {
                                                                        setUpdatedVehicle({
                                                                            ...updatedVehicle,
                                                                            lotNumber: '',
                                                                            parkingType: 'open'
                                                                        });
                                                                    } else {
                                                                        setUpdatedVehicle({
                                                                            ...updatedVehicle,
                                                                            lotNumber: lot,
                                                                            parkingType: lot.startsWith('O') ? 'open' : 'private'
                                                                        });
                                                                    }
                                                                }}
                                                                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                                                                    lot === 'Open'
                                                                        ? updatedVehicle.parkingType === 'open' && !updatedVehicle.lotNumber
                                                                            ? 'bg-green-600 text-white'
                                                                            : isDarkMode ? 'bg-green-900 text-green-300 hover:bg-green-800' : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                                        : lot.startsWith('O')
                                                                            ? updatedVehicle.lotNumber === lot
                                                                                ? 'bg-green-600 text-white'
                                                                                : isDarkMode ? 'bg-green-900/30 text-green-300 hover:bg-green-800' : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                                            : updatedVehicle.lotNumber === lot
                                                                                ? 'bg-blue-600 text-white'
                                                                                : isDarkMode ? 'bg-blue-900 text-blue-300 hover:bg-blue-800' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                                                }`}
                                                            >
                                                                {lot}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Owner Details Column */}
                        <div className="space-y-4">
                            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} p-4 rounded-lg`}>
                                <h2 className={`text-lg sm:text-xl font-semibold border-b pb-2 mb-4 ${isDarkMode ? 'text-gray-100 border-gray-700' : 'text-gray-800 border-gray-200'}`}>Owner Details</h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className={`block font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Owner Name</label>
                                        <input
                                            type="text"
                                            value={updatedVehicle.ownerName}
                                            onChange={(e) => handleTextInput(e, 'ownerName')}
                                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-100 placeholder-gray-400' : 'border-gray-300 text-gray-900 placeholder-gray-500'} ${!isEditMode ? (isDarkMode ? 'bg-gray-900' : 'bg-gray-100') : ''}`}
                                            disabled={!isEditMode}
                                        />
                                    </div>
                                    <div>
                                        <label className={`block font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Contact Number</label>
                                        <input
                                            type="text"
                                            value={updatedVehicle.contactNumber}
                                            onChange={(e) => handleTextInput(e, 'contactNumber')}
                                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-100 placeholder-gray-400' : 'border-gray-300 text-gray-900 placeholder-gray-500'} ${!isEditMode ? (isDarkMode ? 'bg-gray-900' : 'bg-gray-100') : ''}`}
                                            disabled={!isEditMode}
                                        />
                                    </div>

                                    {/* Document Upload Section */}
                                    <div className="mt-6 space-y-4">
                                        <h3 className={`text-xl font-semibold border-b pb-2 mb-4 ${isDarkMode ? 'text-gray-100 border-gray-700' : 'text-gray-800 border-gray-200'}`}>Document Upload</h3>

                                        {/* Vehicle Image Upload */}
                                        <div className="space-y-2">
                                            <label className={`block font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Vehicle Photo</label>
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
                                                        className={`flex items-center justify-center px-4 py-2 border rounded-lg ${isEditMode ? (isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-300 cursor-pointer hover:bg-gray-800' : 'border-gray-300 text-gray-700 cursor-pointer hover:bg-gray-50') : (isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-300 opacity-70' : 'bg-gray-100 border-gray-300 text-gray-400 opacity-50')} ${!isEditMode ? 'cursor-not-allowed' : ''}`}
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
                                            <label className={`block font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Aadhar Card</label>
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
                                                        className={`flex items-center justify-center px-4 py-2 border rounded-lg ${isEditMode ? (isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-300 cursor-pointer hover:bg-gray-800' : 'border-gray-300 text-gray-700 cursor-pointer hover:bg-gray-50') : (isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-300 opacity-70' : 'bg-gray-100 border-gray-300 text-gray-400 opacity-50')} ${!isEditMode ? 'cursor-not-allowed' : ''}`}
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
                                            <label className={`block font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Rc/Driving License</label>
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
                                                        className={`flex items-center justify-center px-4 py-2 border rounded-lg ${isEditMode ? (isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-300 cursor-pointer hover:bg-gray-800' : 'border-gray-300 text-gray-700 cursor-pointer hover:bg-gray-50') : (isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-300 opacity-70' : 'bg-gray-100 border-gray-300 text-gray-400 opacity-50')} ${!isEditMode ? 'cursor-not-allowed' : ''}`}
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
                            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'} p-4 rounded-lg`}>
                                <h2 className={`text-lg sm:text-xl font-semibold border-b pb-2 mb-4 ${isDarkMode ? 'text-gray-100 border-gray-700' : 'text-gray-800 border-gray-200'}`}>Rental Details</h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className={`block font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Parking Type</label>
                                        <select
                                            value={updatedVehicle.parkingType}
                                            onChange={(e) => setUpdatedVehicle({ ...updatedVehicle, parkingType: e.target.value })}
                                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-100' : 'border-gray-300 text-gray-900'} ${!isEditMode ? (isDarkMode ? 'bg-gray-900' : 'bg-gray-100') : ''}`}
                                            disabled={!isEditMode}
                                        >
                                            <option value="private">Private Parking</option>
                                            <option value="open">Open Parking</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className={`block font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Rental Type</label>
                                        <select
                                            value={updatedVehicle.rentalType}
                                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 ${isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-100' : 'border-gray-300 text-gray-900'}`}
                                            disabled={true}
                                        >
                                            <option value="monthly">Monthly</option>
                                            <option value="daily">Daily</option>
                                        </select>
                                    </div>

                                    {updatedVehicle.rentalType === 'daily' && (
                                        <div>
                                            <label className={`block font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Number of Days</label>
                                            <input
                                                type="number"
                                                value={updatedVehicle.numberOfDays}
                                                onChange={(e) => handleNumberInput(e, 'numberOfDays')}
                                                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-100' : 'border-gray-300 text-gray-900'} ${!isEditMode ? (isDarkMode ? 'bg-gray-900' : 'bg-gray-100') : ''}`}
                                                placeholder="Enter number of days"
                                                min="1"
                                                disabled={true}
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <div className="flex justify-between items-center">
                                            <label className={`block font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Rental Price (₹)</label>
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
                                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-100' : 'border-gray-300 text-gray-900'} ${!isEditMode ? (isDarkMode ? 'bg-gray-900' : 'bg-gray-100') : ''}`}
                                            placeholder="Enter rental price"
                                            min="0"
                                            disabled={!isEditMode}
                                        />
                                    </div>

                                    {updatedVehicle.rentalType === 'monthly' && (
                                        <div>
                                            <label className={`block font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Advance Amount (₹)</label>
                                            <input
                                                type="number"
                                                value={updatedVehicle.advanceAmount}
                                                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 ${isDarkMode ? 'bg-gray-900 border-gray-700 text-gray-100' : 'border-gray-300 text-gray-900'}`}
                                                disabled={true}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className={`sticky bottom-0 p-4 sm:p-6 border-t ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={handleSubmit}
                            className="flex-1 flex items-center justify-center bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2.5 sm:py-3 rounded-lg hover:opacity-90 transition-all disabled:opacity-50 text-sm sm:text-base"
                            disabled={!isEditMode || isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                            )}
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                            onClick={handleEndContract}
                            className="flex-1 flex items-center justify-center bg-red-500 text-white py-2.5 sm:py-3 rounded-lg hover:bg-red-600 transition-all disabled:opacity-50 text-sm sm:text-base"
                            disabled={!isEditMode || isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                            ) : (
                                <Trash2Icon className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                            )}
                            {isLoading ? 'Processing...' : 'End Contract'}
                        </button>
                    </div>
                </div>
                </Dialog.Panel>

            {/* Final Red Warning Modal */}
            <Transition appear show={showDeleteConfirm} as={Fragment}>
                <Dialog
                    as="div"
                    className="relative z-[60]"
                    onClose={() => setShowDeleteConfirm(false)}
                >
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className={`fixed inset-0 backdrop-blur-md ${isDarkMode ? 'bg-black/90' : 'bg-gray-900/80'}`} />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95 translate-y-4"
                                enterTo="opacity-100 scale-100 translate-y-0"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100 translate-y-0"
                                leaveTo="opacity-0 scale-95 translate-y-4"
                            >
                                <Dialog.Panel className={`w-full max-w-md transform overflow-hidden rounded-2xl p-6 shadow-2xl transition-all border border-red-500/20 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                                    <div className="flex flex-col items-center text-center">
                                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 mb-6 shadow-inner">
                                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 animate-pulse">
                                                <AlertCircle className="h-8 w-8 text-white" />
                                            </div>
                                        </div>
                                        <Dialog.Title as="h3" className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                                            Warning: Irreversible Action
                                        </Dialog.Title>
                                        <div className={`mt-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                            <p className="mb-2">
                                                You are about to permanently end the contract for <strong className={isDarkMode ? 'text-white' : 'text-black'}>{vehicle.vehicleNumber} - {vehicle.vehicleDescription}</strong>.
                                            </p>
                                            <div className={`mt-4 p-4 rounded-lg text-sm border-l-4 border-red-500 text-left ${isDarkMode ? 'bg-red-900/20 text-red-200' : 'bg-red-50 text-red-800'}`}>
                                                <ul className="list-disc pl-4 space-y-1">
                                                    <li>All vehicle data will be deleted</li>
                                                    <li>Advance will be refunded (if applicable)</li>
                                                    <li>This action cannot be undone</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8 flex flex-col-reverse sm:flex-row justify-center gap-3 w-full">
                                        <button
                                            type="button"
                                            onClick={() => setShowDeleteConfirm(false)}
                                            className={`inline-flex justify-center w-full sm:w-1/2 rounded-xl border px-4 py-3 text-sm font-bold focus:outline-none transition-all ${isDarkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-700 hover:bg-gray-100'}`}
                                            disabled={isLoading}
                                        >
                                            Go Back
                                        </button>
                                        <button
                                            type="button"
                                            onClick={confirmDelete}
                                            className="inline-flex items-center justify-center w-full sm:w-1/2 rounded-xl border border-transparent px-4 py-3 text-sm font-bold focus:outline-none transition-all disabled:opacity-50 bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/30 hover:shadow-red-500/50"
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                                    Deleting...
                                                </>
                                            ) : (
                                                <>
                                                    <Trash2Icon className="w-5 h-5 mr-2" />
                                                    Delete Permanently
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* Save Changes Confirmation Modal */}
            <Transition appear show={showSaveModal} as={Fragment}>
                <Dialog
                    as="div"
                    className="relative z-50"
                    onClose={() => setShowSaveModal(false)}
                >
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className={`fixed inset-0 backdrop-blur-sm ${isDarkMode ? 'bg-black/80' : 'bg-black/30'}`} />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className={`w-full max-w-md transform overflow-hidden rounded-2xl p-6 shadow-xl transition-all ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                                    <div className="text-center">
                                        <Save className="mx-auto h-12 w-12 text-blue-500 mb-4" />
                                        <Dialog.Title as="h3" className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                                            Save Changes
                                        </Dialog.Title>
                                        <div className={`mt-4 p-4 rounded-lg space-y-3 ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                                            <div className="flex items-center gap-2">
                                                <Car className="w-5 h-5 text-blue-600" />
                                                <p className={`text-sm text-left ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                    Vehicle: {vehicle.vehicleNumber} - {vehicle.vehicleDescription}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <User className="w-5 h-5 text-blue-600" />
                                                <p className={`text-sm text-left ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                                    Owner: {vehicle.ownerName}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 flex justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowSaveModal(false)}
                                            className={`inline-flex justify-center rounded-md border px-4 py-2 text-sm font-medium focus:outline-none ${isDarkMode ? 'border-gray-700 text-gray-300 hover:bg-gray-900' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                            disabled={isLoading}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSaveChanges}
                                            className={`inline-flex items-center justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium focus:outline-none disabled:opacity-50 ${isDarkMode ? 'bg-green-700 text-white hover:bg-green-800' : 'bg-green-600 text-white hover:bg-green-700'}`}
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle className="w-4 h-4 mr-2" />
                                                    Confirm Save
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* End Contract Confirmation Modal */}
            <Transition appear show={showEndContractModal} as={Fragment}>
                <Dialog
                    as="div"
                    className="relative z-[60]"
                    onClose={() => setShowEndContractModal(false)}
                >
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className={`fixed inset-0 backdrop-blur-sm ${isDarkMode ? 'bg-black/80' : 'bg-black/30'}`} />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className={`w-full max-w-md transform overflow-hidden rounded-2xl p-6 shadow-xl transition-all ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                                    <div className="text-center">
                                        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${isDarkMode ? 'bg-orange-900/30' : 'bg-orange-100'} mb-4`}>
                                            <AlertCircle className={`h-8 w-8 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} />
                                        </div>
                                        <Dialog.Title as="h3" className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                                            Contract Summary
                                        </Dialog.Title>
                                        <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                            Please review the vehicle details before proceeding.
                                        </p>
                                        
                                        <div className={`mt-4 p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'} text-left`}>
                                            <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                                                {/* Vehicle Image */}
                                                <div className="flex-shrink-0">
                                                    {vehicle.vehicleImage?.url ? (
                                                        <img 
                                                            src={vehicle.vehicleImage.url} 
                                                            alt="Vehicle" 
                                                            className="w-24 h-24 sm:w-20 sm:h-20 object-cover rounded-lg shadow-sm border border-gray-200"
                                                        />
                                                    ) : (
                                                        <div className={`w-24 h-24 sm:w-20 sm:h-20 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                                            <Car className={`w-8 h-8 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {/* Details */}
                                                <div className="flex-grow space-y-2 w-full">
                                                    <div className="flex items-start gap-2">
                                                        <Car className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                                                        <div className="flex flex-col">
                                                            <span className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Vehicle</span>
                                                            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                                                                {vehicle.vehicleNumber} <span className="opacity-70 font-normal">({vehicle.vehicleDescription})</span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start gap-2">
                                                        <User className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                                                        <div className="flex flex-col">
                                                            <span className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Owner</span>
                                                            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{vehicle.ownerName}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-start gap-2">
                                                        <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                        </svg>
                                                        <div className="flex flex-col">
                                                            <span className={`text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>Lot Number</span>
                                                            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{vehicle.lotNumber || 'Open Parking'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowEndContractModal(false)}
                                            className={`inline-flex justify-center w-full sm:w-auto rounded-lg border px-4 py-2.5 text-sm font-medium focus:outline-none transition-colors ${isDarkMode ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                                            disabled={isLoading}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleConfirmEndContract}
                                            className="inline-flex items-center justify-center w-full sm:w-auto rounded-lg border border-transparent px-4 py-2.5 text-sm font-medium focus:outline-none transition-colors disabled:opacity-50 bg-orange-600 text-white hover:bg-orange-700 shadow-sm"
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Proceeding...
                                                </>
                                            ) : (
                                                <>
                                                    Proceed to End Contract
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
            </div>
        </Dialog>
    );
};

export default VehicleEdit;