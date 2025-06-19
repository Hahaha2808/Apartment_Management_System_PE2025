import React, { useState, useEffect } from "react";
import { FaSearch } from "react-icons/fa";
import SidePanel from "../components/SidePanel";
import "react-datepicker/dist/react-datepicker.css";
import DateField from "../components/DateField";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styling/customer.scss";

function Customer() {
  const [data, setData] = useState([]);
  const [selectedStartDate, setSelectedStartDate] = useState(null);
  const [selectedEndDate, setSelectedEndDate] = useState(null);
  const [status, setStatus] = useState("");
  const navigate = useNavigate();
  const fetchCustomers = async () => {
    try {
      const params = {
        status,
      };

      if (selectedStartDate) {
        params.monthStart =
          selectedStartDate.getFullYear() +
          "-" +
          (selectedStartDate.getMonth() + 1);
      }
      if (selectedEndDate) {
        params.monthEnd =
          selectedEndDate.getFullYear() +
          "-" +
          (selectedEndDate.getMonth() + 1);
      }
      const res = await axios.get(
        "http://localhost:5000/api/contracts/customers",
        {
          params,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
        }
      );

      setData(res.data);
    } catch (err) {
      console.error("Failed to fetch customers", err);
    }
  };
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      alert("You must be logged in to access this page.");
      navigate("/login");
    }
    fetchCustomers();
  }, []);

  const handleStatusChange = (e) => {
    setStatus(e.target.value);
  };

  return (
    <div className="customer-container">
      <SidePanel selected="customer" />
      <div className="customer-content">
        <div className="customer-inner">
          <div className="customer-upper">
            <h1 className="service-title">Customer</h1>
          </div>
          <div className="break"></div>
          <div className="customer-lower">
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
              <div className="dropdown-wrapper">
                <label>Status</label>
                <select
                  className="dropdown"
                  value={status}
                  onChange={handleStatusChange}
                  aria-label="Status"
                >
                  <option value="">All</option>
                  <option value="Renting">Renting</option>
                  <option value="Rented">Rented</option>
                </select>
              </div>
              <button className="search-btn" onClick={fetchCustomers}>
                <FaSearch className="icon"></FaSearch>View
              </button>
            </div>
            <div className="table-wrapper">
              <table className="customer-table">
                <thead>
                  <tr>
                    <th>Full Name</th>
                    <th>ID Number</th>
                    <th>DOB</th>
                    <th>Address</th>
                    <th>Phone Number</th>
                    <th>Home</th>
                    <th>Room</th>
                    <th>Start Date</th>
                    <th>End Date</th>
                    <th>Expiry in</th>
                    <th>Unit Price (VND)</th>
                    <th>Deposit (VND)</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, index) => (
                    <tr key={index}>
                      <td>{item.fullname}</td>
                      <td>{item.idNumber}</td>
                      <td>{new Date(item.dob).toLocaleDateString()}</td>
                      <td>{item.address}</td>
                      <td>{item.phone}</td>
                      <td>{item.home}</td>
                      <td>{item.room}</td>
                      <td>{new Date(item.startDate).toLocaleDateString()}</td>
                      <td>{new Date(item.endDate).toLocaleDateString()}</td>
                      <td>{item.expiryDays} days</td>
                      <td>{item.unitPrice.toLocaleString()}</td>
                      <td>{item.deposit.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Customer;
