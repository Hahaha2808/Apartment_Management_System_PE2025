import React, { useState } from "react";
import "../styling/components/collectPayment.scss";

function CollectPaymentForm({ payment, onClose, onSave }) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [amount, setAmount] = useState(0);

  const handleSubmit = () => {
    const today = new Date().toISOString().slice(0, 10);
    if (amount <= 0) {
      alert("Amount must be greater than 0.");
      return;
    }
    if (date > today) {
      alert("Payment date cannot be in the future.");
      return;
    }
    onSave({ paymentId: payment._id, date, amount });
  };

  return (
    <div className="popup-overlay">
      <div className="popup-collect-content">
        <h3>Collect Payment</h3>
        <label>Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <label>Amount</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
        />
        <div className="popup-actions">
          <button className="blue-btn" onClick={handleSubmit}>
            Save
          </button>
          <button className="red-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default CollectPaymentForm;
