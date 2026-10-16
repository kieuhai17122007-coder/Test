import "dotenv/config";
import { createHash } from "node:crypto";
import cors from "cors";
import express from "express";
import { Resend } from "resend";

const app = express();
const port = Number(process.env.PORT || 3000);
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
const allowedOrigin = new URL(clientUrl).origin;
const acceptedEmails = new Map();
const requestCounts = new Map();
const rateLimitWindowMs = 15 * 60 * 1000;
const rateLimitMax = 8;

app.disable("x-powered-by");
app.use(
  cors({
    origin(origin, callback) {
      callback(null, !origin || origin === allowedOrigin);
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  }),
);
app.use(express.json({ limit: "16kb", strict: true }));

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function readText(value, maxLength) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (
    !normalized ||
    normalized.length > maxLength ||
    /[\u0000-\u001f\u007f]/.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

function validateBooking(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;

  const bookingCode = readText(body.bookingCode, 20);
  const email = readText(body.email, 254);
  const passengerName = readText(body.passengerName, 120);
  const flightNumber = readText(body.flightNumber, 32);
  const from = readText(body.from, 12);
  const to = readText(body.to, 12);
  const departureDate = readText(body.departureDate, 10);
  const departureTime = readText(body.departureTime || "—", 5);
  const arrivalTime = readText(body.arrivalTime || "—", 5);
  const totalPrice = Number(body.totalPrice);
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const dateParts = departureDate?.split("-").map(Number);
  const validCalendarDate = Boolean(
    departureDate &&
      datePattern.test(departureDate) &&
      dateParts?.length === 3 &&
      dateParts.every(Number.isInteger) &&
      dateParts[0] >= 1900 &&
      dateParts[1] >= 1 &&
      dateParts[1] <= 12 &&
      dateParts[2] >= 1 &&
      dateParts[2] <= 31 &&
      new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]))
        .toISOString()
        .startsWith(departureDate),
  );

  if (
    !bookingCode ||
    !/^TG[A-Z0-9]{10}$/.test(bookingCode) ||
    !email ||
    email.length > 254 ||
    !emailPattern.test(email) ||
    !passengerName ||
    !flightNumber ||
    !from ||
    !to ||
    !departureDate ||
    !datePattern.test(departureDate) ||
    !validCalendarDate ||
    !departureTime ||
    !/^([01]?\d|2[0-3]):[0-5]\d$|^—$/.test(departureTime) ||
    !arrivalTime ||
    !/^([01]?\d|2[0-3]):[0-5]\d$|^—$/.test(arrivalTime) ||
    !Number.isSafeInteger(totalPrice) ||
    totalPrice <= 0 ||
    totalPrice > 1_000_000_000
  ) {
    return null;
  }

  return {
    bookingCode,
    email,
    passengerName,
    flightNumber,
    from,
    to,
    departureDate,
    departureTime,
    arrivalTime,
    totalPrice,
  };
}

function formatPrice(value) {
  return `${value.toLocaleString("vi-VN")} ₫`;
}

