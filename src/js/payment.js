import { normalizeFlight, validateSelection, flightKey } from "./seat-store.js";
import "./auth.js";

const auth = window.TripGoAuth;
auth.updateAuthUI();

const result = document.getElementById("result");
const payButton = document.getElementById("payBtn");
const summary = document.getElementById("summary");
const flight = normalizeFlight(JSON.parse(localStorage.getItem("tripgo_selected_flight") || "{}"));
const seats = JSON.parse(localStorage.getItem("tripgo_selected_seats") || "[]");
const passenger = JSON.parse(localStorage.getItem("tripgo_passenger") || "null");
const count = Math.max(1, Number(flight.passengers || 1));
const unitPrice = Number(flight.price || 0);
const totalPrice = unitPrice * count;
const selectedSeats = seats.length
  ? seats.join(", ")
  : localStorage.getItem("tripgo_selected_seat") || "-";

function showError(message) {
  result.textContent = message;
  result.className = "error";
}

function formatPrice(value) {
  return `${Number(value).toLocaleString("vi-VN")} ₫`;
}

if (flight.id) {
  const route = document.createElement("div");
  route.className = "payment-route";
  route.innerHTML = `<div><small></small><strong></strong></div><span>→</span><div><small></small><strong></strong></div>`;
  route.querySelectorAll("small")[0].textContent = flight.from || "—";
  route.querySelectorAll("strong")[0].textContent = flight.departure || "—";
  route.querySelectorAll("small")[1].textContent = flight.to || "—";
  route.querySelectorAll("strong")[1].textContent = flight.arrival || "—";

  const lines = document.createElement("div");
  lines.className = "payment-lines";
  for (const [label, value] of [
    ["Chuyến bay", flight.id],
    ["Ghế", selectedSeats],
    ["Đơn giá", formatPrice(unitPrice)],
    ["Hành khách", String(count)],
    ["Tổng tiền", formatPrice(totalPrice)]
  ]) {
    const line = document.createElement("p");
    const name = document.createElement("span");
    const content = document.createElement(label === "Tổng tiền" ? "strong" : "b");
    if (label === "Tổng tiền") line.className = "total-line";
    name.textContent = label;
    content.textContent = value;
    line.append(name, content);
    lines.append(line);
  }
  summary.replaceChildren(route, lines);
} else {
  summary.textContent = "Chưa có thông tin chuyến bay.";
  payButton.disabled = true;
}

document.querySelectorAll(".payment-option").forEach((option) => {
  option.addEventListener("click", () => {
    document.querySelectorAll(".payment-option").forEach((item) => item.classList.remove("active"));
    option.classList.add("active");
    option.querySelector("input").checked = true;
  });
});

function createBookingCode(bookings) {
  const knownCodes = new Set(bookings.map((booking) => booking.bookingCode));
  let code;
  do {
    const randomPart = crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
    code = `TG${randomPart}`;
  } while (knownCodes.has(code));
  return code;
}

payButton.addEventListener("click", () => {
  result.textContent = "";
  result.className = "";

  if (!flight.id || !passenger || !auth.isLoggedIn()) {
    showError("Thiếu thông tin đặt vé hoặc phiên đăng nhập đã hết hạn.");
    return;
  }

  const issue = localStorage.getItem("tripgo_selected_seat_flight") !== flightKey(flight)
    ? "Vui lòng quay lại chọn ghế cho chuyến bay này."
    : validateSelection(flight, seats);
  if (issue) {
    showError(issue);
    return;
  }

  const bookings = auth.getBookings();
  const bookingCode = createBookingCode(bookings);
  const paymentMethod = document.querySelector('input[name="method"]:checked')?.value;
  if (!paymentMethod) {
    showError("Vui lòng chọn phương thức thanh toán.");
    return;
  }

  const booking = {
    bookingCode,
    userEmail: auth.getCurrentUser()?.email || passenger.email,
    passenger: {
      fullName: passenger.name,
      email: passenger.email,
      phone: passenger.phone,
      document: passenger.document
    },
    flightId: flight.id,
    date: flight.date,
    departureDate: flight.date,
    flight: {
      date: flight.date,
      flightNumber: flight.id,
      id: flight.id,
      from: flight.from,
      to: flight.to,
      departure: flight.departure,
      arrival: flight.arrival
    },
    seat: seats.join(", "),
    seats,
    passengerCount: count,
    ticketType: flight.classType || "Phổ thông",
    baggage: "Không có",
    price: unitPrice,
    fee: 0,
    totalPrice,
    status: "Đã đặt vé",
    paymentStatus: "Thanh toán mô phỏng — chưa phát sinh giao dịch thật",
    paymentMethod,
    createdAt: new Date().toISOString()
  };

  payButton.disabled = true;
  try {
    auth.saveBookings([...bookings, booking]);
    localStorage.removeItem("tripgo_selected_seats");
    localStorage.removeItem("tripgo_selected_seat");
    localStorage.removeItem("tripgo_selected_seat_flight");
    window.location.assign(`/src/pages/booking-success.html?bookingCode=${encodeURIComponent(bookingCode)}`);
  } catch (error) {
    console.error("Không thể lưu đặt vé:", error);
    payButton.disabled = false;
    showError("Không thể lưu vé. Vui lòng kiểm tra bộ nhớ trình duyệt rồi thử lại.");
  }
});
