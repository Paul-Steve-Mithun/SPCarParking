import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import HomePage from './HomePage';
import NewVehicle from './NewVehicle';
import AdminPanel from './AdminPanel';
import RevenueDashboard from './RevenueDashboard';
import ManageVehicles from './ManageVehicles';
import AdvanceDashboard from './AdvanceDashboard';
import VehicleInfo from './VehicleInfo';

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
                            <NavItem to="/managevehicles" requiresAuth>Outstanding</NavItem>
                            <NavItem to="/revenuedashboard">Rent</NavItem>
                            <NavItem to="/advance">Advance</NavItem>
                            <NavItem to="/vehicle-info">Vehicle Info</NavItem>
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
                        <div className="md:hidden absolute top-16 left-0 w-full bg-gradient-to-r from-blue-600 to-purple-700 border-t border-white/10">
                            <div className="flex flex-col">
                                <NavItem to="/">Home</NavItem>
                                <NavItem to="/new-vehicle" requiresAuth>New Vehicle</NavItem>
                                <NavItem to="/managevehicles" requiresAuth>Outstanding</NavItem>
                                <NavItem to="/revenuedashboard">Rent</NavItem>
                                <NavItem to="/advance">Advance</NavItem>
                                <NavItem to="/vehicle-info">Vehicle Info</NavItem>
                                <NavItem to="/admin" requiresAuth>Admin</NavItem>
                                {isAuthenticated ? (
                                    <button
                                        onClick={handleLogout}
                                        className="text-white text-left px-4 py-2 hover:bg-white/10 w-full"
                                    >
                                        Logout
                                    </button>
                                ) : (
                                    <button 
                                        onClick={scrollToLogin}
                                        className="text-white text-left px-4 py-2 hover:bg-white/10 w-full"
                                    >
                                        Login
                                    </button>
                                )}
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