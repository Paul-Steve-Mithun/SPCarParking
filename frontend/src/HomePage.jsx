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

export function HomePage({ isAuthenticated, onAuthentication }) {
    const [vehicles, setVehicles] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [filteredVehicles, setFilteredVehicles] = useState([]);
    const [loginError, setLoginError] = useState('');

    useEffect(() => {
        fetch('https://spcarparkingbknd.onrender.com/vehicles')
            .then(res => res.json())
            .then(data => setVehicles(data));
    }, []);

    useEffect(() => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }, []);

    const sortByLotNumber = (vehicles) => {
        return [...vehicles].sort((a, b) => {
            const getLotParts = (lot) => {
                if (!lot) return { letter: 'Z', number: Infinity };
                const letter = lot.charAt(0);
                const number = parseInt(lot.slice(1)) || 0;
                return { letter, number };
            };

            const lotA = getLotParts(a.lotNumber);
            const lotB = getLotParts(b.lotNumber);

            if (lotA.letter !== lotB.letter) {
                return lotA.letter.localeCompare(lotB.letter);
            }

            return lotA.number - lotB.number;
        });
    };

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
        const filteredVehicles = stat.filter();
        const sortedVehicles = sortByLotNumber(filteredVehicles);
        setFilteredVehicles(sortedVehicles);
        setShowModal(true);
    };

    const VehicleModal = () => {
        // Add due amount calculation function
        const calculateDueAmount = (vehicle) => {
            if (vehicle.rentalType === 'daily' && vehicle.status === 'inactive') {
                const startDate = new Date(vehicle.endDate);
                startDate.setDate(startDate.getDate() + 1);
                startDate.setHours(0, 0, 0, 0);
                
                const endDate = new Date();
                endDate.setHours(0, 0, 0, 0);

                const diffTime = endDate.getTime() - startDate.getTime();
                const numberOfDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
                
                return vehicle.rentPrice * numberOfDays;
            }
            return 0;
        };

        return (
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
                            {filteredVehicles.map(vehicle => {
                                const dueAmount = calculateDueAmount(vehicle);
                                
                                return (
                                    <div key={vehicle._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                                        <div className="p-4 bg-gray-50 border-b border-gray-200">
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="font-semibold text-gray-900 truncate">
                                                            {vehicle.vehicleNumber}
                                                        </h3>
                                                        <p className="text-sm text-gray-500 truncate">
                                                            {vehicle.vehicleDescription || 'No description'}
                                                        </p>
                                                    </div>
                                                    <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                                                        vehicle.rentalType === 'daily' && vehicle.status === 'inactive'
                                                            ? 'bg-red-100 text-red-800 border border-red-200'
                                                            : vehicle.status === 'active'
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-red-100 text-red-800'
                                                    }`}>
                                                        {vehicle.rentalType === 'daily' && vehicle.status === 'inactive' 
                                                            ? <span className="font-bold">Due: ₹{dueAmount}</span>
                                                            : vehicle.status === 'active' 
                                                                ? 'Active' 
                                                                : 'Expired'
                                                        }
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-4 space-y-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-500">Lot Number:</span>
                                                <span className="font-medium text-gray-900">{vehicle.lotNumber || 'Open'}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-500">Type:</span>
                                                <span className="font-medium text-gray-900 capitalize">{vehicle.rentalType}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-500">Rent:</span>
                                                <span className="font-medium text-gray-900">
                                                    {vehicle.rentalType === 'daily' ? (
                                                        <>
                                                            ₹{vehicle.rentPrice * vehicle.numberOfDays}
                                                            <span className="text-gray-500">
                                                                {' '}({vehicle.numberOfDays} days)
                                                            </span>
                                                        </>
                                                    ) : (
                                                        `₹${vehicle.rentPrice}`
                                                    )}
                                                </span>
                                            </div>
                                            {vehicle.endDate && (
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-gray-500">End Date:</span>
                                                    <span className="font-medium text-gray-900">
                                                        {formatDate(vehicle.endDate)}
                                                    </span>
                                                </div>
                                            )}
                                            {vehicle.ownerName && (
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-gray-500">Owner:</span>
                                                    <span className="font-medium text-gray-900 truncate max-w-[60%]">
                                                        MR. {vehicle.ownerName}
                                                    </span>
                                                </div>
                                            )}
                                            {vehicle.contactNumber && (
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-gray-500">Contact:</span>
                                                    <a 
                                                        href={`tel:${vehicle.contactNumber}`}
                                                        className="font-medium text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                                                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" 
                                                            />
                                                        </svg>
                                                        {vehicle.contactNumber}
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const { number } = useSpring({
        from: { number: 0 },
        number: vehicles.length,
        delay: 200,
        config: { mass: 1, tension: 20, friction: 10 }
    });

    const LoginSection = () => {
        const [credentials, setCredentials] = useState({
            username: '',
            password: ''
        });

        const handleLogin = (e) => {
            e.preventDefault();
            const validUsername = import.meta.env.VITE_ADMIN_USERNAME;
            const validPassword = import.meta.env.VITE_ADMIN_PASSWORD;

            if (credentials.username === validUsername && credentials.password === validPassword) {
                localStorage.setItem('spcarparking_auth', 'true');
                onAuthentication(true);
                setLoginError('');
            } else {
                setLoginError('Invalid credentials');
            }
        };

        return (
            <div id="loginSection" className="max-w-6xl mx-auto mt-12 px-4">
                <div className="flex flex-col bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden">
                    {/* Welcome Section - Visible on both mobile and desktop */}
                    <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 p-8 md:p-12 relative">
                        <div className="absolute inset-0">
                            {/* Animated background elements */}
                            {[...Array(8)].map((_, i) => (
                                <div
                                    key={i}
                                    className="absolute bg-white/10 rounded-full blur-2xl animate-pulse"
                                    style={{
                                        width: `${Math.random() * 300 + 100}px`,
                                        height: `${Math.random() * 300 + 100}px`,
                                        left: `${Math.random() * 100}%`,
                                        top: `${Math.random() * 100}%`,
                                        animationDuration: `${Math.random() * 5 + 3}s`,
                                        animationDelay: `${Math.random() * 2}s`
                                    }}
                                />
                            ))}
                        </div>
                        <div className="relative z-10">
                            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 md:mb-6">
                                Welcome Back
                            </h2>
                            <p className="text-lg md:text-xl text-blue-100 leading-relaxed mb-6">
                                Manage your parking operations with our streamlined dashboard
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                {['Efficient Management', 'Real-time Updates', 'Smart Analytics'].map((feature, index) => (
                                    <div key={index} className="flex items-center space-x-3 text-white/90">
                                        <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-sm md:text-base">{feature}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Login Form Section */}
                    <div className="p-8 md:p-12 bg-white/50">
                        <div className="max-w-sm mx-auto">
                            <div className="text-center mb-8">
                                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Sign In</h3>
                                <p className="text-gray-600">Access your dashboard</p>
                            </div>

                            {/* Error Message */}
                            {loginError && (
                                <div className="mb-6 p-4 bg-red-50/50 backdrop-blur-sm rounded-xl border border-red-100/50">
                                    <div className="flex items-center space-x-2">
                                        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                        <p className="text-sm font-medium text-red-600">{loginError}</p>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleLogin} className="space-y-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={credentials.username}
                                                onChange={(e) => setCredentials(prev => ({
                                                    ...prev,
                                                    username: e.target.value
                                                }))}
                                                className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                                required
                                            />
                                            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                                        <div className="relative">
                                            <input
                                                type="password"
                                                value={credentials.password}
                                                onChange={(e) => setCredentials(prev => ({
                                                    ...prev,
                                                    password: e.target.value
                                                }))}
                                                className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                                required
                                            />
                                            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                </svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg font-medium"
                                >
                                    Sign in to Dashboard
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

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

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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

            {!isAuthenticated && <LoginSection />}
            
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