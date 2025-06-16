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
    ChevronRight,
    IndianRupee,
    Receipt,
    AlertCircle,
    User,
    Lock,
    LogIn,
    Eye,
    EyeOff
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useSpring, animated } from 'react-spring';
import { useNavigate } from 'react-router-dom';

export function HomePage({ isAuthenticated, onAuthentication }) {
    const [vehicles, setVehicles] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [filteredVehicles, setFilteredVehicles] = useState([]);
    const [loginError, setLoginError] = useState('');
    const navigate = useNavigate();

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
            icon: <CarTaxiFront className="w-6 h-6" />,
            label: 'New Registrations',
            value: vehicles.filter(v => {
                const startDate = new Date(v.startDate);
                const currentDate = new Date();
                return startDate.getMonth() === currentDate.getMonth() && 
                       startDate.getFullYear() === currentDate.getFullYear();
            }).length,
            filter: () => vehicles.filter(v => {
                const startDate = new Date(v.startDate);
                const currentDate = new Date();
                return startDate.getMonth() === currentDate.getMonth() && 
                       startDate.getFullYear() === currentDate.getFullYear();
            }),
            color: 'from-emerald-500 to-emerald-600'
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
        const [searchTerm, setSearchTerm] = useState('');
        const [displayedVehicles, setDisplayedVehicles] = useState(filteredVehicles);

        useEffect(() => {
            if (searchTerm.trim() === '') {
                setDisplayedVehicles(filteredVehicles);
                return;
            }

            const searchTermLower = searchTerm.toLowerCase();
            const filtered = filteredVehicles.filter(vehicle => 
                vehicle.vehicleNumber?.toLowerCase().includes(searchTermLower) ||
                vehicle.vehicleDescription?.toLowerCase().includes(searchTermLower) ||
                vehicle.lotNumber?.toLowerCase().includes(searchTermLower) ||
                vehicle.ownerName?.toLowerCase().includes(searchTermLower)
            );
            setDisplayedVehicles(filtered);
        }, [searchTerm, filteredVehicles]);

        // Add function to handle vehicle card click
        const handleVehicleCardClick = (vehicle) => {
            navigate('/vehicle-info', { state: { vehicleNumber: vehicle.vehicleNumber } });
        };

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
                <div className="bg-white rounded-2xl w-full max-w-4xl mx-2 max-h-[90vh] sm:max-h-[80vh] overflow-hidden relative">
                    <div className="bg-blue-600 p-3 sm:p-4 flex justify-between items-center">
                        <h2 className="text-base sm:text-xl font-bold text-white">{selectedCategory}</h2>
                        <button 
                            onClick={() => setShowModal(false)}
                            className="text-white hover:text-gray-200 transition-colors p-1"
                        >
                            <X className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                    </div>

                    {/* Search Bar */}
                    <div className="p-3 sm:p-4 border-b border-gray-200">
                        <div className="relative">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search vehicles..."
                                className="w-full pl-9 pr-3 py-2 text-sm sm:text-base rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                            />
                            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="p-3 sm:p-6 overflow-auto max-h-[calc(90vh-120px)] sm:max-h-[calc(80vh-140px)]">
                        {displayedVehicles.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 text-sm sm:text-base">
                                No vehicles found matching your search.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                {displayedVehicles.map(vehicle => {
                                    const dueAmount = calculateDueAmount(vehicle);
                                    
                                    return (
                                        <div 
                                            key={vehicle._id} 
                                            className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                                            onClick={() => handleVehicleCardClick(vehicle)}
                                        >
                                            <div className="p-3 sm:p-4 bg-gray-50 border-b border-gray-200">
                                                <div className="flex flex-col gap-1.5 sm:gap-2">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0 flex-1">
                                                            <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                                                                {vehicle.vehicleNumber}
                                                            </h3>
                                                            <p className="text-xs sm:text-sm text-gray-500 truncate">
                                                                {vehicle.vehicleDescription || 'No description'}
                                                            </p>
                                                        </div>
                                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
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
                                            <div className="p-3 sm:p-4 space-y-2">
                                                <div className="flex items-center justify-between text-xs sm:text-sm">
                                                    <span className="text-gray-500">Lot Number:</span>
                                                    <span className="font-medium text-gray-900">{vehicle.lotNumber || 'Open'}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs sm:text-sm">
                                                    <span className="text-gray-500">Type:</span>
                                                    <span className="font-medium text-gray-900 capitalize">{vehicle.rentalType}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs sm:text-sm">
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
                                                {(vehicle.endDate || vehicle.startDate) && (
                                                    <div className="flex items-center justify-between text-xs sm:text-sm">
                                                        <span className="text-gray-500">
                                                            {selectedCategory === 'Daily Rentals' ? 'End Date:' : 'Start Date:'}
                                                        </span>
                                                        <span className="font-medium text-gray-900">
                                                            {formatDate(selectedCategory === 'Daily Rentals' ? vehicle.endDate : vehicle.startDate)}
                                                        </span>
                                                    </div>
                                                )}
                                                {vehicle.ownerName && (
                                                    <div className="flex items-center justify-between text-xs sm:text-sm">
                                                        <span className="text-gray-500">Owner:</span>
                                                        <span className="font-medium text-gray-900 truncate max-w-[60%]">
                                                            MR. {vehicle.ownerName}
                                                        </span>
                                                    </div>
                                                )}
                                                {vehicle.contactNumber && (
                                                    <div className="flex items-center justify-between text-xs sm:text-sm">
                                                        <span className="text-gray-500">Contact:</span>
                                                        <a 
                                                            href={`tel:${vehicle.contactNumber}`}
                                                            className="font-medium text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
                                                            onClick={(e) => e.stopPropagation()} // Prevent card click when clicking phone number
                                                        >
                                                            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        )}
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
        const [showPassword, setShowPassword] = useState(false);

        const handleLogin = (e) => {
            e.preventDefault();
            const adminUsername = import.meta.env.VITE_ADMIN_USERNAME;
            const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD;
            const userUsername = import.meta.env.VITE_MANI_USERNAME;
            const userPassword = import.meta.env.VITE_USER_PASSWORD;

            let authData = {
                isAuthenticated: false,
                role: null
            };

            if (credentials.username === adminUsername && credentials.password === adminPassword) {
                authData = {
                    isAuthenticated: true,
                    role: 'admin',
                    username: credentials.username,
                    password: credentials.password
                };
                setLoginError('');
            } else if (credentials.username === userUsername && credentials.password === userPassword) {
                authData = {
                    isAuthenticated: true,
                    role: 'user',
                    username: credentials.username,
                    password: credentials.password
                };
                setLoginError('');
            } else {
                setLoginError('Invalid credentials');
                return;
            }

            localStorage.setItem('spcarparking_auth', JSON.stringify(authData));
            onAuthentication(true);
        };

        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
                {/* Main Content */}
                <div className="max-w-5xl w-full">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="bg-white rounded-2xl shadow-xl overflow-hidden"
                    >
                        <div className="flex flex-col lg:flex-row">
                            {/* Left Section - Brand & Features */}
                            <div className="lg:w-5/12 bg-blue-600 p-8 lg:p-12 flex flex-col justify-between relative overflow-hidden">
                                {/* Animated Lines Background */}
                                <div className="absolute inset-0">
                                    {[...Array(5)].map((_, i) => (
                                        <div
                                            key={i}
                                            className="absolute h-px bg-gradient-to-r from-transparent via-white/30 to-transparent w-full transform -rotate-45"
                                            style={{
                                                top: `${i * 25}%`,
                                                animationDelay: `${i * 0.2}s`,
                                                animation: 'moveLines 8s infinite linear'
                                            }}
                                        />
                                    ))}
                                </div>

                                <div className="relative z-10">
                                    <h1 className="text-3xl font-bold text-white mb-6">
                                        SP CAR PARKING
                                    </h1>
                                    <p className="text-blue-50 text-lg leading-relaxed">
                                        Your comprehensive solution for efficient parking management
                                    </p>
                                </div>

                                <div className="relative z-10 mt-12">
                                    <div className="space-y-6">
                                        {[
                                            { icon: <Car className="w-5 h-5" />, text: "Smart Vehicle Management" },
                                            { icon: <IndianRupee className="w-5 h-5" />, text: "Revenue & Expenses Tracking" },
                                            { icon: <Wallet className="w-5 h-5" />, text: "Maintain Records" }
                                        ].map((feature, index) => (
                                            <motion.div
                                                key={index}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.2 + index * 0.1 }}
                                                className="flex items-center space-x-4"
                                            >
                                                <div className="p-2 bg-white/10 rounded-lg text-white">
                                                    {feature.icon}
                                                </div>
                                                <span className="text-white">{feature.text}</span>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Right Section - Login Form */}
                            <div className="lg:w-7/12 p-8 lg:p-12">
                                <div className="max-w-md mx-auto">
                                    <div className="text-center mb-8">
                                        <h2 className="text-2xl font-bold text-gray-900">Welcome Back!</h2>
                                        <p className="mt-2 text-gray-600">Please sign in to your account</p>
                                    </div>

                                    <form onSubmit={handleLogin} className="space-y-6">
                                        {loginError && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className="p-4 bg-red-50 rounded-xl border border-red-100 flex items-center space-x-3"
                                            >
                                                <AlertCircle className="w-5 h-5 text-red-500" />
                                                <p className="text-sm text-red-600 font-medium">{loginError}</p>
                                            </motion.div>
                                        )}

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Username
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        value={credentials.username}
                                                        onChange={(e) => setCredentials(prev => ({
                                                            ...prev,
                                                            username: e.target.value
                                                        }))}
                                                        className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                                        required
                                                    />
                                                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                                        <User className="w-5 h-5 text-gray-400" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Password
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type={showPassword ? "text" : "password"}
                                                        value={credentials.password}
                                                        onChange={(e) => setCredentials(prev => ({
                                                            ...prev,
                                                            password: e.target.value
                                                        }))}
                                                        className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                                        required
                                                    />
                                                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                                        <Lock className="w-5 h-5 text-gray-400" />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                                    >
                                                        {showPassword ? (
                                                            <EyeOff className="w-5 h-5" />
                                                        ) : (
                                                            <Eye className="w-5 h-5" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="submit"
                                            className="w-full bg-blue-600 text-white py-3.5 rounded-xl hover:bg-blue-700 transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg flex items-center justify-center space-x-2 font-medium"
                                        >
                                            <LogIn className="w-5 h-5" />
                                            <span>Sign in</span>
                                        </button>

                                        <div className="text-center mt-6">
                                            <p className="text-sm text-gray-500">
                                                © {new Date().getFullYear()} SP Car Parking. All rights reserved.
                                            </p>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </motion.div>
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
        <div className="min-h-screen bg-gray-50">
            {!isAuthenticated ? (
                <LoginSection />
            ) : (
                <>
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
                </>
            )}
            
            {showModal && <VehicleModal />}
        </div>
    );
}

export default HomePage;

<style>
    {`
        @keyframes moveLines {
            0% {
                transform: translateX(-100%) rotate(-45deg);
            }
            100% {
                transform: translateX(100%) rotate(-45deg);
            }
        }

        @keyframes float {
            0% {
                transform: translate(0, 0);
            }
            50% {
                transform: translate(0, 20px);
            }
            100% {
                transform: translate(0, 0);
            }
        }
    `}
</style>