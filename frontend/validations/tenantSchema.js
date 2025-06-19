import * as yup from "yup";
import { differenceInYears, addMonths, isBefore } from "date-fns";

export const tenantSchema = yup.object().shape({
  fullname: yup.string().required("Full name is required"),
  birthday: yup
    .date()
    .typeError("Invalid birthday")
    .test("age", "Tenant must be at least 18 years old", (value) => {
      return differenceInYears(new Date(), new Date(value)) >= 18;
    })
    .required("Birthday is required"),
  CIDNumber: yup.string().required("CID Number is required"),
  sex: yup.string().oneOf(["Male", "Female"]).required("Sex is required"),
  phone1: yup.string().required("Phone number is required"),
  email: yup.string().email("Invalid email").required("Email is required"),
  // Các field còn lại không bắt buộc
});
