import React, { useState } from "react";
import "../styling/components/AddRoomForm.scss";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { roomSchema } from "../../validations/roomSchema";

const AddRoomForm = ({ onSuccess }) => {
  const [image, setImage] = useState(null);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(roomSchema),
    defaultValues: {
      roomNumber: "",
      price: "",
      length: "",
      width: "",
      maxPeople: "",
      area: "",
      numberBedroom: "",
      address: "",
      allowMale: true,
      allowFemale: true,
      description: "",
    },
  });

  const onSubmit = async (formData) => {
    const form = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      form.append(key, value);
    });
    if (image) form.append("image", image);

    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        alert("You are not logged in or token missing!");
        navigate("/login");
        return;
      }

      const res = await axios.post("http://localhost:5000/api/rooms", form, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Add room successfully", res.data);
      reset();
      onSuccess?.();
    } catch (err) {
      const errorMessage =
        err.response?.data?.error || "Unexpected error when adding room.";

      alert(errorMessage);
    }
  };

  const handleImageChange = (e) => {
    setImage(e.target.files[0]);
  };

  return (
    <div className="edit-room-wrapper">
      <div className="edit-room-header">
        <h2 className="edit-room-title">Add Room</h2>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="edit-room-container">
            <div style={{ flex: "1 1 45%" }}>
              <div className="form-group">
                <label>Room number *</label>
                <input {...register("roomNumber")} />
                {errors.roomNumber && (
                  <p className="error-text">{errors.roomNumber.message}</p>
                )}
              </div>
              <div className="form-group">
                <label>Area *</label>
                <input {...register("area")} />
                {errors.area && (
                  <p className="error-text">{errors.area.message}</p>
                )}
              </div>
              <div className="form-group">
                <label>Length</label>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <input {...register("length")} />
                  <span style={{ marginLeft: "8px" }}>M</span>
                </div>
                {errors.length && (
                  <p className="error-text">{errors.length.message}</p>
                )}
              </div>
              <div className="form-group">
                <label>Maximum of people *</label>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <input {...register("maxPeople")} />
                  <span style={{ marginLeft: "8px" }}>People</span>
                </div>
                {errors.maxPeople && (
                  <p className="error-text">{errors.maxPeople.message}</p>
                )}
              </div>
            </div>

            <div style={{ flex: "1 1 45%" }}>
              <div className="form-group">
                <label>Price *</label>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <input {...register("price")} />
                  <span style={{ marginLeft: "8px" }}>VND</span>
                </div>
                {errors.price && (
                  <p className="error-text">{errors.price.message}</p>
                )}
              </div>
              <div className="form-group">
                <label>Width</label>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <input {...register("width")} />
                  <span style={{ marginLeft: "8px" }}>M</span>
                </div>
                {errors.width && (
                  <p className="error-text">{errors.width.message}</p>
                )}
              </div>
              <div className="form-group">
                <label>Gender allowed</label>
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
                    <input type="checkbox" {...register("allowMale")} />
                    Male
                  </label>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                    }}
                  >
                    <input type="checkbox" {...register("allowFemale")} />
                    Female
                  </label>
                </div>
              </div>
              <div className="form-group">
                <label>Number of bedroom *</label>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <input {...register("numberBedroom")} />
                  <span style={{ marginLeft: "8px" }}>Room</span>
                </div>
                {errors.numberBedroom && (
                  <p className="error-text">{errors.numberBedroom.message}</p>
                )}
              </div>
            </div>
          </div>

          <div
            className="edit-room-container"
            style={{ flexDirection: "column" }}
          >
            <div className="form-group">
              <label>Address *</label>
              <textarea {...register("address")} rows={1} />
              {errors.address && (
                <p className="error-text">{errors.address.message}</p>
              )}
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea {...register("description")} rows={3} />
            </div>
            <div className="form-group">
              <label>Image</label>
              <input type="file" onChange={handleImageChange} />
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
              type="button"
              className="btn"
              onClick={() => onSuccess()}
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

export default AddRoomForm;
