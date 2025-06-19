import React, { useEffect, useState } from "react";
import "../styling/dashboard.scss";
import SidePanel from "../components/SidePanel";
import Panel from "../components/Panel";
import RoomStatusChart from "../components/RoomStatusChart";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const [occupied, setOccupied] = useState(0);
  const [available, setAvailable] = useState(0);
  const navigate = useNavigate();
  const [expiringContracts, setExpiringContracts] = useState([]);
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      alert("You must be logged in to access this page.");
      navigate("/login");
    }
    axios
      .get("http://localhost:5000/api/rooms/status-summary", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => {
        setOccupied(res.data.occupied);
        setAvailable(res.data.available);
      })
      .catch((err) => {
        console.error("Failed to fetch room status summary", err);
      });
    axios
      .get("http://localhost:5000/api/contracts/expiring", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        console.log("🎯 Expiring contracts response:", res.data); // <--- thêm dòng này
        setExpiringContracts(res.data);
      })
      .catch((err) => {
        console.error("❌ Failed to fetch expiring contracts", err); // <--- và dòng này
      });
  }, []);
  return (
    <div className="home-container">
      <SidePanel selected="dashboard"></SidePanel>
      <div className="home-content">
        <Panel title="Room status">
          <RoomStatusChart occupied={occupied} available={available} />
        </Panel>
        <Panel title="Unpaid rooms"></Panel>
        <Panel title="Contract deadline">
          <table className="contract-table">
            <thead>
              <tr>
                <th>Home Address</th>
                <th>Room Number</th>
                <th>Name</th>
                <th>End Date</th>
                <th>Room Fee</th>
              </tr>
            </thead>
            <tbody>
              {expiringContracts.length > 0 ? (
                expiringContracts.map((item, index) => (
                  <tr key={index}>
                    <td>{item.house}</td>
                    <td>{item.room}</td>
                    <td>{item.tenantName}</td>
                    <td>
                      {new Date(item.endDate).toLocaleDateString("vi-VN")}
                    </td>
                    <td>{item.rent.toLocaleString("vi-VN")} đ</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center" }}>
                    There are no expiring contracts.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Panel>

        <Panel title="Incomplete task"></Panel>
      </div>
    </div>
  );
}

export default Dashboard;
