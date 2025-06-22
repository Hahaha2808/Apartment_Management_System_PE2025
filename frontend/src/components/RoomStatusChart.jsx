import React, { useState, useEffect } from "react";
import axios from "axios";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip } from "chart.js";
import "../styling/components/RoomStatusChart.scss";

ChartJS.register(ArcElement, Tooltip);

export default function RoomStatusChart() {
  const [occupied, setOccupied] = useState(0);
  const [available, setAvailable] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    axios
      .get("http://localhost:5000/api/rooms/status-summary", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setOccupied(res.data.occupied);
        setAvailable(res.data.available);
      })
      .catch((err) => {
        console.error("❌ Failed to fetch room status summary", err);
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
