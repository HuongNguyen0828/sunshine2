"use client"

import { useState, useEffect, useCallback } from 'react';

import { CountryType } from '@/utils/autoCompleteAddress';
import { Autocomplete } from "@react-google-maps/api"
import { sharedStyles } from '@/styles/sharedStyle';
import { Teacher as type } from "../../shared/types/type"


export interface Address {
    address1: string;
    address2?: string;
    city: string;
    province: string;
    country: string;
    postalcode?: string;
}
interface AutoCompleteAddressProps {
    onAddressChanged: (address: Address) => void;
    addressValues: Address;
    disabled?: boolean // optional
}


export default function AutoCompleteAddress({ onAddressChanged, addressValues, disabled }: AutoCompleteAddressProps) {
    const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

    const [address1, setAddress1] = useState<string>("");
    const [address2, setAddress2] = useState<string>(""); // Apartment, unit, suite, or floor #
    const [city, setCity] = useState<string>("");
    const [province, setProvince] = useState<string>("");
    const [country, setCountry] = useState<string>(""); // Only Canada or US is stricted inside componentRestrictions: { country },
    const [postalcode, setPostalCode] = useState<string>(""); // Postalcode
    const [loading, setLoading] = useState<boolean>(true);

    // Fix: Use useCallback to prevent unnecessary re-renders
    const onAddressLoad = useCallback((ac: google.maps.places.Autocomplete) => {
        setAutocomplete(ac);
    }, []);

    // On Change
    const handleAddress = useCallback(() => {
        setLoading(true);

        let place = null;
        if (!autocomplete) return;

        // After Autocomplete loaded
        place = autocomplete.getPlace();

        if (!place.address_components) return;

        // Extracting each component
        let streetNumber = "";
        let route = "";
        let postalCodeV = "";

        for (const component of place.address_components as google.maps.GeocoderAddressComponent[]) {
            //@ts-ignore remove once typing fixed
            const componentType = component.types[0];

            // Extracting each component, depends on what input user put in
            switch (componentType) {
                case "street_number": {
                    streetNumber = component.long_name;
                    break;
                }
                case "route": {
                    route = component.short_name;
                    break;
                }
                case "postal_code": {
                    postalCodeV = component.long_name;
                    break;
                }
                case "postal_code_suffix": {
                    postalCodeV = component.long_name;
                    break;
                }
                // case city
                case "locality": {
                    setCity(component.long_name);
                    break;
                }
                // state/ province: short_name like AB, BC
                case "administrative_area_level_1": {
                    setProvince(component.short_name);
                    break;
                }
                case "country": {
                    setCountry(component.long_name);
                    break;
                }
            }
        }
        // set address 1, set Postal code: as they have varied in value
        setAddress1(`${streetNumber} ${route}`.trim());
        setPostalCode(postalCodeV);
        setLoading(false);
    }, [autocomplete]);

    // Also call parent whenever manual input changes, 
    // update after HandleAddress already set state of address components
    useEffect(() => {
        // Only when autoComplete loaded
        const addressData = { address1, address2, city, province, country, postalcode };

        // Only call if we have meaningful data
        if (address1 || address2 || city || province || country || postalcode) {
            onAddressChanged(addressData);
        }
    }, [address1, address2, city, province, country, postalcode, onAddressChanged]);


    return (
        <div style={sharedStyles.container}>
            <Autocomplete
                onLoad={onAddressLoad}
                onPlaceChanged={handleAddress}
                options={{
                    types: ["address"],
                    // Only Canada or USA -- bill charging limit
                    componentRestrictions: { country: [CountryType.Ca, CountryType.Us] },
                }}
            >

                {/* Street Address */}
                <label className="block">
                    <span className="text-gray-700 font-medium mb-1 block">Street Address *</span>
                    <input
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 read-only:bg-gray-100"
                        placeholder="123 Main St"
                        value={addressValues ? addressValues.address1 : address1}
                        onChange={(e) => setAddress1(e.target.value)}
                        required
                        readOnly={disabled}
                    />
                </label>
            </Autocomplete>


            {/* Apartment / Postal Code */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <label className="block">
                    <span className="text-gray-700 font-medium mb-1 block">Apt, Unit, Suite, or Floor #</span>
                    <input
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 read-only:bg-gray-100"
                        placeholder="Unit 37"
                        value={addressValues ? addressValues.address2 : address2}
                        onChange={(e) => setAddress2(e.target.value)}
                        readOnly={disabled}
                    />
                </label>

                <label className="block">
                    <span className="text-gray-700 font-medium mb-1 block">Postal Code *</span>
                    <input
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 read-only:bg-gray-100"
                        placeholder="T2K 1K5"
                        value={addressValues ? addressValues.postalcode : postalcode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        required
                        readOnly={disabled}

                    />
                </label>
            </div>

            {/* City / Province / Country */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <label className="block">
                    <span className="text-gray-700 font-medium mb-1 block">City *</span>
                    <input
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 read-only:bg-gray-100"
                        placeholder="Calgary"
                        value={addressValues ? addressValues.city : city}
                        onChange={(e) => setCity(e.target.value)}
                        required
                        readOnly={disabled}
                    />
                </label>

                <label className="block">
                    <span className="text-gray-700 font-medium mb-1 block">Province *</span>
                    <input
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 read-only:bg-gray-100"
                        placeholder="AB"
                        value={addressValues ? addressValues.province : province}
                        onChange={(e) => setProvince(e.target.value)}
                        required
                        readOnly={disabled}
                    />
                </label>

                <label className="block">
                    <span className="text-gray-700 font-medium mb-1 block">Country *</span>
                    <input
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 read-only:bg-gray-100"
                        placeholder="Canada"
                        value={addressValues ? addressValues.country : country}
                        onChange={(e) => setCountry(e.target.value)}
                        required
                        readOnly={disabled}
                    />
                </label>
            </div>
        </div>
    )
}