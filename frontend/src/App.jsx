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
    LogIn
} from 'lucide-react';
import HomePage from './HomePage';
import NewVehicle from './NewVehicle';
import AdminPanel from './AdminPanel';
import RevenueDashboard from './RevenueDashboard';
import ManageVehicles from './ManageVehicles';
import AdvanceDashboard from './AdvanceDashboard';
import VehicleInfo from './VehicleInfo';
import ExpensesDashboard from './ExpensesDashboard';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
    const isAuthenticated = localStorage.getItem('spcarparking_auth') === 'true';
    if (!isAuthenticated) {
        return <Navigate to="/" replace />;
    }
    return children;
};

// Create a separate Navigation component
const Navigation = ({ isAuthenticated, setIsAuthenticated }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('spcarparking_auth');
        setIsAuthenticated(false);
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

    const NavItem = ({ to, children, requiresAuth }) => {
        const isAuthenticated = localStorage.getItem('spcarparking_auth') === 'true';
        
        // If route requires auth and user is not authenticated, don't show the link
        if (requiresAuth && !isAuthenticated) {
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

    return (
        <nav className="bg-gradient-to-r from-blue-600 to-purple-700 shadow-lg sticky top-0 z-50">
            <div className="relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <div className="flex items-center">
                            <NavLink to="/" className="text-white text-xl font-bold tracking-wider hover:opacity-90 transition-opacity">
                                SP CAR PARKING
                            </NavLink>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center space-x-4">
                            <NavItem to="/">Home</NavItem>
                            <NavItem to="/new-vehicle" requiresAuth>New Vehicle</NavItem>
                            <NavItem to="/vehicle-info">Vehicle Info</NavItem>
                            <NavItem to="/revenuedashboard">Rent</NavItem>
                            <NavItem to="/advance">Advance</NavItem>
                            <NavItem to="/expenses">Expenses</NavItem>
                            <NavItem to="/managevehicles" requiresAuth>Outstanding</NavItem>
                            <NavItem to="/admin" requiresAuth>Admin</NavItem>
                            {isAuthenticated ? (
                                <button
                                    onClick={handleLogout}
                                    className="text-white hover:bg-white/10 px-4 py-2 rounded-lg transition-colors"
                                >
                                    Logout
                                </button>
                            ) : (
                                <button 
                                    onClick={scrollToLogin}
                                    className="text-white hover:bg-white/10 px-4 py-2 rounded-lg transition-colors"
                                >
                                    Login
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
                                <div className="flex items-center justify-between px-4 h-14 bg-gradient-to-r from-blue-600 to-purple-700">
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
                                            { to: "/admin", label: "Admin", icon: <Settings className="w-[18px] h-[18px]" />, requiresAuth: true }
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
                                            className="w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-blue-600 to-purple-700 text-white font-medium text-sm
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
        localStorage.getItem('spcarparking_auth') === 'true'
    );

    return (
        <Router>
            <div className="w-full mx-auto min-h-screen bg-gray-50">
                <Navigation 
                    isAuthenticated={isAuthenticated} 
                    setIsAuthenticated={setIsAuthenticated}
                />

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <Routes>
                        <Route path="/" element={
                            <HomePage 
                                isAuthenticated={isAuthenticated}
                                onAuthentication={setIsAuthenticated}
                            />
                        } />
                        <Route path="/new-vehicle" element={
                            <ProtectedRoute>
                                <NewVehicle />
                            </ProtectedRoute>
                        } />
                        <Route path="/managevehicles" element={
                            <ProtectedRoute>
                                <ManageVehicles />
                            </ProtectedRoute>
                        } />
                        <Route path="/revenuedashboard" element={<RevenueDashboard />} />
                        <Route path="/advance" element={<AdvanceDashboard />} />
                        <Route path="/vehicle-info" element={<VehicleInfo />} />
                        <Route path="/expenses" element={<ExpensesDashboard />} />
                        <Route path="/admin" element={
                            <ProtectedRoute>
                                <AdminPanel />
                            </ProtectedRoute>
                        } />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;