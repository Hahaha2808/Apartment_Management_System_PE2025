import React, { useEffect, useState } from "react";
import "../styling/components/AddRoomForm.scss";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../config";

const EditRoomForm = ({ roomData, onSuccess }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState(roomData);

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;

    if (type === "checkbox") {
      setFormData({ ...formData, [name]: checked });
    } else if (name === "image") {
      setFormData({ ...formData, image: files[0] });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleFileChange = (e) => {
    setFormData((prev) => ({ ...prev, image: e.target.files[0] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const preparedData = {
      ...formData,
      landlordID: formData.landlordID._id || formData.landlordID,
    };

    const updatedData = new FormData();
    for (const key in preparedData) {
      updatedData.append(key, preparedData[key]);
    }
    try {
      const token = localStorage.getItem("authToken");
      await axios.put(
        `${API_BASE_URL}/api/rooms/${formData._id}`,
        updatedData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      alert("Room updated successfully!");
      onSuccess();
    } catch (err) {
      console.error(
        "❌ Error updating room:",
        err.response?.data || err.message
      );
      alert("Update failed!");
    }
  };
  return (
    <div className="edit-room-wrapper">
      <div className="edit-room-header">
        <h2 className="edit-room-title">Edit Room</h2>
        <form onSubmit={handleSubmit}>
          <div className="edit-room-container">
            <div style={{ flex: "1 1 45%" }}>
              <div className="form-group">
                <label>Room number *</label>
                <input
                  name="roomNumber"
                  value={formData.roomNumber}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Area *</label>
                <input
                  name="area"
                  value={formData.area}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Length </label>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <input
                    name="length"
                    value={formData.length}
                    onChange={handleChange}
                  />
                  <span style={{ marginLeft: "8px" }}>M</span>
                </div>
              </div>
              <div className="form-group">
                <label>Maximum of people *</label>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <input
                    name="maxPeople"
                    value={formData.maxPeople}
                    onChange={handleChange}
                    required
                  />
                  <span style={{ marginLeft: "8px" }}>People</span>
                </div>
              </div>
            </div>
            <div style={{ flex: "1 1 45%" }}>
              <div className="form-group">
                <label>Price *</label>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <input
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    required
                  />
                  <span style={{ marginLeft: "8px" }}>VND</span>
                </div>
              </div>
              <div className="form-group">
                <label>Width </label>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <input
                    name="width"
                    value={formData.width}
                    onChange={handleChange}
                  />
                  <span style={{ marginLeft: "8px" }}>M</span>
                </div>
              </div>
              <div className="form-group">
                <label>Gender allowed </label>
                <div
                  style={{ display: "flex", gap: "24px", marginTop: "16px" }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <input
                      type="checkbox"
                      name="allowMale"
                      checked={formData.allowMale}
                      onChange={handleChange}
                    />
                    Male
                  </label>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <input
                      type="checkbox"
                      name="allowFemale"
                      checked={formData.allowFemale}
                      onChange={handleChange}
                    />
                    Female
                  </label>
                </div>
              </div>
              <div className="form-group">
                <label>Number of bedroom *</label>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <input
                    name="numberBedroom"
                    value={formData.numberBedroom}
                    onChange={handleChange}
                    required
                  />
                  <span style={{ marginLeft: "8px" }}>Room</span>
                </div>
              </div>
            </div>
          </div>

          <div
            className="edit-room-container"
            style={{ flexDirection: "column" }}
          >
            <div className="form-group">
              <label>Address *</label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={1}
                required
              />
            </div>
            <div className="form-group">
              <label>Description </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
              />
            </div>
            <div className="form-group">
              <label>Image </label>
              <input type="file" onChange={handleFileChange} />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: "20px",
            }}
          >
            <button
              className="btn"
              onClick={() => {
                onSuccess();
              }}
              style={{ backgroundColor: "#f0ad4e", marginRight: "10px" }}
            >
              Back
            </button>
            <button
              type="submit"
              className="btn"
              style={{ backgroundColor: "#5cb85c" }}
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditRoomForm;