function createEmailContent(booking) {
  const fields = {
    bookingCode: escapeHtml(booking.bookingCode),
    passengerName: escapeHtml(booking.passengerName),
    flightNumber: escapeHtml(booking.flightNumber),
    from: escapeHtml(booking.from),
    to: escapeHtml(booking.to),
    departureDate: escapeHtml(booking.departureDate),
    departureTime: escapeHtml(booking.departureTime),
    arrivalTime: escapeHtml(booking.arrivalTime),
    totalPrice: escapeHtml(formatPrice(booking.totalPrice)),
  };
  const departure = `${booking.departureDate} · ${booking.departureTime}`;
  const html = `<!doctype html>
<html lang="vi">
  <body style="margin:0;padding:24px;background:#f3f6fa;font-family:Arial,Helvetica,sans-serif;color:#18324d">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e1e8f0;border-radius:16px">
      <tr><td style="padding:28px 32px;background:#176bc4;color:#ffffff;border-radius:16px 16px 0 0">
        <div style="font-size:13px;font-weight:bold;letter-spacing:2px">✈ TRIPGO</div>
        <h1 style="margin:14px 0 6px;font-size:24px">Xác nhận đặt vé</h1>
        <p style="margin:0;font-size:14px;line-height:1.6">Xin chào ${fields.passengerName}, thông tin đặt chỗ của bạn đã được gửi đến TripGo.</p>
      </td></tr>
      <tr><td style="padding:26px 32px">
        <p style="margin:0 0 6px;color:#63758a;font-size:12px;font-weight:bold;letter-spacing:1px">MÃ ĐẶT CHỖ</p>
        <p style="margin:0 0 22px;color:#176bc4;font-size:25px;font-weight:bold;letter-spacing:2px">${fields.bookingCode}</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">
          <tr><td style="padding:10px 0;border-bottom:1px solid #edf1f5;color:#63758a">Hành khách</td><td align="right" style="padding:10px 0;border-bottom:1px solid #edf1f5;font-weight:bold">${fields.passengerName}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #edf1f5;color:#63758a">Chuyến bay</td><td align="right" style="padding:10px 0;border-bottom:1px solid #edf1f5;font-weight:bold">${fields.flightNumber}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #edf1f5;color:#63758a">Hành trình</td><td align="right" style="padding:10px 0;border-bottom:1px solid #edf1f5;font-weight:bold">${fields.from} → ${fields.to}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #edf1f5;color:#63758a">Khởi hành</td><td align="right" style="padding:10px 0;border-bottom:1px solid #edf1f5;font-weight:bold">${fields.departureDate} · ${fields.departureTime}</td></tr>
          <tr><td style="padding:10px 0;border-bottom:1px solid #edf1f5;color:#63758a">Dự kiến đến</td><td align="right" style="padding:10px 0;border-bottom:1px solid #edf1f5;font-weight:bold">${fields.arrivalTime}</td></tr>
          <tr><td style="padding:14px 0;color:#18324d;font-weight:bold">Tổng tiền được cung cấp</td><td align="right" style="padding:14px 0;color:#176bc4;font-size:18px;font-weight:bold">${fields.totalPrice}</td></tr>
        </table>
        <div style="margin-top:18px;padding:14px 16px;border-radius:10px;background:#fff8e8;color:#71520d;font-size:13px;line-height:1.6">
          <strong>Trạng thái đặt vé:</strong> Thông tin do trình duyệt gửi, chưa được máy chủ TripGo xác minh.<br>
          <strong>Trạng thái thanh toán:</strong> Chưa được máy chủ TripGo xác minh. Email này không xác nhận đã thanh toán và không thay thế vé điện tử.
        </div>
        <p style="margin:20px 0 0;color:#63758a;font-size:13px;line-height:1.6">Vui lòng kiểm tra trạng thái trong hệ thống TripGo trước khi khởi hành. Nếu cần hỗ trợ, hãy liên hệ kênh hỗ trợ chính thức mà bạn đã sử dụng để đặt vé.</p>
      </td></tr>
      <tr><td style="padding:16px 32px;background:#f7f9fc;color:#77879a;font-size:12px;line-height:1.5">TripGo · Thông báo được gửi tự động. Vui lòng không trả lời email này.</td></tr>
    </table>
  </body>
</html>`;
  const text = [
    "TripGo - Xác nhận đặt vé",
    `Xin chào ${booking.passengerName},`,
    `Mã đặt chỗ: ${booking.bookingCode}`,
    `Hành khách: ${booking.passengerName}`,
    `Chuyến bay: ${booking.flightNumber}`,
    `Hành trình: ${booking.from} → ${booking.to}`,
    `Khởi hành: ${departure}`,
    `Dự kiến đến: ${booking.arrivalTime}`,
    `Tổng tiền được cung cấp: ${formatPrice(booking.totalPrice)}`,
    "Trạng thái đặt vé: Thông tin do trình duyệt gửi, chưa được máy chủ TripGo xác minh.",
    "Trạng thái thanh toán: Chưa được máy chủ TripGo xác minh. Email này không xác nhận đã thanh toán và không thay thế vé điện tử.",
    "Vui lòng kiểm tra trạng thái trong hệ thống TripGo trước khi khởi hành.",
  ].join("\n");

  return { html, text };
}

