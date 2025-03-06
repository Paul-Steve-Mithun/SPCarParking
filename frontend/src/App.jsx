import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { 
    Menu, 
    X, 
    Home,
    PlusCircle,
    Car,
    IndianRupee,
    Wallet,
    AlertCircle,
    Receipt,
    Settings,
    LogOut,
    LogIn,
    DollarSign
} from 'lucide-react';
import HomePage from './HomePage';
import NewVehicle from './NewVehicle';
import AdminPanel from './AdminPanel';
import RevenueDashboard from './RevenueDashboard';
import ManageVehicles from './ManageVehicles';
import AdvanceDashboard from './AdvanceDashboard';
import VehicleInfo from './VehicleInfo';
import ExpensesDashboard from './ExpensesDashboard';
import BalanceSheet from './BalanceSheet';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
    const auth = JSON.parse(localStorage.getItem('spcarparking_auth') || '{}');
    
    if (!auth.isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(auth.role)) {
        return <Navigate to="/" replace />;
    }

    return children;
};

// Create a separate Navigation component
const Navigation = ({ isAuthenticated, setIsAuthenticated }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const navigate = useNavigate();
    const auth = JSON.parse(localStorage.getItem('spcarparking_auth') || '{}');

    const handleLogout = () => {
        localStorage.removeItem('spcarparking_auth');
        setIsAuthenticated(false);
        navigate('/');
    };

    const scrollToLogin = () => {
        navigate('/');
        
        setTimeout(() => {
            const loginSection = document.querySelector('#loginSection');
            if (loginSection) {
                loginSection.scrollIntoView({ 
                    behavior: 'smooth',
                    block: 'center'
                });
            }
            setIsMenuOpen(false);
        }, 100);
    };

    const NavItem = ({ to, children, requiredRoles }) => {
        const auth = JSON.parse(localStorage.getItem('spcarparking_auth') || '{}');
        
        // If route requires specific roles and user doesn't have them, don't show the link
        if (requiredRoles && (!auth.isAuthenticated || !requiredRoles.includes(auth.role))) {
            return null;
        }

        return (
            <NavLink 
                to={to} 
                onClick={() => setIsMenuOpen(false)}
                className={({ isActive }) => `
                    block w-full px-4 py-2 text-sm font-medium transition-all duration-200
                    ${isActive 
                        ? 'bg-white/20 text-white' 
                        : 'text-white hover:bg-white/10'
                    }
                    md:inline-block md:w-auto md:rounded-lg
                `}
            >
                {children}
            </NavLink>
        );
    };

    // Only render navigation if user is authenticated
    if (!isAuthenticated) {
        return null;
    }

    return (
        <nav className="bg-gradient-to-r from-blue-600 to-blue-600 shadow-lg sticky top-0 z-50">
            <div className="relative">
                <div className="max-w-[1920px] mx-auto px-2 sm:px-4 lg:px-4">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <div className="flex items-center mr-4">
                            <NavLink to="/" className="text-white text-lg font-bold tracking-wider hover:opacity-90 transition-opacity whitespace-nowrap">
                                SP CAR PARKING
                            </NavLink>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center justify-end flex-1 space-x-2">
                            <div className="flex items-center space-x-2">
                                <NavItem to="/" requiredRoles={['admin', 'user']}>
                                    <div className="flex items-center space-x-1.5">
                                        <Home className="w-4 h-4" />
                                        <span>Home</span>
                                    </div>
                                </NavItem>
                                <NavItem to="/new-vehicle" requiredRoles={['admin']}>
                                    <div className="flex items-center space-x-1.5">
                                        <PlusCircle className="w-4 h-4" />
                                        <span>New Vehicle</span>
                                    </div>
                                </NavItem>
                                <NavItem to="/vehicle-info" requiredRoles={['admin', 'user']}>
                                    <div className="flex items-center space-x-1.5">
                                        <Car className="w-4 h-4" />
                                        <span>Vehicle Info</span>
                                    </div>
                                </NavItem>
                                <NavItem to="/revenuedashboard" requiredRoles={['admin', 'user']}>
                                    <div className="flex items-center space-x-1.5">
                                        <IndianRupee className="w-4 h-4" />
                                        <span>Rent</span>
                                    </div>
                                </NavItem>
                                <NavItem to="/advance" requiredRoles={['admin', 'user']}>
                                    <div className="flex items-center space-x-1.5">
                                        <Wallet className="w-4 h-4" />
                                        <span>Advance</span>
                                    </div>
                                </NavItem>
                                <NavItem to="/expenses" requiredRoles={['admin', 'user']}>
                                    <div className="flex items-center space-x-1.5">
                                        <Receipt className="w-4 h-4" />
                                        <span>Expenses</span>
                                    </div>
                                </NavItem>
                                <NavItem to="/managevehicles" requiredRoles={['admin']}>
                                    <div className="flex items-center space-x-1.5">
                                        <AlertCircle className="w-4 h-4" />
                                        <span>Outstanding</span>
                                    </div>
                                </NavItem>
                                <NavItem to="/admin" requiredRoles={['admin']}>
                                    <div className="flex items-center space-x-1.5">
                                        <Settings className="w-4 h-4" />
                                        <span>Admin</span>
                                    </div>
                                </NavItem>
                                <NavItem to="/balancesheet" requiredRoles={['admin', 'user']}>
                                    <div className="flex items-center space-x-1.5">
                                        <DollarSign className="w-4 h-4" />
                                        <span>Balance Sheet</span>
                                    </div>
                                </NavItem>
                            </div>
                            {isAuthenticated && (
                                <button
                                    onClick={handleLogout}
                                    className="text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-colors flex items-center space-x-1.5 ml-2"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span>Logout</span>
                                </button>
                            )}
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="md:hidden">
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
                            >
                                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                            </button>
                        </div>
                    </div>

                    {/* Mobile Navigation */}
                    {isMenuOpen && (
                        <div className="md:hidden fixed inset-0 z-50">
                            {/* Backdrop */}
                            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setIsMenuOpen(false)} />
                            
                            {/* Menu Panel - Sliding from left */}
                            <div className="fixed inset-y-0 left-0 w-[280px] bg-white shadow-xl transform transition-all duration-300">
                                {/* Header */}
                                <div className="flex items-center justify-between px-4 h-14 bg-gradient-to-r from-blue-600 to-blue-600">
                                    <span className="text-base font-bold text-white">
                                        Menu
                                    </span>
                                    <button
                                        onClick={() => setIsMenuOpen(false)}
                                        className="p-1.5 rounded-lg text-white/90 hover:text-white hover:bg-white/10 transition-colors"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                {/* Navigation Links */}
                                <div className="flex-1 overflow-y-auto">
                                    <div className="p-2">
                                        {[
                                            { to: "/", label: "Home", icon: <Home className="w-[18px] h-[18px]" /> },
                                            { to: "/new-vehicle", label: "New Vehicle", icon: <PlusCircle className="w-[18px] h-[18px]" />, requiresAuth: true },
                                            { to: "/vehicle-info", label: "Vehicle Info", icon: <Car className="w-[18px] h-[18px]" /> },
                                            { to: "/revenuedashboard", label: "Rent", icon: <IndianRupee className="w-[18px] h-[18px]" /> },
                                            { to: "/advance", label: "Advance", icon: <Wallet className="w-[18px] h-[18px]" /> },
                                            { to: "/expenses", label: "Expenses", icon: <Receipt className="w-[18px] h-[18px]" /> },
                                            { to: "/managevehicles", label: "Outstanding", icon: <AlertCircle className="w-[18px] h-[18px]" />, requiresAuth: true },
                                            { to: "/admin", label: "Admin", icon: <Settings className="w-[18px] h-[18px]" />, requiresAuth: true },
                                            { to: "/balancesheet", label: "Balance Sheet", icon: <DollarSign className="w-[18px] h-[18px]" /> }
                                        ].map((item) => {
                                            if (item.requiresAuth && !isAuthenticated) {
                                                return null;
                                            }
                                            return (
                                                <NavLink
                                                    key={item.to}
                                                    to={item.to}
                                                    onClick={() => setIsMenuOpen(false)}
                                                    className={({ isActive }) => `
                                                        flex items-center px-3 py-2 mb-0.5 rounded-lg
                                                        ${isActive 
                                                            ? 'bg-blue-50 text-blue-600' 
                                                            : 'text-gray-600 hover:bg-gray-50'
                                                        }
                                                        transition-all duration-200
                                                    `}
                                                >
                                                    <span className="mr-3.5">
                                                        {item.icon}
                                                    </span>
                                                    <span className="font-medium text-sm">{item.label}</span>
                                                </NavLink>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Footer with Login/Logout */}
                                <div className="p-3 border-t border-gray-100">
                                    {isAuthenticated ? (
                                        <button
                                            onClick={() => {
                                                handleLogout();
                                                setIsMenuOpen(false);
                                            }}
                                            className="w-full py-2.5 px-3 rounded-lg bg-red-50 text-red-600 font-medium text-sm
                                            hover:bg-red-100 active:scale-[0.98] transition-all duration-200 flex items-center justify-center"
                                        >
                                            <LogOut className="w-[18px] h-[18px] mr-2" />
                                            Logout
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => {
                                                scrollToLogin();
                                                setIsMenuOpen(false);
                                            }}
                                            className="w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-600 text-white font-medium text-sm
                                            hover:from-blue-700 hover:to-purple-800 active:scale-[0.98] transition-all duration-200 flex items-center justify-center"
                                        >
                                            <LogIn className="w-[18px] h-[18px] mr-2" />
                                            Login
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(
        localStorage.getItem('spcarparking_auth') ? JSON.parse(localStorage.getItem('spcarparking_auth')).isAuthenticated : false
    );

    return (
        <Router>
            <div className="w-full mx-auto min-h-screen bg-gray-50">
                <Navigation 
                    isAuthenticated={isAuthenticated} 
                    setIsAuthenticated={setIsAuthenticated}
                />

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-[calc(100vh-4rem-3.5rem)]">
                    <Routes>
                        <Route path="/" element={
                            <HomePage 
                                isAuthenticated={isAuthenticated}
                                onAuthentication={setIsAuthenticated}
                            />
                        } />
                        <Route path="/new-vehicle" element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                <NewVehicle />
                            </ProtectedRoute>
                        } />
                        <Route path="/managevehicles" element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                <ManageVehicles />
                            </ProtectedRoute>
                        } />
                        <Route path="/revenuedashboard" element={
                            <ProtectedRoute allowedRoles={['admin', 'user']}>
                                <RevenueDashboard />
                            </ProtectedRoute>
                        } />
                        <Route path="/advance" element={
                            <ProtectedRoute allowedRoles={['admin', 'user']}>
                                <AdvanceDashboard />
                            </ProtectedRoute>
                        } />
                        <Route path="/vehicle-info" element={
                            <ProtectedRoute allowedRoles={['admin', 'user']}>
                                <VehicleInfo />
                            </ProtectedRoute>
                        } />
                        <Route path="/expenses" element={
                            <ProtectedRoute allowedRoles={['admin', 'user']}>
                                <ExpensesDashboard />
                            </ProtectedRoute>
                        } />
                        <Route path="/balancesheet" element={
                            <ProtectedRoute allowedRoles={['admin', 'user']}>
                                <BalanceSheet />
                            </ProtectedRoute>
                        } />
                        <Route path="/admin" element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                <AdminPanel />
                            </ProtectedRoute>
                        } />
                    </Routes>
                </main>

                {/* Footer - Now outside of Routes */}
                {isAuthenticated && (
                    <footer className="border-t border-gray-200">
                        <div className="text-center py-8 relative">
                            <div className="flex flex-col-reverse md:flex-row justify-between items-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 space-y-reverse md:space-y-0">
                                <p className="text-sm text-gray-500">
                                    © {new Date().getFullYear()} SP Car Parking. All rights reserved.
                                </p>
                                <p className="text-xl md:text-lg font-black text-blue-600 tracking-wide hover:scale-105 transition-transform duration-300">
                                    STERIX ENTERPRISES
                                </p>
                            </div>
                        </div>
                    </footer>
                )}
            </div>
        </Router>
    );
}

export default App;