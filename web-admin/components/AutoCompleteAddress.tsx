"use client"

import { useState } from 'react';

import { CountryType } from '@/utils/autoCompleteAddress';
import { Autocomplete } from "@react-google-maps/api"
import { sharedStyles } from '@/styles/sharedStyle';




export default function AutoCompleteAddress() {
    const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
        
        const [address1, setAddress1] = useState<string>("");
        const [address2, setAddress2] = useState<string>(""); // Apartment, unit, suite, or floor #
        const [city, setCity] = useState<string>("");
        const [province, setProvince] = useState<string>("");
        const [country, setCountry] = useState<string>(""); // Only Canada or US is stricted inside componentRestrictions: { country },
        const [postalcode, setPostalCode] = useState<string>(""); // Postalcode
        

        // On loading
        const  onAddressLoad = (ac: google.maps.places.Autocomplete) => {
        setAutocomplete(ac);
        };

        // On Change
        const onAdressChanged = () => {
        let place = null;

        // After Autocomplete loaded
        if (autocomplete) {
            place = autocomplete.getPlace();

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
        }
        }

    return (
        <div style={sharedStyles.container}>
            <Autocomplete
                onLoad={onAddressLoad}
                onPlaceChanged={onAdressChanged}
                options={{
                types: ["address"],
                // Only Canada or USA -- bill charging limit
                componentRestrictions:{ country: [CountryType.Ca, CountryType.Us] }, 
                }}
            >
                {/* Main address */}
                <label> Street: 
                <input
                style={sharedStyles.input}
                type="text"
                placeholder="e.g. 231 16 Ave"
                value={address1}
                onChange={(e) => setAddress1(e.target.value)}
                autoFocus
                />
                </label>
            </Autocomplete>
                
                {/* For apartment number, box, floor # */}
                <label>
                <input
                style={sharedStyles.input}
                type="text"
                placeholder="e.g. #37"
                value={address2}
                onChange={(e) => {setAddress2(e.target.value);}}
                // autoFocus
                />
                </label>
                
                {/* City Autocomplete */}
                <label style={sharedStyles.address}>
                City:
                <input
                style={sharedStyles.input}
                type="text"
                placeholder="e.g. Calary"
                value={city}
                onChange={(e) => {setCity(e.target.value);}}
                />
                </label>

                {/* Province/ State */}
                <label style={sharedStyles.address}>
                Province/State:
                <input
                style={sharedStyles.input}
                type="text"
                placeholder="e.g. BC"
                value={province}
                onChange={(e) => {setProvince(e.target.value);}}
                />
                </label>

                {/* Country */}
                <label style={sharedStyles.address}>
                Country:
                <input
                style={sharedStyles.input}
                type="text"
                placeholder="Canada or US"
                value={country}
                onChange={(e) => {setCountry(e.target.value);}}
                />
            </label>     

            {/* Postalcode */}
                <label style={sharedStyles.address}>
                Postal Code:
                <input
                style={sharedStyles.input}
                type="text"
                placeholder="e.g. T2K-1K5"
                value={postalcode}
                onChange={(e) => {setPostalCode(e.target.value);}}
                />
            </label> 
        </div>
    )
}