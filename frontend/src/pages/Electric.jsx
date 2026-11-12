import React, { useState, useEffect } from "react";
import SidePanel from "../components/SidePanel";
import "../styling/electric.scss";
import { FaSearch } from "react-icons/fa";
import "react-datepicker/dist/react-datepicker.css";
import DateField from "../components/DateField";
import api, { isAuthHandledError } from "../utils/apiClient.js";
import { FaSave } from "react-icons/fa";

function Electric() {
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
        "/electric-meters/add-new-meters",
        {
          contract_id: entry.contract_id,
          currentIndex: entry.new,
          recordDate: new Date().toISOString(),
        }
      );

      alert("\uD83D\uDCBE Saved successfully!");
      fetchCurrentMonthData();
    } catch (err) {
      if (isAuthHandledError(err)) return;
      alert(err.response?.data?.message || "Save failed.");
    }
  };

  const fetchCurrentMonthData = () => {
    api
      .get("/electric-meters/index")
      .then((res) => {
        console.log("API electric-meters/index response:", res.data);
        if (!Array.isArray(res.data)) {
          alert("⚠️ Unexpected data format");
          return;
        }

        const transformed = res.data.map((item) => ({
          contract_id: item.contract_id,
          room: item.room.roomNumber,
          user: item.tenant.fullname,
          old: item.lastElectricIndex,
          new: item.currentIndex ?? "",
          consumed: item.consumed ?? 0,
        }));
        setData(transformed);
      })
      .catch((err) => {
        if (isAuthHandledError(err)) return;
        alert(err.response?.data?.message || "Failed to fetch electric readings.");
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

    const month = selectedDate.getMonth();
    const year = selectedDate.getFullYear();

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    if (month === currentMonth && year === currentYear) {
      fetchCurrentMonthData();
      return;
    }

    api
      .get(
        `/electric-meters/history?month=${
          month + 1
        }&year=${year}`
      )
      .then((res) => {
        const filteredData = res.data.map((item) => {
          const consumed = item.currentIndex - item.previousIndex;
          return {
            contract_id: item.contract_id._id,
            room: item.contract_id.roomId.roomNumber,
            user: item.contract_id.tenantId.fullname,
            old: item.previousIndex,
            new: item.currentIndex,
            consumed: consumed >= 0 ? consumed : 0,
          };
        });
        setData(filteredData);
      })
      .catch((err) => {
        if (isAuthHandledError(err)) return;
        alert(err.response?.data?.message || "Failed to load history.");
      });
  };

  return (
    <div className="electric-container">
      <SidePanel selected="electric" />
      <div className="electric-content">
        <div className="electric-inner">
          <div className="electric-upper">
            <h1 className="service-title">Electricity Meter</h1>
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
          <div className="electric-lower">
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
              <table className="electric-table">
                <thead>
                  <tr>
                    <th>Room</th>
                    <th>Renter</th>
                    <th>Previous Electricity Rate</th>
                    <th>Current Electricity Rate</th>
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

export default Electric;
