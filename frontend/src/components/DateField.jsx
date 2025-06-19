import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../styling/components/dateField.scss";

function DateField({ selectedDate, setSelectedDate, title, mode = "month" }) {
  const handleDateChange = (date) => {
    setSelectedDate(date);
  };
  const isMonthMode = mode === "month";

  return (
    <div className="field-input">
      <label>{title ?? "Date"}</label>
      <DatePicker
        selected={selectedDate}
        onChange={handleDateChange}
        dateFormat={isMonthMode ? "MM/yyyy" : "dd/MM/yyyy"}
        showMonthYearPicker={isMonthMode}
        placeholderText={isMonthMode ? "Select month and year" : "Select date"}
        className="date-input"
        maxDate={new Date()}
      />
    </div>
  );
}

export default DateField;
