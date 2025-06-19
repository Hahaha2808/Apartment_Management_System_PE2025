import * as yup from "yup";

export const roomSchema = yup.object().shape({
  roomNumber: yup.string().required("Room number is required"),
  price: yup
    .number()
    .typeError("Price must be a number")
    .positive("Price must be positive")
    .required("Price is required"),
  area: yup
    .number()
    .typeError("Area must be a number")
    .positive("Area must be positive")
    .required("Area is required"),
  length: yup
    .number()
    .typeError("Length must be a number")
    .min(0, "Length must be >= 0")
    .nullable(),
  width: yup
    .number()
    .typeError("Width must be a number")
    .min(0, "Width must be >= 0")
    .nullable(),
  maxPeople: yup
    .number()
    .typeError("Max people must be a number")
    .integer("Must be an integer")
    .min(1, "Must be at least 1")
    .required("Max people is required"),
  numberBedroom: yup
    .number()
    .typeError("Number of bedrooms must be a number")
    .integer("Must be an integer")
    .min(1, "Must be at least 1")
    .required("Number of bedrooms is required"),
  address: yup.string().required("Address is required"),
  description: yup.string().nullable(),
  allowMale: yup.boolean(),
  allowFemale: yup.boolean(),
});
