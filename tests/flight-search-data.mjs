import assert from "node:assert/strict";
import {
  createDemoFlights,
  matchesFlightSearch,
  mergeFlightCatalog,
  normalizeFlight,
} from "../src/js/flight-data.js";

const airports = ["HAN", "SGN", "DAD", "CXR", "PQC", "HPH", "HUI", "VCA", "UIH", "VDO"];
const demoFlights = createDemoFlights();
assert.equal(demoFlights.length, airports.length * (airports.length - 1) * 2);

for (const from of airports) {
  for (const to of airports) {
    if (from === to) continue;
    const routeFlights = demoFlights.filter((flight) => flight.from === from && flight.to === to);
    assert.equal(routeFlights.length, 2, `${from} → ${to} should have two demo flights`);

    for (const departure of ["2026-10-14", "2027-05-01"]) {
      for (let passengers = 1; passengers <= 9; passengers += 1) {
        assert.ok(
          routeFlights.some((flight) => matchesFlightSearch(flight, {
            from, to, departure, passengers,
          })),
          `${from} → ${to} should match ${departure} for ${passengers} passengers`,
        );
      }
    }
  }
}

const changedDemoFlight = { ...demoFlights[0], status: "cancelled" };
const customFlight = { id: "CUSTOM-01", from: "HAN", to: "SGN" };
const mergedFlights = mergeFlightCatalog(demoFlights, [changedDemoFlight, customFlight]);
assert.equal(mergedFlights.length, demoFlights.length + 1);
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

console.log("Flight search data tests passed.");
