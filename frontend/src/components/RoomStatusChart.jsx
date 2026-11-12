import React, { useState, useEffect } from "react";
import api, { isAuthHandledError } from "../utils/apiClient.js";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip } from "chart.js";
import "../styling/components/RoomStatusChart.scss";

ChartJS.register(ArcElement, Tooltip);

export default function RoomStatusChart() {
  const [occupied, setOccupied] = useState(0);
  const [available, setAvailable] = useState(0);

  useEffect(() => {
    api
      .get("/rooms/status-summary")
      .then((res) => {
        setOccupied(res.data.occupied);
        setAvailable(res.data.available);
      })
      .catch((err) => {
        if (isAuthHandledError(err)) return;
        alert(err.response?.data?.message || "Failed to fetch room status summary.");
      });
  }, []);

  const data = {
    labels: ["Occupied", "Available"],
    datasets: [
      {
        data: [occupied, available],
        backgroundColor: ["#317ac4", "#f14a68"],
        borderColor: "#ffffff",
        borderWidth: 2,
      },
    ],
  };

  const options = {
    maintainAspectRatio: true,
    responsive: true,
    plugins: {
      legend: { display: false },
    },
  };

  return (
    <div className="room-status-chart">
      <div className="chart-wrapper">
        <Pie data={data} options={options} />
      </div>
      <div className="legend">
        <span className="occupied">Occupied</span>
        <span className="available">Available</span>
      </div>
    </div>
  );
}
