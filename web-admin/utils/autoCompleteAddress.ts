// // This sample uses the Places Autocomplete widget to:
// // 1. Help the user select a place
// // 2. Retrieve the address components associated with that place
// // 3. Populate the form fields with those address components.
// // This sample requires the Places library, Maps JavaScript API.
// // Include the libraries=places parameter when you first load the API.
// // For example: <script
// // src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places">


// export enum CountryType {
//     Us ='us', 
//     Ca = 'ca'
// }

// let autocomplete: google.maps.places.Autocomplete;
// let address1Field: HTMLInputElement; 
// let address2Field: HTMLInputElement; // is for Apartment, unit, suite, or floor #
// let postalField: HTMLInputElement;


// // Initial initAutocomplete()
// function initAutocomplete() {
//     address1Field = document.querySelector("#ship-address") as HTMLInputElement;
//     address2Field = document.querySelector("#address2") as HTMLInputElement;
//     postalField = document.querySelector("#postcode") as HTMLInputElement;

//     // Create the autocomplete object, restricting the search predictions to
//     // addresses in the US and Canada.
//     autocomplete = new google.maps.places.Autocomplete(address1Field, {
//         // AutoCompleteOptions?
//         componentRestrictions: { country: [CountryType.Ca, CountryType.Us] },
//         fields: ["address_components", "geometry"],
//         types: ["address"],
//     });
//     // focus input field
//     address1Field.focus()

//     // When the user selects an address from the drop-down, populate the
//     // address fields in the form.
//     autocomplete.addListener("place_changed", fillInAddress);
// }


// // detail of filleInAdress when user click on the drop-down option
// function fillInAddress() {
//     // Get the place details from the autocomplete object
//     const place = autocomplete.getPlace();
//     let address1 = "";
//     let postalcode = "";

//     // Get each component of the address from the place details, 
//     // then, fill-in the corresponding field on the form
//     // place.address_components are google.maps.GeocoderAdressComponent Objects
//     // which are documented at http://goo.gle/315i5Mr
//     for (const component of place.address_components as google.maps.GeocoderAddressComponent[]) {
//         //@ts-ignore remove once typing fixed
//         const componentType = component.types[0];

//         // Extracting each component, depends on what input user put in
//         switch (componentType) {
//             case "street_number": {
//                 address1 = `${component.long_name} ${address1}`;
//                 break;
//             }
//             case "route": {
//                 address1 += component.short_name;
//                 break;
//             }
//             case "postal_code": {
//                 postalcode = `${component.long_name}${postalcode}`;
//                 break;
//             }
//             case "postal_code_suffix": {
//                 postalcode = `${postalcode}-${component.long_name}`;
//                 break;
//             }
//             // case city
//             case "locality":
//                 (document.querySelector("#locality") as HTMLInputElement).value = component.long_name;
//                 break;
//             // state/ province: short_name like AB, BC
//             case "administrative_area_level_1": {
//                 (document.querySelector("#state") as HTMLInputElement).value = component.short_name;
//                 break;
//             }
//             case "country":
//                 (document.querySelector("#country") as HTMLInputElement).value = component.long_name;
//                 break;
//         }

//         address1Field.value = address1;
//         postalField.value = postalcode;

//         // After filling the form with address components from the Autocomplete prediction, 
//         // set cursor focus on the second address line to encounter entry of subpremise info such as apartment, unit, or floor number.
//         address2Field.focus();
//     }
// }

// interface Window {
//     initAutocomplete: () => void;
// }
// window.initAutocomplete = initAutocomplete;

