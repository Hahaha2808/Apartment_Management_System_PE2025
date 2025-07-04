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
        <div className="invoice-services">
          <div className="invoice-row">
            <div className="item">
              <span className="label">1) Rent:</span>
              <span className="value">
                {formatCurrency(payment.rent_amount)} VND
              </span>
            </div>
          </div>

          <div className="invoice-row">
            <div className="item">
              <span className="label">2) Electric:</span>
              <span className="value">
                {formatCurrency(payment.electric?.total)} VND
              </span>
            </div>
          </div>

          <div className="invoice-row">
            <div className="item">
              <span className="label">3) Water:</span>
              <span className="value">
                {formatCurrency(payment.water?.total)} VND
              </span>
            </div>
          </div>

          {payment.other_services?.map((s, i) => (
            <div className="invoice-row" key={i}>
              <div className="item">
                <span className="label">
                  {i + 4}) {s.service_name}:
                </span>
                <span className="value">
                  {formatCurrency(s.unit_price)} VND
                </span>
              </div>
            </div>
          ))}
        </div>

        <hr />
        <div className="invoice-row">
          <div className="item">
            <span className="label">Invoice Date:</span>
            <span className="value">{formatDate(payment.invoice_date)}</span>
          </div>
          <div className="item">
            <span className="label">Total:</span>
            <span className="value-x">
              {formatCurrency(payment.total_amount)} VND
            </span>
          </div>
        </div>

        {payment.amount_paid > 0 && (
          <div className="invoice-row">
            <div className="item">
              <span className="label">Paid At:</span>
              <span className="value">{formatDate(payment.paid_at)}</span>
            </div>
            <div className="item">
              <span className="label">Amount Paid:</span>
              <span className="value">
                {formatCurrency(payment.amount_paid)} VND
              </span>
            </div>
          </div>
        )}

        <div className="invoice-row">
          <div className="item" style={{ flex: 1 }}></div>
          <div className="item" style={{ maxWidth: "43%" }}>
            <span className="label">Remaining:</span>
            <span
              className="value"
              style={{
                color: payment.remaining === 0 ? "#27ae60" : "#e67e22",
                fontWeight: "bold",
              }}
            >
              {formatCurrency(payment.remaining)} VND
            </span>
          </div>
        </div>

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
