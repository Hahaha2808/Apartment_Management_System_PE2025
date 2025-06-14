import React, { useState, useEffect, useCallback } from "react";
import { FaSearch } from 'react-icons/fa';
import SidePanel from '../components/SidePanel';
import "react-datepicker/dist/react-datepicker.css";
import DateField from "../components/DateField";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import '../styling/customer.scss'

function Customer() {
    const [data, setData] = useState([]);
    const [selectedStartDate, setSelectedStartDate] = useState(null);
    const [selectedEndDate, setSelectedEndDate] = useState(null);

    const [customerContractData, setCustomerContractData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [feeStatus, setFeeStatus] = useState("");


    const showMessage = useCallback((msg, type = 'info') => {
        setMessage(msg);
        setMessageType(type);
        setTimeout(() => {
            setMessage('');
            setMessageType('');
        }, 3000);
    }, []);

    const now = new Date();
    const isCurrentMonth = selectedStartDate
    ? selectedStartDate.getMonth() === now.getMonth() &&
      selectedStartDate.getFullYear() === now.getFullYear()
    : true;

    const fetchContractsWithDetails = useCallback(async (start = null, end = null, statusFilter = "") => {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("authToken");

        // IMPORTANT: The 'return;' line is commented out to allow requests to proceed
        // even if no token is found. This is crucial for debugging network errors
        // when your backend GET routes are temporarily unprotected.
        if (!token) {
            showMessage("Authentication token not found. Please log in.", "error");
            setLoading(false);
            // return; // <--- This line is commented out now.
        }

        let apiUrl;
        const params = new URLSearchParams();

        if (start) {
            params.append('startDate', start.toISOString().split('T')[0]);
        }
        if (end) {
            params.append('endDate', end.toISOString().split('T')[0]);
        }
        if (statusFilter) {
            params.append('status', statusFilter);
        }

        if (params.toString()) {
            apiUrl = `http://localhost:5000/api/contracts/filtered?${params.toString()}`;
        } else {
            apiUrl = `http://localhost:5000/api/contracts`; // Fetches all contracts for initial load
        }

        console.log("Frontend API URL being called:", apiUrl);

        try {
            const response = await axios.get(
                apiUrl,
                {
                    headers: { Authorization: `Bearer ${token}` }, // Still send token if available, backend handles if it needs it.
                }
            );

            console.log("Frontend received raw response.data:", response.data);

            if (!Array.isArray(response.data)) {
                console.error("Backend response data is not an array:", response.data);
                throw new Error("Invalid data format received from server.");
            }

            const transformedData = response.data.map((contract) => {
                const tenant = contract?.tenantId;
                const room = contract?.roomId;

                return {
                    'Full Name': tenant?.fullname || 'N/A',
                    'ID Number': tenant?.CIDNumber || 'N/A',
                    'DOB': tenant?.birthday ? new Date(tenant.birthday).toLocaleDateString() : 'N/A',
                    'Address': tenant?.permanentAddress || 'N/A',
                    'Phone Number': tenant?.phone1 || 'N/A',
                    'Home': tenant?.permanentAddress || 'N/A',
                    'Room': room?.roomNumber || 'N/A',
                    'Start Date': contract?.startDate ? new Date(contract.startDate).toLocaleDateString() : 'N/A',
                    'End Date': contract?.endDate ? new Date(contract.endDate).toLocaleDateString() : 'N/A',
                    'Contract Expiry Date': contract?.endDate ? new Date(contract.endDate).toLocaleDateString() : 'N/A',
                    'Unit Price (VND)': room?.price || 'N/A',
                    'Deposit (VND)': contract?.deposit || 'N/A',
                    'Contract ID': contract?._id || ''
                };
            });

            console.log("Frontend transformedData:", transformedData);
            setCustomerContractData(transformedData);
        } catch (err) {
            console.error("Error fetching customer and contract data:", err);
            setError("Failed to load customer and contract details. Check your browser's console/network tab for more details.");
            showMessage("Failed to load customer and contract details.", "error");
        } finally {
            setLoading(false);
        }
    }, [showMessage, setCustomerContractData, setLoading, setError]);

    const handleFeeStatusChange = useCallback((e) => {
        const newStatus = e.target.value;
        setFeeStatus(newStatus);
        fetchContractsWithDetails(selectedStartDate, selectedEndDate, newStatus);
    }, [selectedStartDate, selectedEndDate, fetchContractsWithDetails]);

    useEffect(() => {
        fetchContractsWithDetails(selectedStartDate, selectedEndDate, feeStatus);
    }, [fetchContractsWithDetails, selectedStartDate, selectedEndDate, feeStatus]);

    const handleFilter = () => {
        if (!selectedStartDate && !selectedEndDate && !feeStatus) {
            showMessage("Please select at least one filter criterion (dates or status).", "error");
            return;
        }
        fetchContractsWithDetails(selectedStartDate, selectedEndDate, feeStatus);
    };

    return (
        <div className="customer-container">
        <SidePanel selected="customer" />
        <div className="customer-content">
            <div className="customer-inner">
                <div className="customer-upper">
                    <h1 className="service-title">Customer</h1>
                    <button onClick={handleFilter} className="search-btn">
                        <FaSearch className="icon"></FaSearch>View
                    </button>
                </div>

                <div className="break"></div>

                <div className="customer-lower">
                    <div className="filter-section">
                        <DateField
                            selectedDate={selectedStartDate}
                            setSelectedDate={setSelectedStartDate}
                            title="From"
                        />
                        <DateField
                            selectedDate={selectedEndDate}
                            setSelectedDate={setSelectedEndDate}
                            title="To"
                        />
                        

                        <div className="dropdown-wrapper">
                            <label>Status</label>
                            <select
                                id="statusSelect"
                                className="dropdown"
                                value={feeStatus}
                                onChange={handleFeeStatusChange}
                                aria-label="Status"
                            >
                                <option value="">All</option>
                                <option value="Renting">Renting</option>
                                <option value="Rented">Rented</option>
                            </select>
                        </div>
                        
                        <button
                          onClick={() => {
                            setSelectedStartDate(null);
                            setSelectedEndDate(null);
                            fetchContractsWithDetails(); // Fetch all contracts again
                          }}
                          className=""
                        >
                          Clear Filter
                        </button>
                    </div>

                <table
                style={{
                    width: "100%",
                    marginTop: "20px",
                    borderCollapse: "collapse",
                }}
                >
                    {error && (
                        <caption className="py-4 text-center text-red-600">{error}</caption>
                    )}
                    {!loading && !error && customerContractData.length === 0 && (
                        <caption className="py-4 text-center text-gray-600">No customer or contract data found for the selected criteria.</caption>
                    )}
                            {/* Table content only renders when data is available */}
                            {!loading && !error && customerContractData.length > 0 && (
                                <>
                                    <thead className="bg-blue-600 text-white">
                                        <tr>
                                            {Object.keys(customerContractData[0]).filter(columnName => columnName !== 'Contract ID').map((columnName) => (
                                                <th key={columnName} className="py-3 px-4 text-left text-sm font-semibold uppercase tracking-wider rounded-tl-lg first:rounded-bl-none last:rounded-tr-lg last:rounded-br-none border-r border-blue-700 last:border-r-0">
                                                    {columnName}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {customerContractData.map((item, index) => (
                                            <tr key={item['Contract ID'] || index} className="border-b border-gray-200 hover:bg-gray-50">
                                                {Object.keys(item).filter(columnKey => columnKey !== 'Contract ID').map((columnKey) => (
                                                    <td key={columnKey} className="py-3 px-4 text-sm text-gray-700 border-r border-gray-200 last:border-r-0">
                                                        {item[columnKey]}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </>
                            )}
                </table>

                </div>
            </div>
        </div>
        </div>
    )
}

export default Customer