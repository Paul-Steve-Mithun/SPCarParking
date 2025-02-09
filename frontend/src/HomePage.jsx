import { useEffect, useState } from 'react';
import { 
    Car, 
    MapPin, 
    Calendar, 
    Clock, 
    Users,
    ArrowUpRight,
    Activity,
    Wallet,
    X
} from 'lucide-react';

export function HomePage() {
    const [vehicles, setVehicles] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [filteredVehicles, setFilteredVehicles] = useState([]);

    useEffect(() => {
        fetch('https://spcarparkingbknd.onrender.com/vehicles')
            .then(res => res.json())
            .then(data => setVehicles(data));
    }, []);

    const stats = [
        {
            icon: <Activity className="w-6 h-6" />,
            label: 'Active Vehicles',
            value: vehicles.filter(v => v.status === 'active').length,
            filter: () => vehicles.filter(v => v.status === 'active'),
            color: 'from-blue-500 to-blue-600'
        },
        {
            icon: <Car className="w-6 h-6" />,
            label: 'Total Vehicles',
            value: vehicles.length,
            filter: () => vehicles,
            color: 'from-purple-500 to-purple-600'
        },
        {
            icon: <MapPin className="w-6 h-6" />,
            label: 'Private Parking',
            value: vehicles.filter(v => v.parkingType === 'private').length,
            filter: () => vehicles.filter(v => v.parkingType === 'private'),
            color: 'from-green-500 to-green-600'
        },
        {
            icon: <MapPin className="w-6 h-6" />,
            label: 'Open Parking',
            value: vehicles.filter(v => v.parkingType === 'open').length,
            filter: () => vehicles.filter(v => v.parkingType === 'open'),
            color: 'from-yellow-500 to-yellow-600'
        },
        {
            icon: <Calendar className="w-6 h-6" />,
            label: 'Monthly Rentals',
            value: vehicles.filter(v => v.rentalType === 'monthly').length,
            filter: () => vehicles.filter(v => v.rentalType === 'monthly'),
            color: 'from-pink-500 to-pink-600'
        },
        {
            icon: <Clock className="w-6 h-6" />,
            label: 'Daily Rentals',
            value: vehicles.filter(v => v.rentalType === 'daily').length,
            filter: () => vehicles.filter(v => v.rentalType === 'daily'),
            color: 'from-orange-500 to-orange-600'
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
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden relative">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">{selectedCategory}</h2>
                    <button 
                        onClick={() => setShowModal(false)}
                        className="text-white hover:text-gray-200 transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-6 overflow-auto max-h-[calc(80vh-80px)]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredVehicles.map((vehicle) => (
                            <div 
                                key={vehicle._id}
                                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-all duration-300"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-blue-50 rounded-lg">
                                            <Car className="w-5 h-5 text-blue-500" />
                                        </div>
                                        <h3 className="font-semibold text-gray-800">{vehicle.vehicleNumber}</h3>
                                    </div>
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                        vehicle.status === 'active' 
                                            ? 'bg-green-100 text-green-800' 
                                            : 'bg-red-100 text-red-800'
                                    }`}>
                                        {vehicle.status}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 mb-2">{vehicle.vehicleDescription}</p>
                                <div className="flex items-center justify-between text-sm text-gray-500">
                                    <span>{vehicle.parkingType}</span>
                                    <span>{vehicle.rentalType}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="mb-12">
                    <div className="relative">
                        {/* Background decoration */}
                        <div className="absolute -top-6 left-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl" />
                        <div className="absolute -top-4 left-20 w-16 h-16 bg-purple-500/10 rounded-full blur-xl" />
                        
                        {/* Title content */}
                        <div className="relative">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="h-1.5 w-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full" />
                                <span className="text-sm font-medium text-gray-500 uppercase tracking-wider">Parking Dashboard</span>
                            </div>
                            
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4">
                                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                                    Welcome to
                                </span>
                                <br />
                                <span className="mt-1 block">SP Car Parking</span>
                            </h1>
                            
                            <p className="text-gray-600 text-lg sm:text-xl max-w-1xl">
                                Monitor and manage your parking operations efficiently with our modern dashboard
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {stats.map((stat, index) => (
                        <div
                            key={index}
                            onClick={() => handleCardClick(stat)}
                            className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
                        >
                            <div className={`absolute inset-0 bg-gradient-to-r ${stat.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                            <div className="relative p-6">
                                <div className="flex items-center justify-between">
                                    <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.color} text-white`}>
                                        {stat.icon}
                                    </div>
                                    <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors duration-300" />
                                </div>
                                <div className="mt-4">
                                    <p className="text-sm font-medium text-gray-600 group-hover:text-white transition-colors duration-300">
                                        {stat.label}
                                    </p>
                                    <p className="text-3xl font-bold text-gray-900 group-hover:text-white transition-colors duration-300">
                                        {stat.value}
                                    </p>
                                </div>
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