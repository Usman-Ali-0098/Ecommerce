// import type {
//   InputHTMLAttributes,
// } from "react";

// type FormFieldProps =
//   InputHTMLAttributes<HTMLInputElement> & {
//     label: string;
//     error?: string;
//   };

// export default function FormField({
//   label,
//   error,
//   id,
//   className = "",
//   ...inputProps
// }: FormFieldProps) {
//   return (
//     <div className="space-y-2">
//       <label
//         htmlFor={id}
//         className="block text-lg text-[#212529]"
//       >
//         {label}
//       </label>

//       <input
//         id={id}
//         className={[
//           "h-12 w-full rounded border bg-white px-3 text-base",
//           "text-[#212529] outline-none transition",
//           "placeholder:text-[#6c757d]",
//           error
//             ? "border-red-500 focus:border-red-500"
//             : "border-[#ced4da] focus:border-[#86b7fe] focus:ring-4 focus:ring-blue-100",
//           className,
//         ].join(" ")}
//         {...inputProps}
//       />

//       {error ? (
//         <p className="text-sm text-red-500">
//           {error}
//         </p>
//       ) : null}
//     </div>
//   );
// }