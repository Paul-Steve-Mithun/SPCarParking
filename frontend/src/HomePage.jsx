import { useEffect, useState } from 'react';
import { 
    TruckIcon, 
    CarIcon, 
    MapPinIcon, 
    CalendarIcon, 
    ClockIcon, 
    CarFrontIcon,
    XIcon
} from 'lucide-react';

export function HomePage() {
    const [vehicles, setVehicles] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [filteredVehicles, setFilteredVehicles] = useState([]);

    useEffect(() => {
        fetch('https://spcarparking.onrender.com/vehicles')
            .then(res => res.json())
            .then(data => setVehicles(data));
    }, []);

    const dashboardStats = [
        {
            icon: <CarFrontIcon className="w-8 h-8 text-blue-600" />, 
            label: 'Total Vehicles', 
            value: vehicles.length,
            filter: () => vehicles
        },
        {
            icon: <CarIcon className="w-8 h-8 text-green-600" />, 
            label: 'Private Lot', 
            value: vehicles.filter(v => v.parkingType === 'private').length,
            filter: () => vehicles.filter(v => v.parkingType === 'private')
        },
        {
            icon: <MapPinIcon className="w-8 h-8 text-purple-600" />, 
            label: 'Open Space', 
            value: vehicles.filter(v => v.parkingType === 'open').length,
            filter: () => vehicles.filter(v => v.parkingType === 'open')
        }
    ];

    const rentalStats = [
        {
            icon: <CalendarIcon className="w-8 h-8 text-orange-600" />, 
            label: 'Monthly Rentals', 
            value: vehicles.filter(v => v.rentalType === 'monthly').length,
            filter: () => vehicles.filter(v => v.rentalType === 'monthly')
        },
        {
            icon: <ClockIcon className="w-8 h-8 text-red-600" />, 
            label: 'Daily Rentals', 
            value: vehicles.filter(v => v.rentalType === 'daily').length,
            filter: () => vehicles.filter(v => v.rentalType === 'daily')
        }
    ];

    const handleCardClick = (stat) => {
        setSelectedCategory(stat.label);
        setFilteredVehicles(stat.filter());
        setShowModal(true);
    };

    const VehicleModal = () => (
        <div className="fixed inset-0 flex items-center justify-center z-50">
            <div 
                className="fixed inset-0 bg-black/30 backdrop-blur-sm"
                onClick={() => setShowModal(false)}
            />
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden relative">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">{selectedCategory}</h2>
                    <button 
                        onClick={() => setShowModal(false)}
                        className="text-white hover:text-gray-200 transition-colors"
                    >
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-6 overflow-auto max-h-[calc(80vh-80px)]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredVehicles.map((vehicle, index) => (
                            <div 
                                key={index}
                                className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all"
                            >
                                <div className="flex items-center space-x-3 mb-2">
                                    <CarFrontIcon className="w-6 h-6 text-blue-600" />
                                    <h3 className="font-semibold text-gray-800">{vehicle.vehicleNumber}</h3>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm text-gray-600">
                                        <span className="font-medium"></span> {vehicle.vehicleDescription}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        <span className="font-medium">PARKING :</span> {vehicle.parkingType.toUpperCase()}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        <span className="font-medium">RENTAL :</span> {vehicle.rentalType.toUpperCase()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6">
                <h1 className="text-3xl font-bold text-white">Parking Dashboard</h1>
            </div>
            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {dashboardStats.map((stat, index) => (
                        <div 
                            key={index} 
                            className="bg-gray-50 border border-gray-200 rounded-lg p-6 flex items-center space-x-4 hover:shadow-md transition-all cursor-pointer transform hover:-translate-y-1"
                            onClick={() => handleCardClick(stat)}
                        >
                            <div>{stat.icon}</div>
                            <div>
                                <p className="text-gray-500 text-sm">{stat.label}</p>
                                <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">Rental Types</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {rentalStats.map((stat, index) => (
                        <div 
                            key={index} 
                            className="bg-gray-50 border border-gray-200 rounded-lg p-6 flex items-center space-x-4 hover:shadow-md transition-all cursor-pointer transform hover:-translate-y-1"
                            onClick={() => handleCardClick(stat)}
                        >
                            <div>{stat.icon}</div>
                            <div>
                                <p className="text-gray-500 text-sm">{stat.label}</p>
                                <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {showModal && <VehicleModal />}
        </div>
    );
}

export default HomePage;