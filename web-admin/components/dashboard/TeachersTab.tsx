'use client';

import * as Types from '../../../shared/types/type';
import { sharedStyles } from '@/styles/sharedStyle';
import type { NewTeacherInput } from '@/types/forms';

export default function TeachersTab({
  teachers,
  newTeacher,
  setNewTeacher,
  onAdd,
}: {
  teachers: Types.Teacher[];
  newTeacher: NewTeacherInput;
  setNewTeacher: React.Dispatch<React.SetStateAction<NewTeacherInput>>;
  onAdd: () => void;
}) {
  const [country, setCountry] = useState<Types.CountryType>("CA");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");

  const provinces: Types.ProvinceType = {
    CA: [
      "Alberta",
      "British Columbia",
      "Manitoba",
      "New Brunswick",
      "Newfoundland and Labrador",
      "Nova Scotia",
      "Ontario",
      "Prince Edward Island",
      "Quebec",
      "Saskatchewan",
    ],
    US: [
      "Alabama",
      "Alaska",
      "Arizona",
      "California",
      "Colorado",
      "Florida",
      "New York",
      "Texas",
      "Washington" /* ... need add all states */,
    ],
  };

  let cityAutocomplete: google.maps.places.Autocomplete | null = null;
  let streetAutocomplete: google.maps.places.Autocomplete | null = null;

  const onCityLoad = (ref: google.maps.places.Autocomplete) => {
    cityAutocomplete = ref;
    
  // Set options to restrict to cities
  if (cityAutocomplete) {
    cityAutocomplete.setOptions({
      types: ['(cities)'] // This restricts to cities only
    });
  }
  };

  const onCityChanged = () => {
    const place = cityAutocomplete?.getPlace();
    if (place) {
      console.log(place);
    // With cities restriction, the place name should be the city
    setCity(place.name || "");
    }
  };

  const onAddressLoad = (ref: google.maps.places.Autocomplete) => {
    streetAutocomplete = ref;
  };

  const onAdressChanged = () => {
    const place = streetAutocomplete?.getPlace();
    console.log(place);
    if (place?.formatted_address) {
      setAddress(place.formatted_address);
    }
  };

  return (
    <div>
      <h2>Manage Teachers</h2>
      {/* Teacher create form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onAdd();
        }}
        style={sharedStyles.form}
      >
        <h3>Add New Teacher</h3>
        <label>
          First name:
          <input
            style={sharedStyles.input}
            placeholder="First Name"
            value={newTeacher.firstName}
            onChange={(e) =>
              setNewTeacher({ ...newTeacher, firstName: e.target.value })
            }
            required
          />
        </label>

        <label>
          Last name
          <input
            style={sharedStyles.input}
            placeholder="Last Name"
            value={newTeacher.lastName}
            onChange={(e) =>
              setNewTeacher({ ...newTeacher, lastName: e.target.value })
            }
            required
          />
        </label>

        <label>
          Email:
          <input
            type="email"
            style={sharedStyles.input}
            placeholder="Email"
            value={newTeacher.email}
            onChange={(e) =>
              setNewTeacher({ ...newTeacher, email: e.target.value })
            }
            required
          />
        </label>

        <label>
          Phone Number:
          <input
            style={sharedStyles.input}
            placeholder="e.g. 403 111 2284"
            value={newTeacher.phone}
            onChange={(e) =>
              setNewTeacher({ ...newTeacher, phone: e.target.value })
            }
            required
          />
        </label>

        {/* Address */}
        {/* <div style={sharedStyles.addressSection}> */}
          <LoadScript
            googleMapsApiKey={
              process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string
            }
            libraries={libraries}
          >
            {/* Country Dropdown */}
            {/* <label style={sharedStyles.address}>
              Country:
              <select
                style={sharedStyles.dropDown}
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value as Types.CountryType);
                  setProvince(""); // reset province
                }}
              >
                <option value="CA">Canada</option>
                <option value="US">United States</option>
              </select>
            </label>

            <label style={sharedStyles.address}>
              Province/State:
              <select
                style={sharedStyles.dropdown}
                value={province}
                onChange={(e) => setProvince(e.target.value)}
              >
                <option value="">Select...</option>
                {provinces[country].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label> */}

            {/* City Autocomplete */}
            {/* <label style={sharedStyles.address}>
              City:
              <Autocomplete
                onLoad={onCityLoad}
                onPlaceChanged={onCityChanged}
                options={{
                  types: ["(cities)"],
                  componentRestrictions: { country },
                }}
              >
                <input
                  style={sharedStyles.dropdown}
                  type="text"
                  placeholder="Enter city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </Autocomplete>
            </label> */}

            {/* Street Autocomplete */}
            <label>
              Address:
              <Autocomplete
                onLoad={onAddressLoad}
                onPlaceChanged={onAdressChanged}
                options={{
                  types: ["address"],
                  componentRestrictions: { country },
                }}
              >
                <input
                  style={sharedStyles.input}
                  type="text"
                  placeholder="e.g. 231 16 Ave"
                  value={address}
                  onChange={(e) => {setAddress(e.target.value);}}
                />
              </Autocomplete>
            </label>
          </LoadScript>
        {/* </div> */}

        <label>
          Start Date:
          <input
            type="date"
            style={sharedStyles.input}
            value={newTeacher.startDate}
            onChange={(e) =>
              setNewTeacher({ ...newTeacher, startDate: e.target.value })
            }
            required
          />
        </label>

        <label>
          End Date:
          <input
            type="date"
            style={sharedStyles.input}
            placeholder="End Date (optional)"
            value={newTeacher.endDate || ""}
            onChange={(e) =>
              setNewTeacher({
                ...newTeacher,
                endDate: e.target.value || undefined,
              })
            }
          />
        </label>
        <button type="submit" style={sharedStyles.button}>
          Add Teacher
        </button>
      </form>

      {/* Teacher list */}
      <div style={sharedStyles.list}>
        <h3>All Teachers</h3>
        {teachers.map((t) => (
          <div key={t.id} style={sharedStyles.listItem}>
            <div>
              <div>
                <strong>
                  {t.firstName} {t.lastName}
                </strong>{" "}
                ({t.email})
              </div>
              <div>Phone: {t.phone}</div>
              <div>Address: {t.address}</div>
              <div>
                Classes: {t.classIds?.length ? t.classIds.join(", ") : "None"}
              </div>
              <div>
                Tenure: {String(t.startDate)}
                {t.endDate ? ` → ${String(t.endDate)}` : ""}
              </div>
            </div>

            {/* Button section */}
            <div style={sharedStyles.secondaryButtonSection}>
              <button
                style={{ ...sharedStyles.button }}
                // onClick={() => assignRoleToUser(t.id, "admin", true)}
              >
                Assign Class
              </button>

              <button
                style={{ ...sharedStyles.button }}
                onClick={() => assignRoleToUser(t.id, "admin", true)}
              >
                Make Admin
              </button>

              <button
                style={{
                  ...sharedStyles.secondaryButton,
                  backgroundColor: "grey",
                }}
                // onClick={() => assignRoleToUser(t.id, "admin", true)}
              >
                Edit
              </button>

              <button
                style={{
                  ...sharedStyles.secondaryButton,
                  backgroundColor: "red",
                }}
                // onClick={() => assignRoleToUser(t.id, "admin", true)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
