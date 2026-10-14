import "./auth.js";

const auth = window.TripGoAuth;
if (!auth.requireLogin()) {
  throw new Error("Đăng nhập để xem vé đã đặt.");
}
auth.updateAuthUI();

const ticket = document.getElementById("ticket");
const actions = document.querySelector(".success-actions");
const missing = document.getElementById("missingBooking");
const paymentPending = document.getElementById("paymentPending");
const params = new URLSearchParams(window.location.search);
const bookingCode = params.get("bookingCode");
const user = auth.getCurrentUser();
const paymentLabels = {
  qr: "Quét mã QR",
  "domestic-card": "Thẻ nội địa",
  "international-card": "Thẻ quốc tế",
  ewallet: "Ví điện tử"
};
const booking = bookingCode
  ? auth.getBookings().find((item) =>
      item.bookingCode === bookingCode &&
      item.userEmail?.toLowerCase() === user?.email?.toLowerCase()
    )
  : null;

if (!booking) {
  missing.hidden = false;
} else if (booking.status !== "Đã đặt vé" || booking.paymentState !== "paid" || /demo|mô phỏng/i.test(booking.paymentStatus || "")) {
  paymentPending.hidden = false;
  const isCancelled = booking.status === "Đã hủy";
  const isUnverified = booking.status === "Đã đặt vé" &&
    (booking.paymentState !== "paid" || /demo|mô phỏng/i.test(booking.paymentStatus || ""));
  document.getElementById("pendingTitle").textContent = isCancelled
    ? "Đơn hàng đã bị hủy"
    : isUnverified ? "Chưa xác minh thanh toán" : "Đơn hàng chưa hoàn tất";
  document.getElementById("pendingMessage").textContent = isCancelled
    ? "Đơn hàng đã bị hủy và chưa được xác nhận thanh toán."
    : isUnverified
      ? "Chưa nhận được xác nhận đáng tin cậy từ cổng thanh toán. Vui lòng liên hệ TripGo để kiểm tra trước khi sử dụng vé."
      : `Trạng thái thanh toán: ${booking.paymentStatus || "Chờ thanh toán"}. Vé chỉ được xác nhận sau khi thanh toán được xác minh.`;
  if (!isCancelled && !isUnverified) {
    const resumePayment = document.getElementById("resumePayment");
    resumePayment.href = `/src/pages/payment.html?bookingCode=${encodeURIComponent(booking.bookingCode)}`;
    resumePayment.hidden = false;
  }
} else {
  const airports = {
    HAN: "Hà Nội",
    SGN: "TP. Hồ Chí Minh",
    DAD: "Đà Nẵng",
    CXR: "Nha Trang",
    PQC: "Phú Quốc",
    HPH: "Hải Phòng",
    HUI: "Huế",
    VCA: "Cần Thơ",
    UIH: "Quy Nhơn",
    VDO: "Vân Đồn"
  };
  const flight = booking.flight || {};
  const passengerCount = Math.max(1, Number(booking.passengerCount || 1));
  const seats = Array.isArray(booking.seats)
    ? booking.seats.join(", ")
    : booking.seats || booking.seat || "Chưa chọn";
  const unitPrice = Number(booking.price || 0);
  const totalPrice = Number(booking.totalPrice ?? unitPrice * passengerCount);
  const formatPrice = (value) => `${Number(value).toLocaleString("vi-VN")} ₫`;
  const departureDate = booking.date || booking.departureDate || flight.date;
  const bookingDate = booking.createdAt
    ? new Date(booking.createdAt).toLocaleString("vi-VN")
    : "—";

  const values = {
    bookingCode: booking.bookingCode,
    bookingStatus: booking.status || "Đã đặt vé",
    paymentStatus: booking.paymentStatus || "Chưa xác nhận thanh toán",
    flightNumber: booking.flightId || flight.flightNumber || flight.id || "—",
    fromCode: flight.from || booking.from || "—",
    fromName: airports[flight.from || booking.from] || "—",
    toCode: flight.to || booking.to || "—",
    toName: airports[flight.to || booking.to] || "—",
    departureTime: flight.departure || "—",
    arrivalTime: flight.arrival || "—",
    departureDate: departureDate
      ? new Date(`${departureDate}T00:00:00`).toLocaleDateString("vi-VN")
      : "—",
    passengerName: booking.passenger?.fullName || booking.passenger?.name || "—",
    passengerCount: `${passengerCount} hành khách`,
    ticketClass: booking.ticketType || booking.classType || "Phổ thông",
    seatNumbers: seats,
    ticketCount: `${passengerCount} vé`,
    paymentMethod: paymentLabels[booking.paymentMethod] || booking.paymentMethod || "—",
    bookingTime: bookingDate,
    unitPrice: formatPrice(unitPrice),
    priceTicketCount: `${passengerCount} vé`,
    totalPrice: formatPrice(totalPrice)
  };

  for (const [id, value] of Object.entries(values)) {
    document.getElementById(id).textContent = value;
  }

  ticket.hidden = false;
  actions.hidden = false;
  document.getElementById("printTicket").addEventListener("click", () => window.print());
}
