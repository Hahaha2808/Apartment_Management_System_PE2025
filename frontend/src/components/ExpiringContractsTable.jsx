import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config";
import "../styling/components/ExpiringContractsTable.scss";
function ExpiringContractsTable() {
  const [expiringContracts, setExpiringContracts] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    console.log("🎯 Calling /contracts/expiring with token:", token);
    axios
      .get(`${API_BASE_URL}/api/contracts/expiring`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setExpiringContracts(res.data);
      })
      .catch((err) => {
        console.error("❌ Failed to fetch expiring contracts", err);
      });
  }, []);

  return (
    <div className="contract-table-wrapper">
      <table className="contract-table">
        <thead>
          <tr>
            <th>Home Address</th>
            <th>Room Number</th>
            <th>Name</th>
            <th>End Date</th>
          </tr>
        </thead>
        <tbody>
          {expiringContracts.length > 0 ? (
            expiringContracts.map((item, index) => (
              <tr key={index}>
                <td>{item.house}</td>
                <td>{item.room}</td>
                <td>{item.tenantName}</td>
                <td>{new Date(item.endDate).toLocaleDateString("vi-VN")}</td>
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
    </div>
  );
}

export default ExpiringContractsTable;
