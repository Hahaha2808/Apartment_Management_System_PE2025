import React, { useState, useEffect } from "react";
import SidePanel from "../components/SidePanel";
import CalculateForm from "../components/CalculateForm";
import axios from "axios";
import "../styling/payment.scss";
import {
  FaEye,
  FaMoneyBillWave,
  FaTimes,
  FaCalculator,
  FaPrint,
  FaSearch,
} from "react-icons/fa";
import DateField from "../components/DateField";

function Payments() {
  const [data, setData] = useState([]);
  const [selectedStartDate, setSelectedStartDate] = useState(null);
  const [selectedEndDate, setSelectedEndDate] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState("");
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("authToken");

        // 1. Fetch contracts
        const contractRes = await axios.get(
          "http://localhost:5000/api/contracts",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const activeContracts = contractRes.data.filter(
          (c) => c.status === "active"
        );
        const activeRoomIds = [
          ...new Set(activeContracts.map((c) => c.roomId?.toString())),
        ];

        console.log("✅ Contracts:", contractRes.data);
        console.log("✅ Active contracts:", activeContracts);
        console.log("✅ Active room IDs:", activeRoomIds);

        // 2. Fetch rooms
        const roomRes = await axios.get("http://localhost:5000/api/rooms", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const rentingRooms = roomRes.data.filter((r) =>
          activeRoomIds.includes(r._id?.toString())
        );

        console.log("✅ All rooms:", roomRes.data);
        console.log("✅ Renting rooms:", rentingRooms);

        setRooms(rentingRooms);

        // 3. Fetch payments
        const paymentRes = await axios.get(
          "http://localhost:5000/api/payments",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        console.log("✅ Payments:", paymentRes.data);

        const paymentData = paymentRes.data.map((p) => {
          const matchedRoom = rentingRooms.find(
            (r) => r._id.toString() === p.room_id.toString()
          );

          return {
            _id: p._id, // cần để delete
            room: matchedRoom?.roomNumber || "N/A",
            tenant: p.tenant_name,
            total: p.total_amount,
            paid: p.amount_paid,
            remaining: p.remaining,
          };
        });

        setData(paymentData);
      } catch (err) {
        console.error("❌ Fetching failed:", err);
      }
    };

    fetchData();
  }, []);

  const handleCalculate = async ({
    invoiceDate,
    billingMonth,
    selectedRoom,
  }) => {
    try {
      const token = localStorage.getItem("authToken");

      const monthYear = billingMonth.toISOString().slice(0, 7); // format YYYY-MM
      const formattedInvoiceDate = invoiceDate.toISOString();

      const res = await axios.post(
        "http://localhost:5000/api/payments/calculate/single",
        {
          roomId: selectedRoom,
          monthYear,
          invoiceDate: formattedInvoiceDate,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const p = res.data;

      setData((prev) => [
        ...prev,
        {
          _id: p._id,
          room:
            rooms.find((r) => r._id.toString() === p.room_id.toString())
              ?.roomNumber || "N/A",
          tenant: p.tenant_name,
          total: p.total_amount,
          paid: p.amount_paid,
          remaining: p.remaining,
        },
      ]);

      setShowPopup(false);
    } catch (err) {
      if (err.response?.status === 409) {
        alert(err.response.data.message);
      } else {
        alert("There is existing payment for this month!");
      }
      console.error("Error calculating:", err);
    }
  };
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this payment?"))
      return;

    try {
      const token = localStorage.getItem("authToken");

      await axios.delete(`http://localhost:5000/api/payments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setData((prev) => prev.filter((p) => p._id !== id));
      alert("✅ Payment deleted successfully");
    } catch (err) {
      console.error("❌ Delete failed:", err);
      alert("Failed to delete payment");
    }
  };
  return (
    <div className="payment-container">
      <SidePanel selected="payment" />
      <div className="payment-content">
        <div className="payment-inner">
          <div className="payment-upper">
            <h1 className="payment-title">Monthly Payments</h1>
            <div className="action-buttons">
              <button
                className="btn-cal"
                onClick={() => {
                  if (rooms.length === 0) {
                    alert("Room list is still loading or empty!");
                  } else {
                    setShowPopup(true);
                  }
                }}
              >
                <FaCalculator style={{ marginRight: "6px" }} />
                Calculate
              </button>

              <button className="btn-exp">
                <FaPrint style={{ marginRight: "6px" }} />
                Export PDF
              </button>
            </div>
          </div>

          <div className="break"></div>

          <div className="payment-lower">
            <div className="filter-section">
              <DateField
                selectedDate={selectedStartDate}
                setSelectedDate={setSelectedStartDate}
                title="From"
              />
              <DateField
                selectedDate={selectedEndDate}
                setSelectedDate={setSelectedEndDate}
                title="To"
              />
              <button className="search-btn">
                <FaSearch className="icon" /> View
              </button>
            </div>
            <div className="table-wrapper">
              <table className="water-table">
                <thead>
                  <tr>
                    <th>Room</th>
                    <th>Tenant</th>
                    <th>Total Amount</th>
                    <th>Paid</th>
                    <th>Remaining</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((entry, idx) => (
                    <tr key={idx}>
                      <td>{entry.room}</td>
                      <td>{entry.tenant}</td>
                      <td>{entry.total.toLocaleString()}</td>
                      <td>{entry.paid.toLocaleString()}</td>
                      <td>{entry.remaining.toLocaleString()}</td>
                      <td>
                        <button className="gray-btn">
                          <FaEye className="blue-icon" />
                        </button>
                        <button className="gray-btn">
                          <FaMoneyBillWave className="green-icon" />
                        </button>
                        <button
                          className="gray-btn"
                          onClick={() => handleDelete(entry._id)}
                        >
                          <FaTimes className="red-icon" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {showPopup && (
            <CalculateForm
              rooms={rooms}
              selectedRoom={selectedRoom}
              setSelectedRoom={setSelectedRoom}
              onClose={() => {
                setShowPopup(false);
                setSelectedRoom("");
              }}
              onConfirm={(formData) => {
                handleCalculate(formData);
                setSelectedRoom("");
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default Payments;
