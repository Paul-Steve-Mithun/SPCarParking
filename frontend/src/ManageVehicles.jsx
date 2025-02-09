import { useEffect, useState } from 'react';
import { RefreshCwIcon, SearchIcon } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import VehicleActions from './VehicleActions';

export function ManageVehicles() {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [activeTab, setActiveTab] = useState('monthly'); // For mobile view

    const fetchExpiredVehicles = async () => {
        setLoading(true);
        try {
            const response = await fetch('https://spcarparkingbknd.onrender.com/vehicles');
            const data = await response.json();
            const expiredVehicles = data.filter(vehicle => vehicle.status === 'inactive');
            setVehicles(expiredVehicles);
        } catch (error) {
            toast.error('Failed to fetch expired vehicles');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExpiredVehicles();
    }, []);

    const filteredMonthlyVehicles = vehicles.filter(vehicle => 
        vehicle.rentalType === 'monthly' && 
        (vehicle.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
         vehicle.ownerName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const filteredDailyVehicles = vehicles.filter(vehicle => 
        vehicle.rentalType === 'daily' && 
        (vehicle.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
         vehicle.ownerName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const renderVehicleCard = (vehicle) => (
        <div 
            key={vehicle._id} 
            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => setSelectedVehicle(vehicle)}
        >
            <div className="flex-grow space-y-2 sm:space-y-1">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <p className="font-semibold text-gray-800">{vehicle.vehicleNumber}</p>
                    <span className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600">
                        {vehicle.lotNumber || 'No Lot'}
                    </span>
                    <span className="px-2 py-1 bg-red-100 text-red-800 border-red-200 rounded-full text-xs font-medium border">
                        Expired
                    </span>
                </div>
                <p className="text-sm text-gray-500">{vehicle.vehicleDescription}</p>
                <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm text-gray-500">
                        {vehicle.rentalType === 'daily' 
                            ? `Daily - ₹${vehicle.rentPrice} for ${vehicle.numberOfDays} days`
                            : `Monthly - ₹${vehicle.rentPrice}`}
                    </p>
                    {vehicle.rentalType === 'daily' && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                            Total: ₹{vehicle.rentPrice * vehicle.numberOfDays}
                        </span>
                    )}
                </div>
                <p className="text-xs text-red-500">
                    Rental Period Ended: {new Date(vehicle.endDate).toLocaleDateString('en-GB')}
                </p>
            </div>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto bg-white shadow-xl rounded-xl overflow-hidden">
            <Toaster position="top-right" />
            
            <div className="bg-gradient-to-r from-red-500 to-orange-600 p-4 sm:p-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white">Expired Vehicles</h1>
                    <button 
                        onClick={fetchExpiredVehicles} 
                        className="text-white hover:bg-white/20 p-2 rounded-full transition-all"
                    >
                        <RefreshCwIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                </div>
            </div>

            <div className="p-4">
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="Search by vehicle number or owner name..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-3 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-sm sm:text-base"
                    />
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                </div>
            </div>

            {/* Mobile Tabs */}
            <div className="sm:hidden border-b">
                <div className="flex">
                    <button
                        className={`flex-1 py-3 text-sm font-medium border-b-2 ${
                            activeTab === 'monthly' 
                                ? 'border-red-500 text-red-600' 
                                : 'border-transparent text-gray-500'
                        }`}
                        onClick={() => setActiveTab('monthly')}
                    >
                        Monthly ({filteredMonthlyVehicles.length})
                    </button>
                    <button
                        className={`flex-1 py-3 text-sm font-medium border-b-2 ${
                            activeTab === 'daily' 
                                ? 'border-red-500 text-red-600' 
                                : 'border-transparent text-gray-500'
                        }`}
                        onClick={() => setActiveTab('daily')}
                    >
                        Daily ({filteredDailyVehicles.length})
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="p-6 text-center text-gray-500">Loading expired vehicles...</div>
            ) : (
                <>
                    {/* Mobile View */}
                    <div className="sm:hidden">
                        {activeTab === 'monthly' ? (
                            <div className="bg-white">
                                {filteredMonthlyVehicles.length === 0 ? (
                                    <div className="p-6 text-center text-gray-500">No expired vehicles</div>
                                ) : (
                                    <div className="divide-y divide-gray-200">
                                        {filteredMonthlyVehicles.map(renderVehicleCard)}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-white">
                                {filteredDailyVehicles.length === 0 ? (
                                    <div className="p-6 text-center text-gray-500">No expired vehicles</div>
                                ) : (
                                    <div className="divide-y divide-gray-200">
                                        {filteredDailyVehicles.map(renderVehicleCard)}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Desktop View */}
                    <div className="hidden sm:grid sm:grid-cols-2 gap-4 p-4">
                        <div className="bg-white shadow rounded-lg">
                            <h2 className="text-xl font-semibold p-4 border-b">Monthly</h2>
                            {filteredMonthlyVehicles.length === 0 ? (
                                <div className="p-6 text-center text-gray-500">No expired vehicles</div>
                            ) : (
                                <div className="divide-y divide-gray-200">
                                    {filteredMonthlyVehicles.map(renderVehicleCard)}
                                </div>
                            )}
                        </div>
                        <div className="bg-white shadow rounded-lg">
                            <h2 className="text-xl font-semibold p-4 border-b">Daily</h2>
                            {filteredDailyVehicles.length === 0 ? (
                                <div className="p-6 text-center text-gray-500">No expired vehicles</div>
                            ) : (
                                <div className="divide-y divide-gray-200">
                                    {filteredDailyVehicles.map(renderVehicleCard)}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}

            {selectedVehicle && (
                <VehicleActions 
                    vehicle={selectedVehicle} 
                    onClose={() => setSelectedVehicle(null)}
                    onRefresh={fetchExpiredVehicles}
                />
            )}
        </div>
    );
}

export default ManageVehicles;