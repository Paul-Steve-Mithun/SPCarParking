import React, { useEffect } from 'react';
import { X, Home, Calendar, TrendingUp } from 'lucide-react';

export function TakeHomeHistoryModal({ isOpen, onClose, historyData, isDarkMode }) {
    if (!isOpen) return null;

    useEffect(() => {
        // Prevent background scrolling when modal is open
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Theme values
    const bgColor = isDarkMode ? 'bg-gray-800' : 'bg-white';
    const textColor = isDarkMode ? 'text-gray-100' : 'text-gray-900';
    const subTextColor = isDarkMode ? 'text-gray-400' : 'text-gray-500';
    const borderColor = isDarkMode ? 'border-gray-700' : 'border-gray-200';
    const headerBg = isDarkMode ? 'bg-gray-800' : 'bg-white';

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const formatMonthYear = ({ month, year }) => {
        return `${monthNames[month]} ${year}`;
    };

    const HistorySection = ({ user, data, colorClass, bgClass, iconBgClass, iconColorClass }) => {
        const total = data.reduce((sum, item) => sum + item.amount, 0);

        return (
            <div className={`rounded-xl border ${borderColor} overflow-hidden flex flex-col h-full`}>
                <div className={`p-4 border-b ${borderColor} ${bgClass} flex justify-between items-center`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${iconBgClass}`}>
                            <span className={`text-lg font-bold ${iconColorClass}`}>{user[0]}</span>
                        </div>
                        <div>
                            <h3 className={`text-lg font-bold ${textColor}`}>{user}</h3>
                            <p className={`text-xs ${subTextColor}`}>Total Take Home</p>
                        </div>
                    </div>
                    <div className={`text-xl font-bold ${colorClass}`}>
                        ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                </div>

                <div className={`flex-1 overflow-y-auto p-2 ${isDarkMode ? 'bg-gray-900/50' : 'bg-gray-50/50'}`}>
                    {data.length === 0 ? (
                        <div className={`flex flex-col items-center justify-center h-48 ${subTextColor}`}>
                            <Calendar className="w-8 h-8 opacity-20 mb-2" />
                            <p className="text-sm">No take home history yet</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {data.map((item, index) => (
                                <div
                                    key={index}
                                    className={`p-3 rounded-lg border flex justify-between items-center transition-all hover:shadow-sm ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-1.5 rounded-md ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                            <Calendar className={`w-4 h-4 ${subTextColor}`} />
                                        </div>
                                        <span className={`font-medium text-sm ${textColor}`}>
                                            {formatMonthYear(item)}
                                        </span>
                                    </div>
                                    <span className={`font-bold text-lg ${colorClass}`}>
                                        ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm transition-all animate-fade-in ${isDarkMode ? 'bg-black/70' : 'bg-black/60'}`}>
            <div
                className={`${bgColor} rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden ring-1 ${isDarkMode ? 'ring-white/10' : 'ring-gray-900/5'}`}
            >
                {/* Header */}
                <div className={`p-4 sm:p-6 border-b ${borderColor} ${headerBg} flex justify-between items-center`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${isDarkMode ? 'bg-orange-900/30' : 'bg-orange-100'}`}>
                            <Home className={`w-6 h-6 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`} />
                        </div>
                        <div>
                            <h2 className={`text-xl font-bold ${textColor}`}>Take Home History</h2>
                            <p className={`${subTextColor} text-sm mt-0.5`}>Monthly breakdown since February 2026</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-2 rounded-full transition-all ${isDarkMode ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50' : 'text-gray-400 hover:text-gray-500 hover:bg-gray-100'}`}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content - Split View */}
                <div className={`flex-1 overflow-y-auto p-4 sm:p-6 ${isDarkMode ? 'bg-gray-900/30' : 'bg-gray-50'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full min-h-[500px]">
                        {/* Balu's Section - Blue Theme */}
                        <div className="h-full">
                            <HistorySection
                                user="Balu"
                                data={historyData.balu}
                                colorClass={isDarkMode ? 'text-blue-400' : 'text-blue-600'}
                                bgClass={isDarkMode ? 'bg-blue-900/10' : 'bg-blue-50'}
                                iconBgClass={isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'}
                                iconColorClass={isDarkMode ? 'text-blue-400' : 'text-blue-700'}
                            />
                        </div>

                        {/* Mani's Section - Green Theme */}
                        <div className="h-full">
                            <HistorySection
                                user="Mani"
                                data={historyData.mani}
                                colorClass={isDarkMode ? 'text-green-400' : 'text-green-600'}
                                bgClass={isDarkMode ? 'bg-green-900/10' : 'bg-green-50'}
                                iconBgClass={isDarkMode ? 'bg-green-900/30' : 'bg-green-100'}
                                iconColorClass={isDarkMode ? 'text-green-400' : 'text-green-700'}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
