import React, { useState, useEffect } from "react";
import "../styling/room.scss";

import SidePanel from "../components/SidePanel";
// import MainLayout from "../components/MainLayout";
import AddRoomForm from "../components/AddRoomForm";
import EditRoomForm from "../components/EditRoomForm";
import "../styling/components/AddRoomForm.scss";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../config";
const Room = () => {
  const [roomStatus, setRoomStatus] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [feeStatus, setFeeStatus] = useState("");
  const [roomSearch, setRoomSearch] = useState("");
  const [roomId, setRoomId] = useState("");
  const [price, setPrice] = useState("");
  const [tenant, setTenant] = useState("");
  const [area, setArea] = useState("");
  const [address, setAddress] = useState("");
  const [numberBedroom, setNumberBedroom] = useState("");
  const [image, setImage] = useState("");

  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [originalRooms, setOriginalRooms] = useState([]);
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);

  const fetchRooms = () => {
    const token = localStorage.getItem("authToken");

    if (!token) {
      console.error("No token found in localStorage");
      return;
    }

    console.log("Token frontend:", token); // Debug token
    axios
      .get(`${API_BASE_URL}/api/rooms`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      .then((res) => {
        const activeRooms = res.data.filter(
          (room) => room.status !== "disabled"
        );
        setRooms(activeRooms);
        setOriginalRooms(activeRooms);
      })
      .catch((err) => {
        console.error("Error when fetch room!", err);
        alert(" Could not fetch room data!");
      });
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || user.role !== "landlord") {
      alert("Access denied. Only landlord can access this page.");
      navigate("/login");
    } else {
      fetchRooms();
    }
  }, []);

  const handleRoomStatusChange = (e) => {
    setRoomStatus(e.target.value);
  };
  const handleFeeStatusChange = (e) => {
    setFeeStatus(e.target.value);
  };
  const filterRooms = async () => {
    const token = localStorage.getItem("authToken");

    try {
      const queryParams = new URLSearchParams();

      if (roomStatus) queryParams.append("roomStatus", roomStatus);
      if (feeStatus) queryParams.append("feeStatus", feeStatus);
      if (roomSearch) queryParams.append("roomSearch", roomSearch);
      if (area) queryParams.append("area", area);
      if (numberBedroom) queryParams.append("numberBedroom", numberBedroom);
      if (address) queryParams.append("address", address);

      const response = await axios.get(
        `${API_BASE_URL}/api/rooms?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setRooms(response.data);
    } catch (err) {
      console.error("Error filtering rooms:", err);
      alert("Could not filter rooms.");
    }
  };

  const handleSearchClick = () => {
    filterRooms();
  };
  const handleCustomersClick = () => {
    navigate("/customer");
  };

  const handleEditRoom = (roomId) => {
    const room = rooms.find((r) => r._id === roomId);
    setEditingRoom(room);
  };

  const handleDeleteRoom = async (roomId) => {
    const room = rooms.find((r) => r._id === roomId);
    if (room.currentContractId) {
      alert("This room has an active contract and cannot be disabled.");
      return;
    }
    try {
      const token = localStorage.getItem("authToken");
      await axios.patch(
        `${API_BASE_URL}/api/rooms/${roomId}/status`,
        { status: "disabled" },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setRooms((prevRooms) => prevRooms.filter((room) => room._id !== roomId));

      alert("Room has been archived successfully!");
    } catch (error) {
      console.error("Error when updating room status", error);
      alert("There was an error disabling the room.");
    }
  };
  const handleRestoreRoom = async (roomId) => {
    try {
      const token = localStorage.getItem("authToken");
      await axios.patch(
        `${API_BASE_URL}/api/rooms/${roomId}/status`,
        { status: "available" },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      alert("Room has been restored.");
      fetchRooms(); // refresh list
    } catch (err) {
      console.error("Error restoring room:", err);
      alert("Could not restore room.");
    }
  };

  const handleAddTenant = (roomId) => {
    navigate(`/add-customer/${roomId}`);
  };
  return (
    <div className="room-layout">
      <SidePanel selected="room" />
      <div className="room-content">
        <div className="room-wrapper">
          <h2 className="room-title">Room Management</h2>
          <div className="break"></div>
          <div className="roompage-actions">
            <select
              className="dropdown"
              value={roomStatus}
              onChange={handleRoomStatusChange}
              aria-label="Room status"
            >
              <option value="">Room status</option>
              <option value="available">Available</option>
              <option value="rented">Rented</option>
              <option value="disabled">Disabled</option>
            </select>
            <select
              className="dropdown"
              value={feeStatus}
              onChange={handleFeeStatusChange}
              aria-label="Trạng thái phí"
            >
              <option value="">Payment status</option>
              <option value="Đã thanh toán">Paid</option>
              <option value="Chưa thanh toán">Unpaid</option>
            </select>
            <input
              type="number"
              className="search-input-bedroom"
              placeholder="Number of bedrooms"
              value={numberBedroom}
              onChange={(e) => setNumberBedroom(e.target.value)}
              aria-label="Số phòng ngủ"
            />{" "}
            <input
              type="number"
              className="search-input"
              placeholder="Area (m²)"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              aria-label="Diện tích"
            />
            <input
              type="text"
              className="search-input"
              placeholder="Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              aria-label="Địa chỉ"
            />
            <button className="btn search-btn" onClick={handleSearchClick}>
              🔍 Search
            </button>
            <button
              className="btn add-btn"
              onClick={() => setShowAddRoom(true)}
            >
              New Room
            </button>
            <button
              className="btn customers-btn"
              onClick={handleCustomersClick}
            >
              Customer
            </button>
          </div>
          <div className="room-container">
            {rooms.map((room) => (
              <div
                key={room._id}
                className={`room-card ${room.rented ? "rented" : ""}`}
              >
                <div className="room-image">
                  {room.image ? (
                    <img
                      src={`${API_BASE_URL}/uploads/${room.image}`}
                      alt={`Room ${room.roomNumber}`}
                    />
                  ) : (
                    <p>null</p>
                  )}
                </div>
                <div className="room-number"> 🏠Room {room.roomNumber}</div>
                {room.status === "disabled" && (
                  <div
                    style={{
                      color: "gray",
                      fontStyle: "italic",
                      marginBottom: "8px",
                    }}
                  >
                    (This room is currently disabled)
                  </div>
                )}
                {room.currentTenant && room.currentContractId ? (
                  <button
                    className="btn tenant-name-btn"
                    onClick={() =>
                      navigate(
                        `/add-customer/${room._id}/${room.currentContractId}`
                      )
                    }
                    disabled={room.status === "disabled"}
                  >
                    👤 {room.currentTenant}
                  </button>
                ) : (
                  <button
                    className="btn add-tenant"
                    onClick={() => handleAddTenant(room._id)}
                    disabled={room.status === "disabled"}
                  >
                    ➕ Add Tenant
                  </button>
                )}
                <div className="room-details">
                  <div className="area">◼️ {room.area} m²</div>
                  <div className="num-bedrooms">🛏️ {room.numberBedroom}</div>
                </div>
                <div className="price">
                  🏷️ {room.price.toLocaleString()} vnđ/month
                </div>
                <div className="address">
                  {" "}
                  📍 {room.address.toLocaleString()}
                </div>
                <div className="room-actions">
                  <button
                    className="btn edit-btn"
                    onClick={() => handleEditRoom(room._id)}
                  >
                    ✏️ Edit
                  </button>

                  {room.status === "disabled" ? (
                    <button
                      className="btn"
                      style={{ backgroundColor: "#5cb85c", color: "#fff" }}
                      onClick={() => handleRestoreRoom(room._id)}
                    >
                      ♻️ Restore
                    </button>
                  ) : (
                    <button
                      className="btn delete-btn"
                      onClick={() => handleDeleteRoom(room._id)}
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {showAddRoom && (
            <div className="modal-overlay">
              <div className="modal-content">
                <AddRoomForm
                  onSuccess={() => {
                    setShowAddRoom(false);
                    fetchRooms();
                  }}
                />
              </div>
            </div>
          )}
          {editingRoom && (
            <div className="modal-overlay">
              <div className="modal-content">
                <EditRoomForm
                  roomData={editingRoom}
                  onSuccess={() => {
                    setEditingRoom(null);
                    fetchRooms();
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Room;
