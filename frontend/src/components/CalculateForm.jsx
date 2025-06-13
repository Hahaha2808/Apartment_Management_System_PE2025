// CalculatePopup.jsx
import React, { useState, useEffect } from "react";
import "../styling/components/CalculateForm.scss";
import axios from "axios";
import DateField from "./DateField";

function CalculateForm({
  rooms,
  selectedRoom,
  setSelectedRoom,
  onClose,
  onConfirm,
}) {
  const [invoiceDate, setInvoiceDate] = useState(new Date());
  const [billingMonth, setBillingMonth] = useState(new Date());

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Calculate Payment</h2>
        </div>

        <div className="modal-body">
          <div className="field-group">
            <DateField
              selectedDate={invoiceDate}
              setSelectedDate={setInvoiceDate}
              title="Invoice Date"
              mode="day"
            />
          </div>

          <div className="field-group">
            <DateField
              selectedDate={billingMonth}
              setSelectedDate={setBillingMonth}
              title="Billing Month"
              mode="month"
            />
          </div>

          <div className="field-group">
            <label htmlFor="room-select">Select Room</label>
            <select
              id="room-select"
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="date-input"
            >
              <option value="all">All</option>
              {rooms.map((room) => (
                <option key={room._id} value={room._id}>
                  {room.roomNumber}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="btn confirm"
            onClick={() =>
              onConfirm({ invoiceDate, billingMonth, selectedRoom })
            }
          >
            Calculate
          </button>
          <button className="btn cancel" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default CalculateForm;
