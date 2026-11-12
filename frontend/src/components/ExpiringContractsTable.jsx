import React, { useEffect, useState } from "react";
import api, { isAuthHandledError } from "../utils/apiClient.js";
import "../styling/components/ExpiringContractsTable.scss";
function ExpiringContractsTable() {
  const [expiringContracts, setExpiringContracts] = useState([]);

  useEffect(() => {
    api
      .get("/contracts/expiring")
      .then((res) => {
        setExpiringContracts(res.data);
      })
      .catch((err) => {
        if (isAuthHandledError(err)) return;
        alert(err.response?.data?.message || "Failed to fetch expiring contracts.");
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
