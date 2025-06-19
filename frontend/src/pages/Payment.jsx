import React, { useState, useEffect } from "react";
import SidePanel from "../components/SidePanel";
import CalculateForm from "../components/CalculateForm";
import axios from "axios";
import "../styling/payment.scss";
import { useNavigate } from "react-router-dom";
import PopupInvoice from "../components/BillPopup";
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
  const [allPayments, setAllPayments] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [viewingPayment, setViewingPayment] = useState(null);
  const navigate = useNavigate();
  useEffect(() => {
    const now = new Date();
    setSelectedStartDate(new Date(now.getFullYear(), now.getMonth(), 1)); // ngày đầu tháng

    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setSelectedEndDate(lastDayOfMonth);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) {
          alert("You must be logged in to access this page.");
          navigate("/login");
        }
        const today = new Date();
        const currentMonthStart = new Date(
          today.getFullYear(),
          today.getMonth(),
          1
        );
        const nextMonthStart = new Date(
          today.getFullYear(),
          today.getMonth() + 1,
          1
        );

        const params = {
          startDate: currentMonthStart.toISOString(),
          endDate: nextMonthStart.toISOString(),
        };

        const [contractRes, roomRes, paymentRes] = await Promise.all([
          axios.get("http://localhost:5000/api/contracts", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get("http://localhost:5000/api/rooms", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get("http://localhost:5000/api/payments", {
            headers: { Authorization: `Bearer ${token}` },
            params,
          }),
        ]);

        const activeContracts = contractRes.data.filter(
          (c) => c.status === "active"
        );
        const activeRoomIds = [
          ...new Set(activeContracts.map((c) => c.roomId?.toString())),
        ];
        const rentingRooms = roomRes.data.filter((r) =>
          activeRoomIds.includes(r._id?.toString())
        );
        setRooms(rentingRooms);

        const paymentData = paymentRes.data.map((p) => {
          const matchedRoom = rentingRooms.find(
            (r) => r._id.toString() === p.room_id.toString()
          );
          return {
            _id: p._id,
            room: matchedRoom?.roomNumber || "N/A",
            tenant: p.tenant_name,
            total: p.total_amount,
            paid: p.amount_paid,
            remaining: p.remaining,
          };
        });

        setAllPayments(paymentData);
        setData(paymentData);
      } catch (err) {
        console.error("Fetching failed:", err);
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

      const monthYear = billingMonth.toISOString().slice(0, 7);
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
      const msg = err?.response?.data?.message || "Error calculating payment";

      if (err.response?.status === 409) {
        alert("" + msg);
      } else if (
        err.response?.status === 404 &&
        msg.includes("No active contract")
      ) {
        alert("This room has no valid contract in the selected month.");
      } else {
        alert("" + msg);
      }
    }

    console.error("Error calculating:", err);
  };
  const handleFilter = async () => {
    try {
      const token = localStorage.getItem("authToken");

      if (!selectedStartDate || !selectedEndDate) {
        alert("Please select both start and end dates.");
        return;
      }

      const fromYear = selectedStartDate.getFullYear();
      const fromMonth = selectedStartDate.getMonth();

      const toYear = selectedEndDate.getFullYear();
      const toMonth = selectedEndDate.getMonth();

      const sameMonth = fromYear === toYear && fromMonth === toMonth;

      const start = new Date(fromYear, fromMonth, 1, 0, 0, 0, 0);
      const end = new Date(toYear, toMonth + 1, 0, 23, 59, 59, 999);

      const params = {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      };

      const res = await axios.get("http://localhost:5000/api/payments", {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      const paymentData = res.data.map((p) => {
        const matchedRoom = rooms.find(
          (r) => r._id.toString() === p.room_id.toString()
        );

        return {
          _id: p._id,
          room: matchedRoom?.roomNumber || "N/A",
          tenant: p.tenant_name,
          total: p.total_amount,
          paid: p.amount_paid,
          invoice_date: p.invoice_date,
          remaining: p.remaining,
        };
      });

      setData(paymentData);
    } catch (err) {
      console.error("Error filtering payments:", err);
      alert("Failed to filter payments.");
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
  const handleView = async (paymentId) => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await axios.get(
        `http://localhost:5000/api/payments/${paymentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setViewingPayment(res.data); // chứa đầy đủ dữ liệu
    } catch (err) {
      alert("Failed to fetch payment details.");
      console.error("❌ Error loading invoice:", err);
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
              <button className="search-btn" onClick={handleFilter}>
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
                        <button
                          className="gray-btn"
                          onClick={() => handleView(entry._id)}
                        >
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
          {viewingPayment && (
            <PopupInvoice
              payment={viewingPayment}
              onClose={() => setViewingPayment(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default Payments;
