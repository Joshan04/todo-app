import React, { useEffect, useRef } from 'react';
import { Calendar, X } from 'lucide-react';

interface DatePickerProps {
    currentDate?: number | null;
    onSelect: (date: number | null) => void;
    onClose: () => void;
}

export const DatePicker: React.FC<DatePickerProps> = ({ currentDate, onSelect, onClose }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    const getQuickDate = (type: 'today' | 'tomorrow' | 'nextWeek'): number => {
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Start of day

        switch (type) {
            case 'today':
                return now.getTime();
            case 'tomorrow':
                now.setDate(now.getDate() + 1);
                return now.getTime();
            case 'nextWeek':
                now.setDate(now.getDate() + 7);
                return now.getTime();
        }
    };

    const handleSelect = (type: 'today' | 'tomorrow' | 'nextWeek' | 'clear') => {
        if (type === 'clear') {
            onSelect(null);
        } else {
            onSelect(getQuickDate(type));
        }
        onClose();
    };

    const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value; // YYYY-MM-DD format
        if (value) {
            const date = new Date(value);
            date.setHours(0, 0, 0, 0);
            onSelect(date.getTime());
        }
    };

    const formatDateForInput = (timestamp: number | null | undefined): string => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toISOString().split('T')[0]; // YYYY-MM-DD
    };

    return (
        <div
            ref={containerRef}
            className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-lg py-2 w-48 z-20"
            role="dialog"
            aria-label="Due date picker"
        >
            {/* Exact Date Input */}
            <div className="px-3 py-2">
                <label htmlFor="date-input" className="text-xs text-gray-500 font-medium block mb-1">
                    Pick a date
                </label>
                <input
                    id="date-input"
                    type="date"
                    value={formatDateForInput(currentDate)}
                    onChange={handleDateInputChange}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Select exact date"
                />
            </div>

            <div className="h-px bg-gray-200 my-1" />

            {/* Quick Actions */}
            <button
                onClick={() => handleSelect('today')}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                role="menuitem"
            >
                <Calendar size={14} className="text-gray-500" />
                Today
            </button>
            <button
                onClick={() => handleSelect('tomorrow')}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                role="menuitem"
            >
                <Calendar size={14} className="text-gray-500" />
                Tomorrow
            </button>
            <button
                onClick={() => handleSelect('nextWeek')}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                role="menuitem"
            >
                <Calendar size={14} className="text-gray-500" />
                Next week
            </button>
            {currentDate && (
                <>
                    <div className="h-px bg-gray-200 my-1" />
                    <button
                        onClick={() => handleSelect('clear')}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600"
                        role="menuitem"
                    >
                        <X size={14} />
                        Clear due date
                    </button>
                </>
            )}
        </div>
    );
};
