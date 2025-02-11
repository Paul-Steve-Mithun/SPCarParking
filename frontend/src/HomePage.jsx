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
    X,
    Bus,
    CarTaxiFront,
    Timer,
    TrendingUp,
    ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useSpring, animated } from 'react-spring';

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
            icon: <Car className="w-6 h-6" />,
            label: 'Total Vehicles',
            value: vehicles.length,
            filter: () => vehicles,
            color: 'from-purple-500 to-purple-600'
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
            icon: <Bus className="w-6 h-6" />,
            label: 'T-Board Vehicles',
            value: vehicles.filter(v => v.vehicleType === 'tboard').length,
            filter: () => vehicles.filter(v => v.vehicleType === 'tboard'),
            color: 'from-cyan-500 to-cyan-600'
        },
        {
            icon: <Activity className="w-6 h-6" />,
            label: 'Active Monthly Rentals',
            value: vehicles.filter(v => v.status === 'active' && v.rentalType === 'monthly').length,
            filter: () => vehicles.filter(v => v.status === 'active' && v.rentalType === 'monthly'),
            color: 'from-blue-500 to-blue-600'
        },
        {
            icon: <Activity className="w-6 h-6 rotate-180" />,
            label: 'Expired Monthly Rentals',
            value: vehicles.filter(v => v.status === 'inactive' && v.rentalType === 'monthly').length,
            filter: () => vehicles.filter(v => v.status === 'inactive' && v.rentalType === 'monthly'),
            color: 'from-red-500 to-red-600'
        },
        {
            icon: <Timer className="w-6 h-6" />,
            label: 'Daily Rentals Expiring Today',
            value: vehicles.filter(v => {
                const today = new Date();
                const endDate = new Date(v.endDate);
                return (
                    v.rentalType === 'daily' &&
                    endDate.getDate() === today.getDate() &&
                    endDate.getMonth() === today.getMonth() &&
                    endDate.getFullYear() === today.getFullYear()
                );
            }).length,
            filter: () => vehicles.filter(v => {
                const today = new Date();
                const endDate = new Date(v.endDate);
                return (
                    v.rentalType === 'daily' &&
                    endDate.getDate() === today.getDate() &&
                    endDate.getMonth() === today.getMonth() &&
                    endDate.getFullYear() === today.getFullYear()
                );
            }),
            color: 'from-amber-500 to-amber-600'
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
                                        <div className="px-3 py-1 bg-gray-100 rounded-full">
                                            <span className="text-sm font-medium text-gray-700">
                                                {vehicle.lotNumber || 'Open'}
                                            </span>
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
                                    <span>{vehicle.parkingType.charAt(0).toUpperCase() + vehicle.parkingType.slice(1)}</span>
                                    <span>{vehicle.rentalType.charAt(0).toUpperCase() + vehicle.rentalType.slice(1)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    const { number } = useSpring({
        from: { number: 0 },
        number: vehicles.length,
        delay: 200,
        config: { mass: 1, tension: 20, friction: 10 }
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-white shadow-sm">
                {/* Background Pattern */}
                <div className="absolute inset-0 z-0">
                    {/* Network Pattern */}
                    <div 
                        className="absolute inset-0" 
                        style={{ 
                            backgroundImage: `
                                radial-gradient(#4F46E5 2px, transparent 2px),
                                linear-gradient(to right, rgba(79, 70, 229, 0.15) 1px, transparent 1px),
                                linear-gradient(to bottom, rgba(79, 70, 229, 0.15) 1px, transparent 1px)
                            `,
                            backgroundSize: '40px 40px, 20px 20px, 20px 20px',
                            opacity: 0.1
                        }}
                    />

                    {/* Animated Particles */}
                    <div className="absolute inset-0">
                        {[...Array(40)].map((_, i) => (
                            <div
                                key={i}
                                className="absolute rounded-full bg-blue-500/50"
                                style={{
                                    width: Math.random() * 4 + 2 + 'px',
                                    height: Math.random() * 4 + 2 + 'px',
                                    left: Math.random() * 100 + '%',
                                    top: Math.random() * 100 + '%',
                                    animation: `float ${Math.random() * 15 + 15}s linear infinite`,
                                    animationDelay: `-${Math.random() * 15}s`
                                }}
                            />
                        ))}
                    </div>
                    
                    {/* Connection Lines */}
                    <div className="absolute inset-0">
                        {[...Array(25)].map((_, i) => (
                            <div
                                key={i}
                                className="absolute bg-blue-500/30"
                                style={{
                                    width: Math.random() * 300 + 150 + 'px',
                                    height: '1.5px',
                                    left: Math.random() * 100 + '%',
                                    top: Math.random() * 100 + '%',
                                    transform: `rotate(${Math.random() * 360}deg)`,
                                    animation: `pulse 4s ease-in-out infinite`,
                                    animationDelay: `-${Math.random() * 4}s`,
                                    boxShadow: '0 0 8px rgba(59, 130, 246, 0.3)'
                                }}
                            />
                        ))}
                    </div>
                    
                    {/* Simple Overlay */}
                    <div className="absolute inset-0 bg-white/50" />
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
                    <div className="relative z-10 text-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                        >
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold">
                                <motion.span 
                                    className="inline-block font-mono text-blue-600 font-black tracking-tight"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ 
                                        duration: 0.8,
                                        delay: 0.2
                                    }}
                                    style={{
                                        textShadow: '0 4px 12px rgba(37, 99, 235, 0.15)'
                                    }}
                                >
                                    <span className="inline-block hover:scale-105 transition-transform duration-300">S</span>
                                    <span className="inline-block hover:scale-105 transition-transform duration-300">P</span>
                                    <span className="inline-block mx-2"></span>
                                    <span className="inline-block hover:scale-105 transition-transform duration-300">C</span>
                                    <span className="inline-block hover:scale-105 transition-transform duration-300">A</span>
                                    <span className="inline-block hover:scale-105 transition-transform duration-300">R</span>
                                    <span className="inline-block mx-2"></span>
                                    <span className="inline-block hover:scale-105 transition-transform duration-300">P</span>
                                    <span className="inline-block hover:scale-105 transition-transform duration-300">A</span>
                                    <span className="inline-block hover:scale-105 transition-transform duration-300">R</span>
                                    <span className="inline-block hover:scale-105 transition-transform duration-300">K</span>
                                    <span className="inline-block hover:scale-105 transition-transform duration-300">I</span>
                                    <span className="inline-block hover:scale-105 transition-transform duration-300">N</span>
                                    <span className="inline-block hover:scale-105 transition-transform duration-300">G</span>
                                </motion.span>
                            </h1>
                            <motion.p 
                                className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                            >
                                Streamlined parking management system for efficient operations
                            </motion.p>
                        </motion.div>

                        {/* Animated Counter */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5, rotateX: -45 }}
                            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                            transition={{ 
                                duration: 0.8, 
                                delay: 0.3,
                                type: "spring",
                                stiffness: 100
                            }}
                            className="mt-12 perspective-1000"
                        >
                            <animated.div 
                                className="text-8xl font-black tracking-tight text-blue-600 font-mono"
                                style={{
                                    textShadow: '0 4px 12px rgba(37, 99, 235, 0.15)'
                                }}
                            >
                                {number.to(n => Math.floor(n))}
                            </animated.div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {stats.map((stat, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => handleCardClick(stat)}
                            className="group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-gray-50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.color} text-white shadow-lg`}>
                                        {stat.icon}
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors duration-300" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                    {stat.label}
                                </h3>
                                <div className="flex items-center justify-between">
                                    <p className="text-3xl font-bold text-gray-900">
                                        {stat.value}
                                    </p>
                                    <TrendingUp className="w-4 h-4 text-green-500" />
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {showModal && <VehicleModal />}
        </div>
    );
}

export default HomePage;

<style>
    {`
        @keyframes float {
            0% {
                transform: translate(0, 0);
            }
            33% {
                transform: translate(30px, -30px);
            }
            66% {
                transform: translate(-30px, 30px);
            }
            100% {
                transform: translate(0, 0);
            }
        }

        @keyframes pulse {
            0% {
                opacity: 0.1;
            }
            50% {
                opacity: 0.3;
            }
            100% {
                opacity: 0.1;
            }
        }

        @keyframes glow {
            0%, 100% {
                text-shadow: 0 0 10px rgba(37, 99, 235, 0.2),
                             0 0 20px rgba(37, 99, 235, 0.2),
                             0 0 30px rgba(37, 99, 235, 0.2);
            }
            50% {
                text-shadow: 0 0 20px rgba(37, 99, 235, 0.4),
                             0 0 30px rgba(37, 99, 235, 0.4),
                             0 0 40px rgba(37, 99, 235, 0.4);
            }
        }
    `}
</style>