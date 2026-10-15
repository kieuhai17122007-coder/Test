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