function allowSendRate(request, response, next) {
  const now = Date.now();
  const key = request.ip;
  const record = requestCounts.get(key);
  if (!record || now - record.startedAt >= rateLimitWindowMs) {
    if (requestCounts.size >= 10_000) {
      for (const [ip, entry] of requestCounts) {
        if (now - entry.startedAt >= rateLimitWindowMs) {
          requestCounts.delete(ip);
        }
      }
      if (requestCounts.size >= 10_000) {
        requestCounts.delete(requestCounts.keys().next().value);
      }
    }
    requestCounts.set(key, { startedAt: now, count: 1 });
    return next();
  }
  if (record.count >= rateLimitMax) {
    return response.status(429).json({
      error: "Đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.",
    });
  }
  record.count += 1;
  return next();
}

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.post(
  "/api/send-booking-email",
  allowSendRate,
  async (request, response) => {
    if (request.get("origin") !== allowedOrigin) {
      return response.status(403).json({
        error: "Nguồn gửi yêu cầu không được phép.",
      });
    }
    const booking = validateBooking(request.body);
    if (!booking) {
      return response.status(400).json({
        error: "Thông tin đặt vé hoặc email chưa hợp lệ.",
      });
    }
    if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
      return response.status(503).json({
        error: "Dịch vụ gửi email chưa được cấu hình. Vé của bạn vẫn được giữ nguyên.",
      });
    }

    const idempotencyKey = createHash("sha256")
      .update(`${booking.bookingCode.toUpperCase()}\n${booking.email.toLowerCase()}`)
      .digest("hex");
    const existing = acceptedEmails.get(idempotencyKey);
    if (existing?.accepted) {
      return response.json({
        status: "already_accepted",
        message: "Resend đã tiếp nhận email này trước đó.",
      });
    }
    if (existing?.promise) {
      try {
        await existing.promise;
        return response.json({
          status: "already_accepted",
          message: "Resend đã tiếp nhận email này trước đó.",
        });
      } catch {
        return response.status(502).json({
          error: "Chưa gửi được email xác nhận. Thông tin đặt vé vẫn được giữ nguyên.",
        });
      }
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { html, text } = createEmailContent(booking);
    const sendPromise = resend.emails
      .send(
        {
          from: process.env.EMAIL_FROM,
          to: booking.email,
          subject: `Xác nhận đặt vé TripGo - ${booking.bookingCode}`,
          html,
          text,
        },
        { idempotencyKey },
      )
      .then(({ data, error }) => {
        if (error) throw error;
        if (!data?.id) throw new Error("Resend did not return an email ID.");
        return data.id;
      });

    acceptedEmails.set(idempotencyKey, { promise: sendPromise });
    if (acceptedEmails.size > 10_000) {
      acceptedEmails.delete(acceptedEmails.keys().next().value);
    }

    try {
      await sendPromise;
      acceptedEmails.set(idempotencyKey, { accepted: true });
      return response.json({
        status: "accepted",
        message:
          "Resend đã tiếp nhận yêu cầu gửi email. Việc tiếp nhận không đảm bảo email đã vào hộp thư.",
      });
    } catch (error) {
      acceptedEmails.delete(idempotencyKey);
      console.error("Resend did not accept a booking email:", error?.name || "UnknownError");
      return response.status(502).json({
        error: "Chưa gửi được email xác nhận. Thông tin đặt vé vẫn được giữ nguyên.",
      });
    }
  },
);

app.use((error, _request, response, _next) => {
  if (error?.type === "entity.too.large") {
    return response.status(413).json({ error: "Yêu cầu vượt quá kích thước cho phép." });
  }
  if (error instanceof SyntaxError && "body" in error) {
    return response.status(400).json({ error: "Dữ liệu yêu cầu không hợp lệ." });
  }
  console.error("Unhandled API error:", error?.name || "UnknownError");
  return response.status(500).json({ error: "Đã xảy ra lỗi máy chủ." });
});

app.listen(port, () => {
  console.log(`TripGo email API listening on port ${port}`);
});
