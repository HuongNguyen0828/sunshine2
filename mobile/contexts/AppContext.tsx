// contexts/AppContext.tsx
import React, { ReactNode, createContext, useContext, useState } from 'react';

interface AppContextType {
    sharedData: any; // presumely including {teacher, classes, events...}
    setSharedData: (update: Partial<any> | ((prev: any) => Partial<any>)) => void;
    updateSharedData: (key: string, value: any) => void;
    clearSharedData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);


export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [sharedData, setSharedData] = useState<any>({});

    // Helper function to update specific fields
    const updateSharedData = (key: string, value: any) => {
        setSharedData((prev: any) => ({
            ...prev,
            [key]: value
        }));
    };

    // Helper to clear all data
    const clearSharedData = () => {
        setSharedData({});
    };

    const value: AppContextType = {
        sharedData,
        setSharedData,
        updateSharedData,
        clearSharedData
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within AppProvider');
    }
    return context;
};