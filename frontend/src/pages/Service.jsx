import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ServiceTable from "../components/ServiceTable";
import "../styling/service.scss";
import SidePanel from "../components/SidePanel";
import ServiceForm from "./ServiceForm";
import axios from "axios";
import { API_BASE_URL } from "../config";
export default function Service() {
  const [services, setServices] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingService, setEditingService] = useState(null);

  const navigate = useNavigate();

  const fetchServices = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await axios.get(`${API_BASE_URL}/api/services`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const filtered = (response.data.data || []).filter(
        (s) => s.status !== "deleted"
      );
      setServices(filtered);
    } catch (error) {
      console.error("Error fetching services:", error);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("authToken");

    if (!token) {
      const confirmed = window.confirm(
        "You must be logged in to access this page. Do you want to log in now?"
      );
      if (confirmed) {
        navigate("/login");
      }
      return;
    }

    fetchServices();
  }, []);

  const handleAddService = async (data) => {
    try {
      const token = localStorage.getItem("authToken");
      await axios.post(
        `${API_BASE_URL}/api/services/create-service`,
        { ...data, status: "active" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchServices();
      setIsFormVisible(false);
    } catch (error) {
      console.error("Error adding service:", error);
    }
  };

  const handleUpdateService = async (data) => {
    try {
      const token = localStorage.getItem("authToken");
      await axios.put(
        `${API_BASE_URL}/api/services/update-service/${editingService._id}`,
        data,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchServices();
      setIsFormVisible(false);
      setEditingService(null);
    } catch (error) {
      console.error("Error updating service:", error);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      const token = localStorage.getItem("authToken");
      await axios.put(
        `${API_BASE_URL}/api/services/update-service/${id}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchServices();
    } catch (error) {
      console.error("Error updating service status:", error);
    }
  };

  const handleSoftDelete = async (id) => {
    const confirmed = window.confirm(
      "Do you want to permanently hide this service?"
    );
    if (!confirmed) return;

    try {
      const token = localStorage.getItem("authToken");
      await axios.put(
        `${API_BASE_URL}/api/services/update-service/${id}`,
        { status: "deleted" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchServices();
    } catch (error) {
      console.error("Error deleting service:", error);
    }
  };

  const handleEditService = async (id) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await axios.get(
        `${API_BASE_URL}/api/services/service/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditingService(response.data.data);
      setIsFormVisible(true);
    } catch (error) {
      console.error("Failed to load service", error);
    }
  };

  return (
    <div
      className={isFormVisible ? "service-wrapper toggled" : "service-wrapper"}
    >
      {isFormVisible && (
        <ServiceForm
          title={editingService ? "Edit Service" : "Add Service"}
          initialData={editingService || undefined}
          onSubmit={editingService ? handleUpdateService : handleAddService}
          toggleStatus={isFormVisible}
          toggleFunction={(val) => {
            setIsFormVisible(val);
            if (!val) setEditingService(null);
          }}
        />
      )}

      <SidePanel selected="service" />
      <div className="service-content">
        <div className="service-container">
          <div className="service-page">
            <div className="service-title-block">
              <h1 className="service-title">Service List</h1>
              <div className="break"></div>
              <p className="service-description">
                Note: All active services will be automatically included in the
                customer’s monthly bill. You can add, edit service information,
                delete services, or temporarily deactivate a service by
                unticking the checkbox in the "Active" column.
              </p>
            </div>

            <div className="service-header">
              <div className="service-search-bar">
                <input
                  type="text"
                  placeholder="Search by service name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button
                className="add"
                onClick={() => {
                  setEditingService(null); // Ensure blank form
                  setIsFormVisible(true);
                }}
              >
                New Service
              </button>
            </div>
          </div>

          <div className="service-table">
            <ServiceTable
              services={services.filter((s) =>
                s.name.toLowerCase().includes(searchTerm.toLowerCase())
              )}
              onEdit={handleEditService}
              onToggleStatus={handleToggleStatus}
              onSoftDelete={handleSoftDelete}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
