import React from "react";
import "../styling/components/BillPopup.scss";

function formatCurrency(value) {
  return value?.toLocaleString("vi-VN") || "0";
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return isNaN(date) ? "-" : date.toLocaleDateString("vi-VN");
}

function PopupInvoice({ payment, onClose }) {
  if (!payment) return null;

  const monthDate = new Date(payment.month);
  const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

  return (
    <div className="popup-overlay">
      <div className="popup-content">
        <h2 className="invoice-title">INVOICE</h2>

        <p>
          <strong>Tenant:</strong> {payment.tenant_name}
        </p>
        <p>
          <strong>Room:</strong> {payment.roomNumber || payment.room || "N/A"}
        </p>
        <p>
          <strong>Address:</strong> {payment.address || "N/A"}
        </p>
        <p>
          <strong>Billing Period:</strong> {formatDate(start)} to{" "}
          {formatDate(end)}
        </p>

        <hr />
        <ul>
          <li>1) Rent: {formatCurrency(payment.rent_amount)} VND</li>
          <li>
            2) Electric: {payment.electric?.consumed || 0} kWh ×{" "}
            {formatCurrency(payment.electric?.unit_price)} ={" "}
            {formatCurrency(payment.electric?.total)} VND
          </li>
          <li>
            3) Water: {payment.water?.consumed || 0} m³ ×{" "}
            {formatCurrency(payment.water?.unit_price)} ={" "}
            {formatCurrency(payment.water?.total)} VND
          </li>
          {payment.other_services?.map((s, i) => (
            <li key={i}>
              {i + 4}) {s.service_name}: {formatCurrency(s.unit_price)} VND
            </li>
          ))}
        </ul>

        <hr />
        <p>
          <strong>Total:</strong> {formatCurrency(payment.total_amount)} VND
        </p>
        <p>
          <strong>Invoice Date:</strong> {formatDate(payment.invoice_date)}
        </p>

        <div className="popup-actions">
          <button className="green-btn">Download Image</button>
          <button className="blue-btn">Download PDF</button>
          <button className="red-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default PopupInvoice;
