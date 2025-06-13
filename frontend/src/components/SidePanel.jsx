import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Link } from "react-router";
import "../styling/components/sidePanel.scss";
import {
  IoSpeedometer,
  IoHome,
  IoCube,
  IoFlash,
  IoWater,
  IoHammer,
  IoCalculator,
  IoCash,
  IoRepeat,
  IoBriefcase,
  IoPerson,
  IoLogOut,
} from "react-icons/io5";

function SidePanel({ selected }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const username = user?.username || "user";

  const handleLogout = () => {
    const confirmed = window.confirm("Do you want to log out?");
    if (!confirmed) return;

    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div className="side-panel-container">
      <div className="top-container">
        <h1>APARTMENT MANAGEMENT</h1>
        <h2>Hello, {username}</h2>
      </div>
      <nav className="bottom-container">
        <Link
          to="/dashboard"
          className={selected == "dashboard" ? "link active" : "link"}
        >
          <IoSpeedometer className="icon"></IoSpeedometer>Dashboard
        </Link>
        <Link
          to="/rooms"
          className={selected == "room" ? "link active" : "link"}
        >
          <IoHome className="icon"></IoHome>Room
        </Link>
        <Link
          to="/service"
          className={selected === "service" ? "link active" : "link"}
        >
          <IoCube className="icon" />
          <span>Service</span>
        </Link>

        <Link
          to="/electric"
          className={selected === "electric" ? "link active" : "link"}
        >
          <IoFlash className="icon" />
          <span>Electric Meter</span>
        </Link>

        <Link
          to="/water"
          className={selected === "water" ? "link active" : "link"}
        >
          <IoWater className="icon" />
          <span>Water Meter</span>
        </Link>

        <Link
          to="/customer"
          className={selected === "customer" ? "link active" : "link"}
        >
          <IoPerson className="icon"></IoPerson>
          Customer
        </Link>
        <Link
          to="/payment"
          className={selected === "payment" ? "link active" : "link"}
        >
          <IoCash className="icon" />
          <span>Payment</span>
        </Link>
        <div
          className="link"
          onClick={handleLogout}
          style={{ cursor: "pointer" }}
        >
          <IoLogOut className="icon" />
          <span>Log out</span>
        </div>
      </nav>
    </div>
  );
}

export default SidePanel;
