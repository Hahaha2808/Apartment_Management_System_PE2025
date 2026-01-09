import React, { useState, useEffect } from "react";
import axios from "axios";
import SidePanel from "../components/SidePanel";
import "../styling/bookingPlanner.scss";
import { API_BASE_URL } from "../config";
function BookingPlanner() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [availableRooms, setAvailableRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(today.getMonth() + 1);

    const format = (date) => date.toISOString().split("T")[0];

    setStartDate(format(today));
    setEndDate(format(nextMonth));
  }, []);
  useEffect(() => {
    if (startDate && endDate) {
      handleSearch();
    }
  }, [startDate, endDate]);

  const handleSearch = async () => {
    if (!startDate || !endDate) {
      alert("Please select both start and end dates.");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      alert("Start date cannot be after end date.");
      return;
    }

    const token = localStorage.getItem("authToken");
    if (!token) return;

    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/rooms/available`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { startDate, endDate },
      });
      setAvailableRooms(res.data);
    } catch (err) {
      console.error("Failed to fetch available rooms", err);
      alert("Something went wrong while fetching rooms.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="booking-container">
      <SidePanel selected="booking" />
      <div className="booking-content">
        <div className="booking-inner">
          <div className="booking-upper">
            <h1 className="booking-title">Booking Planner</h1>
            <div className="date-filter">
              <label>
                From:{" "}
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </label>
              <label>
                To:{" "}
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </label>
              <button onClick={handleSearch} disabled={loading}>
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
          </div>

          <div className="break" />
          <div className="booking-lower">
            {availableRooms.length === 0 ? (
              <p>No rooms available for the selected date range.</p>
            ) : (
              <div className="table-wrapper">
                <table className="booking-table">
                  <thead>
                    <tr>
                      <th>Room</th>
                      <th>Address</th>
                      <th>Area</th>
                      <th>Bedrooms</th>
                      <th>Description</th>
                      <th>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableRooms.map((room) => (
                      <tr key={room._id}>
                        <td>{room.roomNumber}</td>
                        <td>{room.address}</td>
                        <td>{room.area}</td>
                        <td>{room.numberBedroom || "N/A"}</td>
                        <td>{room.description || "N/A"}</td>
                        <td>{room.price?.toLocaleString()} VND</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookingPlanner;
