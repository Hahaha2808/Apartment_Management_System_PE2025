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
import DateField from "../components/DateField"; // bạn đã có sẵn component này

function Payments() {
  const [data, setData] = useState([
    {
      room: "Room 101",
      tenant: "John Doe",
      total: 1500000,
      paid: 0,
      remaining: 1500000,
    },
    {
      room: "Room 102",
      tenant: "Jane Smith",
      total: 1750000,
      paid: 500000,
      remaining: 1250000,
    },
  ]);

  const [selectedStartDate, setSelectedStartDate] = useState(null);
  const [selectedEndDate, setSelectedEndDate] = useState(null);

  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState("all");
  const [showPopup, setShowPopup] = useState(false);
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const res = await axios.get("http://localhost:5000/api/rooms", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const rentedRooms = res.data.filter((r) => r.status === "rented");
        setRooms(rentedRooms);
      } catch (err) {
        console.error("Room fetch failed", err);
      }
    };
    fetchRooms();
  }, []);

  return (
    <div className="payment-container">
      <SidePanel selected="payment" />
      <div className="payment-content">
        <div className="payment-inner">
          <div className="payment-upper">
            <h1 className="payment-title">Monthly Payments</h1>
            <div className="action-buttons">
              <button className="btn-cal" onClick={() => setShowPopup(true)}>
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
                        <button className="gray-btn">
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
              onClose={() => setShowPopup(false)}
              onConfirm={() => {
                // Tùy bạn xử lý logic tính toán ở đây
                console.log("Calculating for:", selectedRoom);
                setShowPopup(false);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default Payments;
