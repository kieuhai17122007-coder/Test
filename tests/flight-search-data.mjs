import assert from "node:assert/strict";
import flightCatalog from "../src/data/flights.json" with { type: "json" };
import {
  matchesFlightSearch,
  mergeFlightCatalog,
  normalizeFlight,
} from "../src/js/flight-data.js";

const customFlight = { id: "CUSTOM-01", from: "HAN", to: "SGN" };
const mergedFlights = mergeFlightCatalog([customFlight], [{ ...customFlight, status: "cancelled" }, {
  id: "CUSTOM-02",
  from: "HAN",
  to: "SGN",
}]);
assert.equal(mergedFlights.length, 2);
assert.equal(mergedFlights[0].status, "cancelled");
assert.ok(mergedFlights.some((flight) => flight.id === customFlight.id));

const legacyFlight = normalizeFlight({
  flightNumber: "VN210",
  airline: "Vietnam Airlines",
  from: "HAN",
  to: "SGN",
  departureDate: "2026-10-15",
  departureTime: "07:00",
  arrivalTime: "09:10",
  availableSeats: 120,
  price: 1500000,
  status: "available",
});

assert.equal(legacyFlight.id, "VN210");
assert.equal(legacyFlight.date, "2026-10-15");
assert.equal(legacyFlight.departure, "07:00");
assert.equal(legacyFlight.arrival, "09:10");
assert.equal(legacyFlight.seats, 120);
assert.equal(legacyFlight.status, "active");
assert.equal(
  matchesFlightSearch(legacyFlight, {
    from: "HAN",
    to: "SGN",
    departure: "2026-10-15",
    passengers: 2,
  }),
  true,
);
assert.equal(
  matchesFlightSearch(legacyFlight, {
    from: "HAN",
    to: "SGN",
    departure: "2026-10-16",
    passengers: 2,
  }),
  false,
);
assert.equal(
  matchesFlightSearch({ ...legacyFlight, status: "cancelled" }, {
    from: "HAN",
    to: "SGN",
    departure: "2026-10-15",
    passengers: 1,
  }),
  false,
);
assert.equal(
  matchesFlightSearch({ ...legacyFlight, seats: 1 }, {
    from: "HAN",
    to: "SGN",
    departure: "2026-10-15",
    passengers: 2,
  }),
  false,
);
assert.equal(normalizeFlight(null), null);

const sharedFlights = flightCatalog.map(normalizeFlight).filter(Boolean);
assert.equal(sharedFlights.length, 30);
assert.equal(new Set(sharedFlights.map((flight) => flight.id)).size, sharedFlights.length);
assert.ok(sharedFlights.every((flight) => !flight.date));
assert.ok(sharedFlights.some((flight) => matchesFlightSearch(flight, {
  from: "HAN",
  to: "SGN",
  departure: "2026-10-15",
  passengers: 2,
})));
const migratedFlights = mergeFlightCatalog(sharedFlights, sharedFlights.slice(0, 9));
assert.equal(migratedFlights.length, sharedFlights.length);
assert.ok(migratedFlights.some((flight) => flight.id === "TG130"));

console.log("Flight search data tests passed.");
