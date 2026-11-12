import { useState, useEffect } from "react";
import ServiceTable from "../components/ServiceTable";
import "../styling/service.scss";
import SidePanel from "../components/SidePanel";
import ServiceForm from "./ServiceForm";
import api, { isAuthHandledError } from "../utils/apiClient.js";

export default function Service() {
  const [services, setServices] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingService, setEditingService] = useState(null);

  const fetchServices = async () => {
    try {
      const response = await api.get("/services");
      const filtered = (response.data.data || []).filter(
        (s) => s.status !== "deleted"
      );
      setServices(filtered);
    } catch (error) {
      if (isAuthHandledError(error)) return;
      alert(error.response?.data?.message || "Could not fetch services.");
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleAddService = async (data) => {
    try {
      await api.post(
        "/services/create-service",
        { ...data, status: "active" }
      );
      fetchServices();
      setIsFormVisible(false);
    } catch (error) {
      if (isAuthHandledError(error)) return;
      alert(error.response?.data?.message || "Could not add service.");
    }
  };

  const handleUpdateService = async (data) => {
    try {
      await api.put(
        `/services/update-service/${editingService._id}`,
        data
      );
      fetchServices();
      setIsFormVisible(false);
      setEditingService(null);
    } catch (error) {
      if (isAuthHandledError(error)) return;
      alert(error.response?.data?.message || "Could not update service.");
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      await api.put(
        `/services/update-service/${id}`,
        { status: newStatus }
      );
      fetchServices();
    } catch (error) {
      if (isAuthHandledError(error)) return;
      alert(error.response?.data?.message || "Could not update service status.");
    }
  };

  const handleSoftDelete = async (id) => {
    const confirmed = window.confirm(
      "Do you want to permanently hide this service?"
    );
    if (!confirmed) return;

    try {
      await api.put(
        `/services/update-service/${id}`,
        { status: "deleted" }
      );
      fetchServices();
    } catch (error) {
      if (isAuthHandledError(error)) return;
      alert(error.response?.data?.message || "Could not delete service.");
    }
  };

  const handleEditService = async (id) => {
    try {
      const response = await api.get(
        `/services/service/${id}`
      );
      setEditingService(response.data.data);
      setIsFormVisible(true);
    } catch (error) {
      if (isAuthHandledError(error)) return;
      alert(error.response?.data?.message || "Could not load service.");
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
