import { useState, useEffect } from 'react';
import { PlusCircleIcon, SaveIcon, Upload, Wallet, CreditCard } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';

export function NewVehicle() {
    const [vehicle, setVehicle] = useState({
        vehicleNumber: '', 
        vehicleDescription: '', 
        lotNumber: '',
        ownerName: '', 
        contactNumber: '',
        parkingType: 'private', 
        rentalType: 'monthly', 
        rentPrice: '',
        numberOfDays: '', 
        advanceAmount: '5000',
        transactionMode: 'Cash' // Add default transaction mode
    });

    const [files, setFiles] = useState({
        vehicleImage: null,
        document1Image: null,
        document2Image: null
    });

    const [previews, setPreviews] = useState({
        vehicleImage: null,
        document1Image: null,
        document2Image: null
    });

    const [availableLots, setAvailableLots] = useState([]);
    const [selectedLotType, setSelectedLotType] = useState('regular'); // 'regular', 'a', 'b'

    // Generate all possible lots
    const generateAllLots = () => {
        const aLots = Array.from({ length: 11 }, (_, i) => `${i + 1}A`);
        const bLots = Array.from({ length: 20 }, (_, i) => `${i + 1}B`);
        const cLots = Array.from({ length: 21 }, (_, i) => `${i + 1}C`);
        return [...aLots, ...bLots, ...cLots];
    };

    const allLots = generateAllLots();

    // Fetch occupied lots from the database
    const fetchOccupiedLots = async () => {
        try {
            const response = await fetch('https://spcarparkingbknd.onrender.com/vehicles');
            const vehicles = await response.json();
            const occupiedLots = vehicles
                .filter(v => v.status === 'active')
                .map(v => v.lotNumber);
            
            // Calculate available lots
            const available = allLots.filter(lot => !occupiedLots.includes(lot));
            setAvailableLots(available);
        } catch (error) {
            console.error('Error fetching occupied lots:', error);
            toast.error('Error loading available lots');
        }
    };

    useEffect(() => {
        fetchOccupiedLots();
    }, []);

    // Filter lots based on selected type
    const getFilteredLots = () => {
        switch (selectedLotType) {
            case 'a':
                return availableLots.filter(lot => !lot.includes('B') && !lot.includes('C'));
            case 'b':
                return availableLots.filter(lot => lot.includes('B'));
            case 'c':
                return availableLots.filter(lot => lot.includes('C'));
            default:
                return availableLots;
        }
    };

    // Handle file selection
    const handleFileChange = (e, fieldName) => {
        const file = e.target.files[0];
        if (file) {
            // Update files state
            setFiles(prev => ({
                ...prev,
                [fieldName]: file
            }));

            // Create preview URL
            const previewUrl = URL.createObjectURL(file);
            setPreviews(prev => ({
                ...prev,
                [fieldName]: previewUrl
            }));
        }
    };

    // Clean up preview URLs when component unmounts
    useEffect(() => {
        return () => {
            Object.values(previews).forEach(url => {
                if (url) URL.revokeObjectURL(url);
            });
        };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            
            // Append vehicle data as JSON string
            formData.append('vehicleData', JSON.stringify(vehicle));

            
            
            // Append files if they exist
            if (files.vehicleImage) {
                formData.append('vehicleImage', files.vehicleImage);
            }
            if (files.document1Image) {
                formData.append('document1Image', files.document1Image);
            }
            if (files.document2Image) {
                formData.append('document2Image', files.document2Image);
            }

            const response = await fetch('https://spcarparkingbknd.onrender.com/addVehicle', {
                method: 'POST',
                body: formData
            });

            formData.append('vehicleData', JSON.stringify({
                ...vehicle,
                transactionMode: vehicle.transactionMode
            }));

            if (response.ok) {
                toast.success('Vehicle Added Successfully!');
                // Reset form
                setVehicle({
                    vehicleNumber: '', 
                    vehicleDescription: '', 
                    lotNumber: '',
                    ownerName: '', 
                    contactNumber: '',
                    parkingType: 'private', 
                    rentalType: 'monthly', 
                    rentPrice: '',
                    numberOfDays: '',
                    advanceAmount: '5000'
                });
                setFiles({
                    vehicleImage: null,
                    document1Image: null,
                    document2Image: null
                });
                setPreviews({
                    vehicleImage: null,
                    document1Image: null,
                    document2Image: null
                });
                fetchOccupiedLots();
            } else {
                toast.error('Failed to add vehicle');
            }
        } catch (error) {
            toast.error('Error submitting vehicle');
        }
    };

    const handleTextInput = (e, field) => {
        let value = e.target.value;
        if (field === 'vehicleNumber') {
            value = value.toUpperCase().replace(/\s+/g, '');
        }
        else if (['vehicleDescription', 'ownerName', 'lotNumber', 'contactNumber'].includes(field)) {
            value = value.toUpperCase();
        }
        setVehicle({...vehicle, [field]: value});
    };

    return (
        <div className="max-w-7xl mx-auto bg-white shadow-xl rounded-xl overflow-hidden">
            <Toaster position="top-right" />
            
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6">
                <h1 className="text-3xl font-bold text-white flex items-center">
                    <PlusCircleIcon className="mr-3 w-10 h-10" />
                    Add New Vehicle
                </h1>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6">
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
                                        placeholder="Enter vehicle number" 
                                        value={vehicle.vehicleNumber}
                                        onChange={(e) => handleTextInput(e, 'vehicleNumber')}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-700 font-medium mb-2">Vehicle Description</label>
                                    <input 
                                        type="text" 
                                        placeholder="Enter vehicle description" 
                                        value={vehicle.vehicleDescription}
                                        onChange={(e) => handleTextInput(e, 'vehicleDescription')}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>

                                <div>
                                <label className="block text-gray-700 font-medium mb-2">Lot Number</label>
                                <input 
                                    type="text" 
                                    placeholder="Select a lot number" 
                                    value={vehicle.lotNumber}
                                    onChange={(e) => handleTextInput(e, 'lotNumber')}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled
                                />
                
                {/* Lot Type Selector */}
                <div className="mt-2 mb-3">
                    <div className="flex space-x-4">
                        <button
                            type="button"
                            onClick={() => setSelectedLotType('a')}
                            className={`px-3 py-1 rounded-md ${
                                selectedLotType === 'a' 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-gray-100 text-gray-700'
                            }`}
                        >
                            A Wing (1A-11A)
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedLotType('b')}
                            className={`px-3 py-1 rounded-md ${
                                selectedLotType === 'b' 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-gray-100 text-gray-700'
                            }`}
                        >
                            B Wing (1B-20B)
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectedLotType('c')}
                            className={`px-3 py-1 rounded-md ${
                                selectedLotType === 'c' 
                                    ? 'bg-blue-600 text-white' 
                                    : 'bg-gray-100 text-gray-700'
                            }`}
                        >
                            C Wing (1C-21C)
                        </button>
                    </div>
                </div>

                {/* Available Lots Display */}
                <div className="mt-2">
                    <p className="text-sm text-gray-600 font-medium">Available Lots:</p>
                    <div className="flex flex-wrap gap-2 mt-1 max-h-40 overflow-y-auto">
                        {getFilteredLots().map((lot) => (
                            <button
                                key={lot}
                                type="button"
                                onClick={() => setVehicle({...vehicle, lotNumber: lot})}
                                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                            >
                                {lot}
                            </button>
                        ))}
                    </div>
                </div>
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
                                        placeholder="Enter owner name" 
                                        value={vehicle.ownerName}
                                        onChange={(e) => handleTextInput(e, 'ownerName')}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-gray-700 font-medium mb-2">Contact Number</label>
                                    <input 
                                        type="text" 
                                        placeholder="Enter contact number" 
                                        value={vehicle.contactNumber}
                                        onChange={(e) => handleTextInput(e, 'contactNumber')}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
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
                                            />
                                            <label
                                                htmlFor="vehicleImage"
                                                className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                                            >
                                                <Upload className="w-5 h-5 mr-2" />
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

                                {/* Document 1 Upload */}
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
                                            />
                                            <label
                                                htmlFor="document1Image"
                                                className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                                            >
                                                <Upload className="w-5 h-5 mr-2" />
                                                Choose File
                                            </label>
                                        </div>
                                        {previews.document1Image && (
                                            <img
                                                src={previews.document1Image}
                                                alt="Document 1 preview"
                                                className="w-16 h-16 object-cover rounded"
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* Document 2 Upload */}
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
                                            />
                                            <label
                                                htmlFor="document2Image"
                                                className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                                            >
                                                <Upload className="w-5 h-5 mr-2" />
                                                Choose File
                                            </label>
                                        </div>
                                        {previews.document2Image && (
                                            <img
                                                src={previews.document2Image}
                                                alt="Document 2 preview"
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
                                        value={vehicle.parkingType}
                                        onChange={(e) => setVehicle({...vehicle, parkingType: e.target.value})} 
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="private">Private Parking</option>
                                        <option value="open">Open Parking</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-gray-700 font-medium mb-2">Rental Type</label>
                                    <select 
                                        value={vehicle.rentalType}
                                        onChange={(e) => setVehicle({
                                            ...vehicle, 
                                            rentalType: e.target.value,
                                            advanceAmount: e.target.value === 'monthly' ? '5000' : '',
                                            numberOfDays: e.target.value === 'daily' ? '' : ''
                                        })} 
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="monthly">Monthly</option>
                                        <option value="daily">Daily</option>
                                    </select>
                                </div>

                                {vehicle.rentalType === 'daily' && (
                                    <div>
                                        <label className="block text-gray-700 font-medium mb-2">Number of Days</label>
                                        <input 
                                            type="number" 
                                            placeholder="Enter number of days"
                                            value={vehicle.numberOfDays}
                                            onChange={(e) => setVehicle({...vehicle, numberOfDays: e.target.value})} 
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                            min="1"
                                        />
                                    </div>
                                )}

                                <div>
                                    <div className="flex justify-between items-center">
                                        <label className="block text-gray-700 font-medium mb-2">Rental Price (₹)</label>
                                        {vehicle.rentalType === 'daily' && vehicle.numberOfDays && vehicle.rentPrice && (
                                            <span className="text-blue-700 font-medium">
                                                Total: ₹{Number(vehicle.numberOfDays) * Number(vehicle.rentPrice)}
                                            </span>
                                        )}
                                    </div>
                                    <input 
                                        type="number" 
                                        placeholder={vehicle.rentalType === 'monthly' ? 'Enter monthly rent - ₹2000/-' : 'Enter daily rent - ₹100/-'}
                                        value={vehicle.rentPrice}
                                        onChange={(e) => setVehicle({...vehicle, rentPrice: e.target.value})} 
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                        min="0"
                                    />
                                </div>

                                {vehicle.rentalType === 'monthly' && (
                                    <div>
                                        <label className="block text-gray-700 font-medium mb-2">Advance Amount (₹)</label>
                                        <input 
                                            type="number" 
                                            placeholder="Enter advance amount - ₹5000/-"
                                            value={vehicle.advanceAmount}
                                            onChange={(e) => setVehicle({...vehicle, advanceAmount: e.target.value})} 
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            min="0"
                                        />
                                    </div>
                                )}

                                <div className="mt-4">
                                    <label className="block text-gray-700 font-medium mb-2">Payment Mode</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setVehicle({...vehicle, transactionMode: 'Cash'})}
                                            className={`px-4 py-2 rounded-lg flex items-center justify-center ${
                                                vehicle.transactionMode === 'Cash'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-100 text-gray-700'
                                            }`}
                                        >
                                            <Wallet className="h-5 w-5 mr-2" />
                                            Cash
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setVehicle({...vehicle, transactionMode: 'UPI'})}
                                            className={`px-4 py-2 rounded-lg flex items-center justify-center ${
                                                vehicle.transactionMode === 'UPI'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-100 text-gray-700'
                                            }`}
                                        >
                                            <CreditCard className="h-5 w-5 mr-2" />
                                            UPI
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <div className="mt-8">
                    <button 
                        type="submit" 
                        className="w-full flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg hover:opacity-90 transition-all"
                    >
                        <SaveIcon className="mr-2" />
                        Submit Vehicle
                    </button>
                </div>
            </form>
        </div>
    );
}

export default NewVehicle;