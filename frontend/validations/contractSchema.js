import * as yup from "yup";
import { addMonths } from "date-fns";

export const contractSchema = yup.object().shape({
  startDate: yup
    .date()
    .required("Start date is required")
    .max(new Date(), "Start date cannot be in the future"),
  endDate: yup
    .date()
    .required("End date is required")
    .test(
      "minDiff",
      "End date must be at least 5 months after start date",
      function (end) {
        const { startDate } = this.parent;
        if (!startDate || !end) return true;
        return new Date(end) >= addMonths(new Date(startDate), 5);
      }
    ),
  deposit: yup
    .number()
    .typeError("Deposit must be a number")
    .required("Deposit is required")
    .min(0),
});
