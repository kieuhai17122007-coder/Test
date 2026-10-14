const AIRPORTS = ["HAN", "SGN", "DAD", "CXR", "PQC", "HPH", "HUI", "VCA", "UIH", "VDO"];
const AIRLINES = ["Vietnam Airlines", "Vietjet Air", "Bamboo Airways"];

export function createDemoFlights() {
  const flights = [];
  let routeNumber = 0;

  for (const from of AIRPORTS) {
    for (const to of AIRPORTS) {
      if (from === to) continue;
      routeNumber += 1;

      for (let option = 0; option < 2; option += 1) {
        const departureMinutes = (6 + option * 10) * 60 + (routeNumber % 4) * 15;
        const durationMinutes = 75 + (routeNumber % 5) * 15;
        const arrivalMinutes = departureMinutes + durationMinutes;
        const formatTime = (minutes) => {
          const hour = Math.floor(minutes / 60) % 24;
          const minute = minutes % 60;
          return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
        };

        flights.push({
          id: `DEMO-${from}-${to}-${option + 1}`,
          airline: AIRLINES[(routeNumber + option) % AIRLINES.length],
          from,
          to,
          departure: formatTime(departureMinutes),
          arrival: formatTime(arrivalMinutes),
          price: 700000 + ((routeNumber * 7 + option * 3) % 10) * 100000,
          seats: 120,
          status: "active"
        });
      }
    }
  }

  return flights;
}

export function normalizeFlight(flight) {
  if (!flight || typeof flight !== "object" || Array.isArray(flight)) {
    return null;
  }

  return {
    ...flight,
    id: flight.id ?? flight.flightNumber ?? "",
    date: flight.date ?? flight.departureDate ?? "",
    departure: flight.departure ?? flight.departureTime ?? "",
    arrival: flight.arrival ?? flight.arrivalTime ?? "",
    seats: flight.seats ?? flight.availableSeats,
    status: flight.status === "available" ? "active" : flight.status
  };
}

export function mergeFlightCatalog(defaultFlights, savedFlights) {
  const savedById = new Map(savedFlights.map((flight) => [flight.id, flight]));
  const defaultIds = new Set(defaultFlights.map((flight) => flight.id));

  return [
    ...defaultFlights.map((flight) => savedById.get(flight.id) ?? flight),
    ...savedFlights.filter((flight) => !defaultIds.has(flight.id))
  ];
}

export function matchesFlightSearch(flight, { from, to, departure, passengers }) {
  return flight.from === from &&
    flight.to === to &&
    (flight.status === undefined || flight.status === "active") &&
    (!flight.date || flight.date === departure) &&
    (flight.seats === undefined || Number(flight.seats) >= passengers);
}
