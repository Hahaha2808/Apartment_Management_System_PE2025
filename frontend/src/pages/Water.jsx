import React, { useState, useEffect } from "react";
import SidePanel from "../components/SidePanel";
import "../styling/water.scss";
import "react-datepicker/dist/react-datepicker.css";
import DateField from "../components/DateField";
import api, { isAuthHandledError } from "../utils/apiClient.js";
import { FaSave, FaSearch } from "react-icons/fa";

function Water() {
  const [selectedDate, setSelectedDate] = useState(null);
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchCurrentMonthData();
  }, []);

  const handleInputChange = (index, value) => {
    const newData = [...data];
    newData[index].new = parseFloat(value) || 0;
    setData(newData);
  };

  const handleSave = async (index) => {
    const entry = data[index];

    if (entry.new < entry.old) {
      alert(
        "New reading must be greater than or equal to the previous reading."
      );
      return;
    }

    try {
      await api.post(
        "/water-meters/add-new-meters",
        {
          contract_id: entry.contract_id,
          currentIndex: entry.new,
          recordDate: new Date().toISOString(),
        }
      );

      alert("💾 Saved successfully!");

      fetchCurrentMonthData();
    } catch (err) {
      if (isAuthHandledError(err)) return;
      alert(err.response?.data?.message || "Save failed.");
    }
  };

  const fetchCurrentMonthData = () => {
    api
      .get("/water-meters/index")
      .then((res) => {
        console.log("📦 API water-meters/index response:", res.data);
        if (!Array.isArray(res.data)) {
          alert("⚠️ Unexpected data format");
          return;
        }

        const transformed = res.data.map((item) => ({
          contract_id: item.contract_id,
          room: item.room.roomNumber,
          user: item.tenant.fullname,
          old: item.lastWaterIndex,
          new: item.currentIndex ?? "",
          consumed: item.consumed ?? 0,
        }));
        setData(transformed);
      })
      .catch((err) => {
        if (isAuthHandledError(err)) return;
        alert(err.response?.data?.message || "Failed to fetch water readings.");
      });
  };

  const now = new Date();
  const isCurrentMonth = selectedDate
    ? selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getFullYear() === now.getFullYear()
    : true;

  const handleFilter = () => {
    if (!selectedDate) {
      alert("Please select a date to filter.");
      return;
    }

    const month = selectedDate.getMonth() + 1;
    const year = selectedDate.getFullYear();

    api
      .get(
        `/water-meters/history?month=${month}&year=${year}`
      )
      .then((res) => {
        const filteredData = res.data.map((item) => ({
          contract_id: item.contract_id._id,
          room: item.contract_id.roomId.roomNumber,
          user: item.contract_id.tenantId.fullname,
          old: item.previousIndex,
          new: item.currentIndex,
        }));
        setData(filteredData);
      })
      .catch((err) => {
        if (isAuthHandledError(err)) return;
        alert(err.response?.data?.message || "Failed to load history.");
      });
  };

  return (
    <div className="water-container">
      <SidePanel selected="water" />
      <div className="water-content">
        <div className="water-inner">
          <div className="water-upper">
            <h1 className="service-title">Water Meter</h1>
          </div>
          <div className="break"></div>
          <p className="service-description">
            Note: You can update the electricity reading multiple times during
            the month (from the first day to the last day). When creating a
            payment in the Payment page, the most recent reading will be
            automatically used for calculation. At the end of the month, you
            will only be able to view the readings — editing will no longer be
            possible.
          </p>
          <div className="water-lower">
            <div className="filter-section">
              <DateField
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
              />
              <button className="search-btn" onClick={handleFilter}>
                <FaSearch className="icon"></FaSearch>View
              </button>
            </div>
            <div className="table-wrapper">
              <table className="payment-table">
                <thead>
                  <tr>
                    <th>Room</th>
                    <th>Renter</th>
                    <th>Previous Water Rate</th>
                    <th>Current Water Rate</th>
                    <th>Consumed</th>
                    <th>Save</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((entry, index) => {
                    const usage = entry.new - entry.old;
                    return (
                      <tr key={index}>
                        <td className="room">{entry.room}</td>
                        <td className="user">{entry.user}</td>
                        <td className="old-usage">
                          <input
                            type="number"
                            value={entry.old}
                            disabled
                            style={{ width: "60px" }}
                          />
                        </td>
                        <td className="new-usage">
                          <input
                            type="number"
                            value={entry.new}
                            onChange={(e) =>
                              handleInputChange(index, e.target.value)
                            }
                            disabled={!isCurrentMonth}
                            style={{ width: "60px" }}
                          />
                        </td>
                        <td className="final-usage">
                          {entry.consumed?.toFixed(1) || 0}
                        </td>
                        <td>
                          <button
                            onClick={() => handleSave(index)}
                            className="gray-btn"
                            title="Save"
                          >
                            <FaSave className="blue-icon" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Water;
