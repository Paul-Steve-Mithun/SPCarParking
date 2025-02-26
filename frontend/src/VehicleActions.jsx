import { useState } from 'react';
import { CheckIcon, TrashIcon, XIcon, PlusCircleIcon, Wallet, CreditCard, IndianRupee, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

const VehicleActions = ({ vehicle, onClose, onRefresh }) => {
    const [loading, setLoading] = useState(false);
    const [showExtendForm, setShowExtendForm] = useState(false);
    const [additionalDays, setAdditionalDays] = useState('');
    const [transactionMode, setTransactionMode] = useState('Cash');
    const [customRentPrice, setCustomRentPrice] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmationType, setConfirmationType] = useState('');

    const handlePaidRent = async () => {
        setConfirmationType('monthly');
        setShowConfirmModal(true);
    };

    const handleExtendRental = async () => {
        if (!additionalDays || additionalDays <= 0) {
            toast.error("Please enter a valid number of days");
            return;
        }
        setConfirmationType('daily');
        setShowConfirmModal(true);
    };

    const handleConfirmedSubmit = async () => {
        setLoading(true);
        try {
            if (confirmationType === 'monthly') {
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
            } else {
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
            }
        } catch (error) {
            toast.error(confirmationType === 'monthly' ? "Failed to extend rental" : "Failed to extend rental");
        } finally {
            setLoading(false);
            setShowConfirmModal(false);
        }
    };

    return (
        <>
            <Transition appear show={true} as={Fragment}>
                <Dialog as="div" className="relative z-[60]" onClose={onClose}>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
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
                                <Dialog.Panel className="relative bg-white rounded-lg shadow-xl overflow-hidden w-96">
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
                                                    {!showExtendForm ? (
                                                        <button
                                                            onClick={() => setShowExtendForm(true)}
                                                            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                                                        >
                                                            <PlusCircleIcon className="w-5 h-5" />
                                                            <span className="font-medium">Extend Rental</span>
                                                        </button>
                                                    ) : (
                                                        <div className="space-y-3">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-sm font-medium text-gray-700">Extend Rental Period</span>
                                                                <button
                                                                    onClick={() => setShowExtendForm(false)}
                                                                    className="text-gray-500 hover:text-gray-700"
                                                                >
                                                                    <XIcon className="w-5 h-5" />
                                                                </button>
                                                            </div>
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
                                                                    Extend
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
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>

            {/* Confirmation Modal */}
            <Transition appear show={showConfirmModal} as={Fragment}>
                <Dialog 
                    as="div" 
                    className="relative z-[70]" 
                    onClose={() => setShowConfirmModal(false)}
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
                        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center">
                            <Transition.Child
                                as={Fragment}
                                enter="ease-out duration-300"
                                enterFrom="opacity-0 scale-95"
                                enterTo="opacity-100 scale-100"
                                leave="ease-in duration-200"
                                leaveFrom="opacity-100 scale-100"
                                leaveTo="opacity-0 scale-95"
                            >
                                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                    <div className="flex items-center justify-center mb-6">
                                        <div className="bg-red-100 rounded-full p-3">
                                            <AlertCircle className="h-6 w-6 text-red-600" />
                                        </div>
                                    </div>
                                    
                                    <Dialog.Title
                                        as="h3"
                                        className="text-lg font-bold text-center text-gray-900 mb-4"
                                    >
                                        Confirm Extension
                                    </Dialog.Title>

                                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                                        <div className="space-y-2">
                                            <p className="text-sm text-gray-600">
                                                <span className="font-medium">Vehicle:</span> {vehicle.vehicleNumber}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                <span className="font-medium">Description:</span> {vehicle.vehicleDescription}
                                            </p>
                                            {confirmationType === 'monthly' ? (
                                                <>
                                                    <p className="text-sm text-gray-600">
                                                        <span className="font-medium">Monthly Rent:</span> ₹{customRentPrice || vehicle.rentPrice}
                                                    </p>
                                                    <p className="text-sm text-gray-600">
                                                        <span className="font-medium">Payment Mode:</span> {transactionMode}
                                                    </p>
                                                </>
                                            ) : (
                                                <>
                                                    <p className="text-sm text-gray-600">
                                                        <span className="font-medium">Days to Extend:</span> {additionalDays}
                                                    </p>
                                                    <p className="text-sm text-gray-600">
                                                        <span className="font-medium">Amount:</span> ₹{vehicle.rentPrice * additionalDays}
                                                    </p>
                                                    <p className="text-sm text-gray-600">
                                                        <span className="font-medium">Payment Mode:</span> {transactionMode}
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row justify-end gap-3">
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                                            onClick={() => setShowConfirmModal(false)}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            className="inline-flex justify-center rounded-lg border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none"
                                            onClick={handleConfirmedSubmit}
                                            disabled={loading}
                                        >
                                            {loading ? 'Processing...' : 'Confirm & Pay'}
                                        </button>
                                    </div>
                                </Dialog.Panel>
                            </Transition.Child>
                        </div>
                    </div>
                </Dialog>
            </Transition>
        </>
    );
};

export default VehicleActions;