import React, { useState, useEffect } from "react";
import "../styling/components/ServiceForm.scss";

function ServiceForm({
  title = "Add Service",
  initialData = { name: "", type: "", price: 0, active: true, note: "" },
  onSubmit,
  toggleStatus,
  toggleFunction,
}) {
  const [formData, setFormData] = useState(initialData);
  const [errors, setErrors] = useState({});

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!isInitialized) {
      setFormData(initialData);
      setIsInitialized(true);
    }
  }, [initialData, isInitialized]);

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.type) newErrors.type = "Type is required";
    if (formData.price <= 0) newErrors.price = "Price must be greater than 0";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="service-form">
      <h2 className="edit-form-title">{title}</h2>

      <div className="edit-form-grid">
        {/* ✅ Ô nhập tên đã fix */}
        <div className="edit-form-group">
          <label className="service-label">Name *</label>
          <input
            type="text"
            name="name"
            placeholder="Enter service name"
            autoComplete="off"
            value={formData.name || ""}
            onChange={handleChange}
            className="service-input"
          />
          {errors.name && <p className="error">{errors.name}</p>}
        </div>

        <div className="edit-form-group">
          <label className="service-label">Type *</label>
          <select
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="service-input"
          >
            <option value="">Select type</option>
            <option value="ELECTRIC">Electric</option>
            <option value="WATER">Water</option>
            <option value="OTHER">Other</option>
          </select>
          {errors.type && <p className="error">{errors.type}</p>}
        </div>

        <div className="edit-form-group">
          <label className="service-label">Price *</label>
          <div className="flex items-center">
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              className="service-input"
            />
            <span className="currency">VND</span>
          </div>
          {errors.price && <p className="error">{errors.price}</p>}
        </div>

        <div className="edit-form-group">
          <label className="label-inline">
            <input
              type="checkbox"
              name="active"
              checked={formData.active}
              onChange={handleChange}
              className="service-checkbox"
            />
            Active
          </label>
        </div>

        <div className="edit-form-group full-row">
          <label className="service-label">Note</label>
          <textarea
            name="note"
            value={formData.note}
            onChange={handleChange}
            className="textarea"
          />
        </div>
      </div>

      <div className="flex justify-between items-center pt-4">
        <p className="text-red-600 text-sm">(*): Required fields</p>
        <div className="space-x-2">
          <button
            className="btn-back"
            onClick={(e) => {
              e.preventDefault();
              toggleFunction(!toggleStatus);
            }}
          >
            Back
          </button>
          <button className="btn-save" type="submit">
            Save
          </button>
        </div>
      </div>
    </form>
  );
}

export default ServiceForm;
