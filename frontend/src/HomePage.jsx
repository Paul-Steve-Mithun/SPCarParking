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
    EyeOff,
    BarChart3,
    TrendingDown,
    LogOut,
    TrendingUp as Growth
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useSpring, animated } from 'react-spring';
import { useNavigate } from 'react-router-dom';
import { useTheme } from './contexts/ThemeContext';
import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer
} from 'recharts';

const StatCardSkeleton = ({ isDarkMode }) => (
    <div className={`rounded-xl overflow-hidden shadow-sm animate-pulse ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="relative p-6">
            <div className="flex items-center justify-between mb-4">
                <div className={`h-12 w-12 rounded-xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                <div className={`h-5 w-5 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
            </div>
            <div className={`h-5 w-3/4 rounded mb-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
            <div className="flex items-center justify-between">
                <div className={`h-8 w-1/4 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
            </div>
        </div>
    </div>
);


export function HomePage({ isAuthenticated, onAuthentication }) {
    const [vehicles, setVehicles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [filteredVehicles, setFilteredVehicles] = useState([]);
    const [loginError, setLoginError] = useState('');
    const navigate = useNavigate();
    const { isDarkMode } = useTheme();

    useEffect(() => {
        setIsLoading(true);
        fetch('https://spcarparkingbknd.onrender.com/vehicles')
            .then(res => res.json())
            .then(data => {
                setVehicles(data);
            })
            .catch(error => console.error('Error fetching vehicles:', error))
            .finally(() => {
                setIsLoading(false);
            });
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
                       startDate.getFullYear() === currentDate.getFullYear() &&
                       v.rentalType === 'monthly';
            }).length,
            filter: () => vehicles.filter(v => {
                const startDate = new Date(v.startDate);
                const currentDate = new Date();
                return startDate.getMonth() === currentDate.getMonth() && 
                       startDate.getFullYear() === currentDate.getFullYear() &&
                       v.rentalType === 'monthly';
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
                <div className={`rounded-2xl w-full max-w-4xl mx-2 max-h-[90vh] sm:max-h-[80vh] overflow-hidden relative transition-colors duration-300 ${
                    isDarkMode ? 'bg-gray-900' : 'bg-white'
                }`}>
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
                    <div className={`p-3 sm:p-4 border-b transition-colors duration-300 ${
                        isDarkMode ? 'border-gray-700' : 'border-gray-200'
                    }`}>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search vehicles..."
                                className={`w-full pl-9 pr-3 py-2 text-sm sm:text-base rounded-lg border transition-all duration-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                                    isDarkMode 
                                        ? 'bg-gray-800 border-gray-600 text-gray-100 placeholder-gray-400' 
                                        : 'border-gray-200 text-gray-900 placeholder-gray-500'
                                }`}
                            />
                            <div className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-400'
                            }`}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="p-3 sm:p-6 overflow-auto max-h-[calc(90vh-120px)] sm:max-h-[calc(80vh-140px)]">
                        {displayedVehicles.length === 0 ? (
                            <div className={`text-center py-8 text-sm sm:text-base transition-colors duration-300 ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                                No vehicles found matching your search.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                {displayedVehicles.map(vehicle => {
                                    const dueAmount = calculateDueAmount(vehicle);
                                    
                                    return (
                                        <div 
                                            key={vehicle._id} 
                                            className={`rounded-xl border overflow-hidden hover:shadow-md transition-all duration-300 cursor-pointer ${
                                                isDarkMode 
                                                    ? 'bg-gray-800 border-gray-700 hover:shadow-gray-900/50' 
                                                    : 'bg-white border-gray-200 hover:shadow-gray-200/50'
                                            }`}
                                            onClick={() => handleVehicleCardClick(vehicle)}
                                        >
                                            <div className={`p-3 sm:p-4 border-b transition-colors duration-300 ${
                                                isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                                            }`}>
                                                <div className="flex flex-col gap-1.5 sm:gap-2">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="min-w-0 flex-1">
                                                            <h3 className={`font-semibold text-sm sm:text-base truncate transition-colors duration-300 ${
                                                                isDarkMode ? 'text-gray-100' : 'text-gray-900'
                                                            }`}>
                                                                {vehicle.vehicleNumber}
                                                            </h3>
                                                            <p className={`text-xs sm:text-sm truncate transition-colors duration-300 ${
                                                                isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                            }`}>
                                                                {vehicle.vehicleDescription || 'No description'}
                                                            </p>
                                                        </div>
                                                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                                                            vehicle.rentalType === 'daily' && vehicle.status === 'inactive'
                                                                ? isDarkMode 
                                                                    ? 'bg-red-900/30 text-red-300 border border-red-800'
                                                                    : 'bg-red-100 text-red-800 border border-red-200'
                                                                : vehicle.status === 'active'
                                                                    ? isDarkMode
                                                                        ? 'bg-green-900/30 text-green-300'
                                                                        : 'bg-green-100 text-green-800'
                                                                    : isDarkMode
                                                                        ? 'bg-red-900/30 text-red-300'
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
                                                    <span className={`transition-colors duration-300 ${
                                                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                    }`}>Lot Number:</span>
                                                    <span className={`font-medium transition-colors duration-300 ${
                                                        isDarkMode ? 'text-gray-200' : 'text-gray-900'
                                                    }`}>{vehicle.lotNumber || 'Open'}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs sm:text-sm">
                                                    <span className={`transition-colors duration-300 ${
                                                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                    }`}>Type:</span>
                                                    <span className={`font-medium transition-colors duration-300 ${
                                                        isDarkMode ? 'text-gray-200' : 'text-gray-900'
                                                    }`}>{vehicle.rentalType}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs sm:text-sm">
                                                    <span className={`transition-colors duration-300 ${
                                                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                    }`}>Rent:</span>
                                                    <span className={`font-medium transition-colors duration-300 ${
                                                        isDarkMode ? 'text-gray-200' : 'text-gray-900'
                                                    }`}>
                                                        {vehicle.rentalType === 'daily' ? (
                                                            <>
                                                                ₹{vehicle.rentPrice * vehicle.numberOfDays}
                                                                <span className={`transition-colors duration-300 ${
                                                                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                                }`}>
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
                                                        <span className={`transition-colors duration-300 ${
                                                            isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                        }`}>
                                                            {selectedCategory === 'Daily Rentals' ? 'End Date:' : 'Start Date:'}
                                                        </span>
                                                        <span className={`font-medium transition-colors duration-300 ${
                                                            isDarkMode ? 'text-gray-200' : 'text-gray-900'
                                                        }`}>
                                                            {formatDate(selectedCategory === 'Daily Rentals' ? vehicle.endDate : vehicle.startDate)}
                                                        </span>
                                                    </div>
                                                )}
                                                {vehicle.ownerName && (
                                                    <div className="flex items-center justify-between text-xs sm:text-sm">
                                                        <span className={`transition-colors duration-300 ${
                                                            isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                        }`}>Owner:</span>
                                                        <span className={`font-medium truncate max-w-[60%] transition-colors duration-300 ${
                                                            isDarkMode ? 'text-gray-200' : 'text-gray-900'
                                                        }`}>
                                                            MR. {vehicle.ownerName}
                                                        </span>
                                                    </div>
                                                )}
                                                {vehicle.contactNumber && (
                                                    <div className="flex items-center justify-between text-xs sm:text-sm">
                                                        <span className={`transition-colors duration-300 ${
                                                            isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                        }`}>Contact:</span>
                                                        <a 
                                                            href={`tel:${vehicle.contactNumber}`}
                                                            className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors flex items-center gap-1"
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
            <div className={`min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300 ${
                isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
            }`}>
                {/* Main Content */}
                <div className="max-w-5xl w-full">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className={`rounded-2xl shadow-xl overflow-hidden transition-colors duration-300 ${
                            isDarkMode ? 'bg-gray-800' : 'bg-white'
                        }`}
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
                                        <h2 className={`text-2xl font-bold transition-colors duration-300 ${
                                            isDarkMode ? 'text-gray-100' : 'text-gray-900'
                                        }`}>Welcome Back!</h2>
                                        <p className={`mt-2 transition-colors duration-300 ${
                                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                        }`}>Please sign in to your account</p>
                                    </div>

                                    <form onSubmit={handleLogin} className="space-y-6">
                                        {loginError && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`p-4 rounded-xl border flex items-center space-x-3 transition-colors duration-300 ${
                                                    isDarkMode 
                                                        ? 'bg-red-900/20 border-red-800' 
                                                        : 'bg-red-50 border-red-100'
                                                }`}
                                            >
                                                <AlertCircle className="w-5 h-5 text-red-500" />
                                                <p className={`text-sm font-medium transition-colors duration-300 ${
                                                    isDarkMode ? 'text-red-400' : 'text-red-600'
                                                }`}>{loginError}</p>
                                            </motion.div>
                                        )}

                                        <div className="space-y-4">
                                            <div>
                                                <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${
                                                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                                }`}>
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
                                                        className={`w-full pl-12 pr-4 py-3.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                                                            isDarkMode 
                                                                ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                                                                : 'border-gray-200 text-gray-900 placeholder-gray-500'
                                                        }`}
                                                        required
                                                    />
                                                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                                        <User className="w-5 h-5 text-gray-400" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${
                                                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                                }`}>
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
                                                        className={`w-full pl-12 pr-12 py-3.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 ${
                                                            isDarkMode 
                                                                ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                                                                : 'border-gray-200 text-gray-900 placeholder-gray-500'
                                                        }`}
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
                                            <p className={`text-sm transition-colors duration-300 ${
                                                isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                            }`}>
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

    // Registration Analytics Component
    const RegistrationAnalytics = () => {
        const [chartData, setChartData] = useState([]);
        const [advances, setAdvances] = useState([]);
        const [isLoading, setIsLoading] = useState(true);
        const [selectedYear, setSelectedYear] = useState('All');
        const [filteredCounts, setFilteredCounts] = useState({ new: 0, exits: 0 });

        const monthNames = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];

        useEffect(() => {
            if (vehicles.length > 0) {
                fetchAdvancesData();
            }
        }, [vehicles]);

        // Recompute when selected year changes
        useEffect(() => {
            if (advances.length > 0) {
                processRegistrationData(advances);
            }
        }, [selectedYear]);

        const fetchAdvancesData = async () => {
            try {
                const response = await fetch('https://spcarparkingbknd.onrender.com/advances/all');
                const advancesData = await response.json();
                setAdvances(advancesData);
                processRegistrationData(advancesData);
            } catch (error) {
                console.error('Error fetching advances:', error);
                processRegistrationData([]);
            }
        };

        const processRegistrationData = (advancesData = []) => {
            setIsLoading(true);
            
            // Build monthly registrations FROM advances (positive advanceAmount)
            let registrationAdvances = advancesData.filter(advance => 
                advance.advanceAmount && advance.advanceAmount > 0 && advance.startDate
            );

            // Filter advances with refund data (vehicles that left)
            let refundAdvances = advancesData.filter(advance => 
                advance.advanceRefund && advance.advanceRefund > 0 && advance.refundDate
            );

            // Apply year filter if not "All"
            if (selectedYear !== 'All') {
                const yearNum = Number(selectedYear);
                registrationAdvances = registrationAdvances.filter(a => new Date(a.startDate).getFullYear() === yearNum);
                refundAdvances = refundAdvances.filter(a => new Date(a.refundDate).getFullYear() === yearNum);
            }
            
            // Group monthly vehicles by registration period
            const groupedData = {};

            // Process monthly registrations using advances' startDate
            registrationAdvances.forEach(advance => {
                const startDate = new Date(advance.startDate);
                const periodKey = `${monthNames[startDate.getMonth()]} ${startDate.getFullYear()}`;

                if (!groupedData[periodKey]) {
                    groupedData[periodKey] = {
                        period: periodKey,
                        monthly: 0,
                        refunds: 0,
                        total: 0,
                        date: new Date(startDate.getFullYear(), startDate.getMonth(), 1)
                    };
                }

                groupedData[periodKey].monthly++;
            });

            // Process refunds (vehicles that left)
            refundAdvances.forEach(advance => {
                const refundDate = new Date(advance.refundDate);
                const periodKey = `${monthNames[refundDate.getMonth()]} ${refundDate.getFullYear()}`;

                if (!groupedData[periodKey]) {
                    groupedData[periodKey] = {
                        period: periodKey,
                        monthly: 0,
                        refunds: 0,
                        total: 0,
                        date: new Date(refundDate.getFullYear(), refundDate.getMonth(), 1)
                    };
                }

                groupedData[periodKey].refunds++;
            });

            // Compute totals for each period
            Object.keys(groupedData).forEach(key => {
                groupedData[key].total = groupedData[key].monthly + groupedData[key].refunds;
            });

            // Convert to array and sort by date
            const sortedData = Object.values(groupedData).sort((a, b) => a.date - b.date);
            setChartData(sortedData);

            // Update counts for summary cards
            setFilteredCounts({ new: registrationAdvances.length, exits: refundAdvances.length });

            setIsLoading(false);
        };

        const CustomTooltip = ({ active, payload, label }) => {
            if (active && payload && payload.length) {
                return (
                    <div className={`rounded-lg border shadow-lg p-4 transition-colors duration-300 ${
                        isDarkMode 
                            ? 'bg-gray-800 border-gray-600' 
                            : 'bg-white border-gray-200'
                    }`}>
                        <p className={`font-semibold mb-2 transition-colors duration-300 ${
                            isDarkMode ? 'text-gray-100' : 'text-gray-900'
                        }`}>{label}</p>
                        {payload.map((entry, index) => {
                            const labelText = entry.dataKey === 'monthly' ? 'New' : 'Exits';
                            return (
                                <p key={index} className={`text-sm transition-colors duration-300 ${
                                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                                }`} style={{ color: entry.color }}>
                                    {labelText}: {entry.value}
                                </p>
                            );
                        })}
                    </div>
                );
            }
            return null;
        };

        if (isLoading) {
            return (
                <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12">
                    <div className={`rounded-3xl shadow-2xl overflow-hidden border transition-all duration-300 ${
                        isDarkMode 
                            ? 'bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 border-gray-700 shadow-gray-900/50' 
                            : 'bg-gradient-to-br from-white via-gray-50 to-white border-gray-200 shadow-gray-200/50'
                    }`}>
                        <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-4 sm:p-6 lg:p-8 overflow-hidden">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                                    <BarChart3 className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-1">Monthly Registration Analytics</h2>
                                    <p className="text-blue-100 text-sm">Track your business growth over time</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 sm:p-6 lg:p-8">
                            {/* Chart Skeleton */}
                            <div className={`rounded-xl sm:rounded-2xl border p-4 sm:p-6 mb-6 sm:mb-8 transition-all duration-300 ${
                                isDarkMode 
                                    ? 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700' 
                                    : 'bg-gradient-to-br from-gray-50/50 to-white border-gray-200'
                            }`}>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-2 sm:space-y-0">
                                    <div className="flex-1">
                                        <div className={`h-6 w-48 rounded mb-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} animate-pulse`}></div>
                                        <div className={`h-4 w-64 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} animate-pulse`}></div>
                                    </div>
                                    <div className={`h-6 w-20 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} animate-pulse`}></div>
                                </div>
                                
                                {/* Chart Area Skeleton */}
                                <div className="relative h-64 sm:h-80 lg:h-96 w-full rounded-lg overflow-hidden">
                                    {/* Grid Lines */}
                                    <div className="absolute inset-0">
                                        {Array.from({ length: 6 }).map((_, i) => (
                                            <div key={i} className={`absolute w-full h-px ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} 
                                                 style={{ top: `${i * 20}%` }}></div>
                                        ))}
                                        {Array.from({ length: 8 }).map((_, i) => (
                                            <div key={i} className={`absolute h-full w-px ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`} 
                                                 style={{ left: `${i * 14.28}%` }}></div>
                                        ))}
                                    </div>
                                    
                                    {/* Animated Chart Lines */}
                                    <div className="absolute inset-0 flex items-end justify-between px-2 sm:px-4">
                                        {Array.from({ length: 7 }).map((_, i) => (
                                            <div key={i} className="flex flex-col items-center space-y-1 sm:space-y-2">
                                                {/* Blue bars (New registrations) */}
                                                <div className={`w-6 sm:w-8 md:w-10 rounded-t-lg bg-gradient-to-t from-blue-500/20 to-blue-400/30 animate-pulse`}
                                                     style={{ 
                                                         height: `${Math.random() * 60 + 20}%`,
                                                         animationDelay: `${i * 0.1}s`,
                                                         animationDuration: '2s'
                                                     }}></div>
                                                {/* Red bars (Exits) */}
                                                <div className={`w-6 sm:w-8 md:w-10 rounded-t-lg bg-gradient-to-t from-red-500/20 to-red-400/30 animate-pulse`}
                                                     style={{ 
                                                         height: `${Math.random() * 40 + 10}%`,
                                                         animationDelay: `${i * 0.1 + 0.5}s`,
                                                         animationDuration: '2s'
                                                     }}></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                
                                {/* Legend Skeleton */}
                                <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-6 mt-4">
                                    <div className="flex items-center space-x-2">
                                        <div className={`w-3 h-3 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} animate-pulse`}></div>
                                        <div className={`h-4 w-20 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} animate-pulse`}></div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <div className={`w-3 h-3 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} animate-pulse`}></div>
                                        <div className={`h-4 w-24 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} animate-pulse`}></div>
                                    </div>
                                </div>
                            </div>

                            {/* Summary Cards Skeleton */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                {Array.from({ length: 3 }).map((_, index) => (
                                    <div key={index} className={`p-4 sm:p-6 rounded-xl sm:rounded-2xl border transition-all duration-300 ${
                                        isDarkMode 
                                            ? 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700' 
                                            : 'bg-gradient-to-br from-gray-50/50 to-white border-gray-200'
                                    }`}>
                                        <div className="flex items-center space-x-3 sm:space-x-4">
                                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} animate-pulse`}></div>
                                            <div className="flex-1">
                                                <div className={`h-4 w-24 sm:w-28 rounded mb-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} animate-pulse`}></div>
                                                <div className={`h-6 sm:h-8 w-16 sm:w-20 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'} animate-pulse`}></div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className={`rounded-3xl shadow-2xl overflow-hidden border transition-all duration-300 ${
                        isDarkMode 
                            ? 'bg-gradient-to-br from-gray-800 via-gray-800 to-gray-900 border-gray-700 shadow-gray-900/50' 
                            : 'bg-gradient-to-br from-white via-gray-50 to-white border-gray-200 shadow-gray-200/50'
                    }`}
                >
                    {/* Header */}
                    <div className="relative bg-gradient-to-r from-blue-600 to-blue-600 p-4 sm:p-6 lg:p-8 overflow-hidden">
                        {/* Background Pattern */}
                        <div className="absolute inset-0 opacity-10 pointer-events-none">
                            <div className="absolute inset-0" style={{
                                backgroundImage: `radial-gradient(circle at 20% 50%, white 2px, transparent 2px),
                                                radial-gradient(circle at 80% 20%, white 1px, transparent 1px),
                                                radial-gradient(circle at 40% 80%, white 1px, transparent 1px)`,
                                backgroundSize: '50px 50px, 30px 30px, 40px 40px'
                            }} />
                        </div>
                        
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2 sm:gap-3">
                                <div className="p-2 sm:p-3 bg-white/20 rounded-xl sm:rounded-2xl backdrop-blur-sm">
                                    <BarChart3 className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-base sm:text-2xl font-bold text-white leading-tight">Monthly Registration Analytics</h2>
                                    <p className="hidden sm:block text-blue-100 text-xs sm:text-sm">Track your business growth over time</p>
                                </div>
                            </div>
                            {/* Year filter buttons - mobile friendly horizontal scroll */}
                            <div className="-mx-1 px-1 overflow-x-auto whitespace-nowrap flex items-center gap-2 pb-1">
                                {['All', 2023, 2024, 2025, 2026].map(y => (
                                    <button
                                        key={y}
                                        onClick={() => setSelectedYear(y)}
                                        className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-semibold border transition-colors shrink-0 ${
                                            selectedYear === y
                                                ? 'bg-white text-blue-700 border-white'
                                                : 'bg-blue-500/30 text-white border-white/40 hover:bg-blue-500/40'
                                        }`}
                                    >
                                        {y}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="p-4 sm:p-6 lg:p-8">
                        {/* Chart Section */}
                        <div className={`rounded-xl sm:rounded-2xl border p-4 sm:p-6 mb-6 sm:mb-8 transition-all duration-300 ${
                            isDarkMode 
                                ? 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700' 
                                : 'bg-gradient-to-br from-gray-50/50 to-white border-gray-200'
                        }`}>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-2 sm:space-y-0">
                                <div className="flex-1">
                                    <h3 className={`text-lg sm:text-xl font-bold mb-1 sm:mb-2 transition-colors duration-300 ${
                                        isDarkMode ? 'text-white' : 'text-gray-900'
                                    }`}>
                                        Registration & Exit Trends
                                    </h3>
                                    <p className={`text-xs sm:text-sm transition-colors duration-300 ${
                                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                    }`}>
                                        Monthly rentals: registrations vs exits
                                    </p>
                                </div>
                                <div className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-xs font-medium self-start ${
                                    isDarkMode 
                                        ? 'bg-blue-900/30 text-blue-300 border border-blue-800' 
                                        : 'bg-blue-100 text-blue-700 border border-blue-200'
                                }`}>
                                    {selectedYear === 'All' ? 'All Years' : selectedYear}
                                </div>
                            </div>
                            
                            <div className="h-64 sm:h-80 lg:h-96 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 10, right: 15, left: 10, bottom: 15 }}>
                                        <defs>
                                            <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                                            </linearGradient>
                                            <linearGradient id="refundGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#EF4444" stopOpacity={0.1}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid 
                                            strokeDasharray="3 3" 
                                            stroke={isDarkMode ? '#374151' : '#E5E7EB'} 
                                            opacity={0.5}
                                        />
                                        <XAxis 
                                            dataKey="period" 
                                            stroke={isDarkMode ? '#9CA3AF' : '#6B7280'}
                                            fontSize={window.innerWidth < 640 ? 8 : window.innerWidth < 1024 ? 9 : 10}
                                            fontWeight={500}
                                            tickLine={false}
                                            axisLine={false}
                                            interval="preserveStartEnd"
                                            angle={window.innerWidth < 640 ? -45 : 0}
                                            textAnchor={window.innerWidth < 640 ? 'end' : 'middle'}
                                            height={window.innerWidth < 640 ? 60 : 40}
                                        />
                                        <YAxis 
                                            stroke={isDarkMode ? '#9CA3AF' : '#6B7280'}
                                            fontSize={window.innerWidth < 640 ? 8 : window.innerWidth < 1024 ? 9 : 10}
                                            fontWeight={500}
                                            tickLine={false}
                                            axisLine={false}
                                            width={window.innerWidth < 640 ? 25 : window.innerWidth < 1024 ? 28 : 30}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area
                                            type="monotone"
                                            dataKey="monthly"
                                            stroke="#3B82F6"
                                            fill="url(#colorGradient)"
                                            strokeWidth={window.innerWidth < 640 ? 1.5 : 2}
                                            dot={{ 
                                                fill: '#3B82F6', 
                                                strokeWidth: window.innerWidth < 640 ? 1.5 : 2, 
                                                r: window.innerWidth < 640 ? 2 : 3 
                                            }}
                                            activeDot={{ 
                                                r: window.innerWidth < 640 ? 4 : 5, 
                                                stroke: '#3B82F6', 
                                                strokeWidth: window.innerWidth < 640 ? 1.5 : 2, 
                                                fill: '#ffffff' 
                                            }}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="refunds"
                                            stroke="#EF4444"
                                            fill="url(#refundGradient)"
                                            strokeWidth={window.innerWidth < 640 ? 1.5 : 2}
                                            dot={{ 
                                                fill: '#EF4444', 
                                                strokeWidth: window.innerWidth < 640 ? 1.5 : 2, 
                                                r: window.innerWidth < 640 ? 2 : 3 
                                            }}
                                            activeDot={{ 
                                                r: window.innerWidth < 640 ? 4 : 5, 
                                                stroke: '#EF4444', 
                                                strokeWidth: window.innerWidth < 640 ? 1.5 : 2, 
                                                fill: '#ffffff' 
                                            }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                            
                            {/* Legend */}
                            <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-6 mt-4">
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                    <span className={`text-xs font-medium transition-colors duration-300 ${
                                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                                    }`}>New</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                    <span className={`text-xs font-medium transition-colors duration-300 ${
                                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                                    }`}>Exits (Refunds)</span>
                                </div>
                            </div>
                        </div>

                        {/* Summary Stats */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className={`group p-4 sm:p-6 rounded-xl sm:rounded-2xl border transition-all duration-300 hover:shadow-lg hover:scale-105 ${
                                    isDarkMode 
                                        ? 'bg-gradient-to-br from-blue-900/30 to-blue-800/20 border-blue-700/50 hover:border-blue-600/70' 
                                        : 'bg-gradient-to-br from-blue-50 to-blue-100/70 border-blue-200 hover:border-blue-300'
                                }`}
                            >
                                <div className="flex items-center space-x-3 sm:space-x-4">
                                    <div className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl transition-all duration-300 ${
                                        isDarkMode 
                                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 group-hover:from-blue-400 group-hover:to-blue-500' 
                                            : 'bg-gradient-to-br from-blue-500 to-blue-600 group-hover:from-blue-400 group-hover:to-blue-500'
                                    }`}>
                                        <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs sm:text-sm font-medium mb-1 transition-colors duration-300 ${
                                            isDarkMode ? 'text-blue-300' : 'text-blue-600'
                                        }`}>Peak Month</p>
                                        <p className={`text-lg sm:text-2xl font-bold transition-colors duration-300 truncate ${
                                            isDarkMode ? 'text-white' : 'text-gray-900'
                                        }`}>
                                            {chartData.length > 0 
                                                ? chartData.reduce((max, current) => current.total > max.total ? current : max, chartData[0]).period
                                                : 'N/A'
                                            }
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                            {/* Total Registrations */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.25 }}
                                className={`group p-4 sm:p-6 rounded-xl sm:rounded-2xl border transition-all duration-300 hover:shadow-lg hover:scale-105 ${
                                    isDarkMode 
                                        ? 'bg-gradient-to-br from-indigo-900/30 to-indigo-800/20 border-indigo-700/50 hover:border-indigo-600/70' 
                                        : 'bg-gradient-to-br from-indigo-50 to-indigo-100/70 border-indigo-200 hover:border-indigo-300'
                                }`}
                            >
                                <div className="flex items-center space-x-3 sm:space-x-4">
                                    <div className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl transition-all duration-300 ${
                                        isDarkMode 
                                            ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 group-hover:from-indigo-400 group-hover:to-indigo-500' 
                                            : 'bg-gradient-to-br from-indigo-500 to-indigo-600 group-hover:from-indigo-400 group-hover:to-indigo-500'
                                    }`}>
                                        <LogIn className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs sm:text-sm font-medium mb-1 transition-colors duration-300 ${
                                            isDarkMode ? 'text-indigo-300' : 'text-indigo-600'
                                        }`}>Total Registrations</p>
                                        <p className={`text-lg sm:text-2xl font-bold transition-colors duration-300 ${
                                            isDarkMode ? 'text-white' : 'text-gray-900'
                                        }`}>
                                            {filteredCounts.new}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className={`group p-4 sm:p-6 rounded-xl sm:rounded-2xl border transition-all duration-300 hover:shadow-lg hover:scale-105 ${
                                    isDarkMode 
                                        ? 'bg-gradient-to-br from-emerald-900/30 to-emerald-800/20 border-emerald-700/50 hover:border-emerald-600/70' 
                                        : 'bg-gradient-to-br from-emerald-50 to-emerald-100/70 border-emerald-200 hover:border-emerald-300'
                                }`}
                            >
                                <div className="flex items-center space-x-3 sm:space-x-4">
                                    <div className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl transition-all duration-300 ${
                                        isDarkMode 
                                            ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 group-hover:from-emerald-400 group-hover:to-emerald-500' 
                                            : 'bg-gradient-to-br from-emerald-500 to-emerald-600 group-hover:from-emerald-400 group-hover:to-emerald-500'
                                    }`}>
                                        <LogOut className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs sm:text-sm font-medium mb-1 transition-colors duration-300 ${
                                            isDarkMode ? 'text-emerald-300' : 'text-emerald-600'
                                        }`}>Total Exits</p>
                                        <p className={`text-lg sm:text-2xl font-bold transition-colors duration-300 ${
                                            isDarkMode ? 'text-white' : 'text-gray-900'
                                        }`}>
                                            {filteredCounts.exits}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                            {/* Net Growth removed as requested */}
                        </div>
                    </div>
                </motion.div>
            </div>
        );
    };

    return (
        <div className={`min-h-screen transition-colors duration-300 ${
            isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
        }`}>
            {!isAuthenticated ? (
                <LoginSection />
            ) : (
                <>
                    {/* Hero Section */}
                    <div className={`relative overflow-hidden shadow-sm transition-colors duration-300 ${
                        isDarkMode ? 'bg-gray-800' : 'bg-white'
                    }`}>
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
                                    opacity: isDarkMode ? 0.05 : 0.1
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
                                            className={`inline-block font-mono font-black tracking-tight ${
                                                isDarkMode ? 'text-blue-400' : 'text-blue-600'
                                            }`}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ 
                                                duration: 0.8,
                                                delay: 0.2
                                            }}
                                            style={{
                                                textShadow: isDarkMode 
                                                    ? '0 4px 12px rgba(96, 165, 250, 0.15)' 
                                                    : '0 4px 12px rgba(37, 99, 235, 0.15)'
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
                                        className={`mt-4 text-xl max-w-2xl mx-auto transition-colors duration-300 ${
                                            isDarkMode ? 'text-gray-300' : 'text-gray-600'
                                        }`}
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
                                    {isLoading ? (
                                        <div className={`text-8xl font-black tracking-tight font-mono ${
                                            isDarkMode ? 'text-gray-700' : 'text-gray-200'
                                        }`}>
                                            --
                                        </div>
                                    ) : (
                                        <animated.div 
                                            className={`text-8xl font-black tracking-tight font-mono ${
                                                isDarkMode ? 'text-blue-400' : 'text-blue-600'
                                            }`}
                                            style={{
                                                textShadow: isDarkMode 
                                                    ? '0 4px 12px rgba(96, 165, 250, 0.15)' 
                                                    : '0 4px 12px rgba(37, 99, 235, 0.15)'
                                            }}
                                        >
                                            {number.to(n => Math.floor(n))}
                                        </animated.div>
                                    )}
                                </motion.div>
                            </div>
                        </div>
                    </div>

                    {/* Main Stats Grid */}
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {isLoading 
                                ? Array.from({ length: 9 }).map((_, index) => (
                                    <StatCardSkeleton key={index} isDarkMode={isDarkMode} />
                                ))
                                : stats.map((stat, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: index * 0.05 }}
                                        onClick={() => handleCardClick(stat)}
                                        className={`group relative rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 ${
                                        isDarkMode ? 'bg-gray-800' : 'bg-white'
                                    }`}
                                >
                                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                                        isDarkMode ? 'bg-gradient-to-r from-gray-700 to-gray-800' : 'bg-gradient-to-r from-gray-50 to-white'
                                    }`} />
                                    <div className="relative p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.color} text-white shadow-lg`}>
                                                {stat.icon}
                                            </div>
                                            <ChevronRight className={`w-5 h-5 transition-colors duration-300 ${
                                                isDarkMode ? 'text-gray-400 group-hover:text-gray-300' : 'text-gray-400 group-hover:text-gray-600'
                                            }`} />
                                        </div>
                                        <h3 className={`text-lg font-semibold mb-1 transition-colors duration-300 ${
                                            isDarkMode ? 'text-gray-100' : 'text-gray-900'
                                        }`}>
                                            {stat.label}
                                        </h3>
                                        <div className="flex items-center justify-between">
                                            <p className={`text-3xl font-bold transition-colors duration-300 ${
                                                isDarkMode ? 'text-gray-100' : 'text-gray-900'
                                            }`}>
                                                {stat.value}
                                            </p>
                                            <TrendingUp className="w-4 h-4 text-green-500" />
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Registration Analytics */}
                    <RegistrationAnalytics />
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