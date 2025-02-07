import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import HomePage from './HomePage';
import NewVehicle from './NewVehicle';
import AdminPanel from './AdminPanel';
import RevenueDashboard from './RevenueDashboard';
import ManageVehicles from './ManageVehicles';

function App() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const NavItem = ({ to, children }) => (
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

    return (
        <Router>
            <div className="w-full mx-auto min-h-screen bg-gray-50">
                <nav className="bg-gradient-to-r from-blue-600 to-purple-700 shadow-lg sticky top-0 z-50">
                    <div className="relative">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex items-center justify-between h-16">
                                {/* Logo */}
                                <div className="flex items-center">
                                    <NavLink 
                                        to="/" 
                                        className="text-white text-xl font-bold tracking-wider hover:opacity-90 transition-opacity"
                                    >
                                        SP CAR PARKING
                                    </NavLink>
                                </div>

                                {/* Desktop Navigation */}
                                <div className="hidden md:flex items-center space-x-4">
                                    <NavItem to="/">Home</NavItem>
                                    <NavItem to="/new-vehicle">New Vehicle</NavItem>
                                    <NavItem to="/managevehicles">Manage</NavItem>
                                    <NavItem to="/revenuedashboard">Revenue</NavItem>
                                    <NavItem to="/admin">Admin</NavItem>
                                </div>

                                {/* Mobile Menu Button */}
                                <div className="md:hidden">
                                    <button
                                        onClick={toggleMenu}
                                        className="p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
                                    >
                                        {isMenuOpen ? (
                                            <X className="h-6 w-6" />
                                        ) : (
                                            <Menu className="h-6 w-6" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Mobile Navigation - Full Screen Overlay */}
                            {isMenuOpen && (
                                <div className="md:hidden absolute top-16 left-0 w-full bg-gradient-to-r from-blue-600 to-purple-700 border-t border-white/10">
                                    <div className="flex flex-col">
                                        <NavItem to="/">Home</NavItem>
                                        <NavItem to="/new-vehicle">New Vehicle</NavItem>
                                        <NavItem to="/managevehicles">Manage</NavItem>
                                        <NavItem to="/revenuedashboard">Revenue</NavItem>
                                        <NavItem to="/admin">Admin</NavItem>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </nav>

                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <Routes>
                        <Route path='/' element={<HomePage />} />
                        <Route path='/new-vehicle' element={<NewVehicle />} />
                        <Route path='/admin' element={<AdminPanel />} />
                        <Route path='/revenuedashboard' element={<RevenueDashboard />} />
                        <Route path='/managevehicles' element={<ManageVehicles />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;