import { z } from "zod";

export const signupSchema = z.object({
  fullName: z.string().min(3, "Full name must be atleast 3 characters"),
  
  email: z.string().email("Invalid email format"),
  
  mobile: z.string().min(10, "Mobile number must be atleast 10 characters").max(15, "Mobile number must be atmost 15 characters"),


  password: z.string().min(8, "Password must be at least 8 characters"),

  confirmPassword: z.string(),
  })  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });




export const loginSchema = z.object({
  email: z.string().email("Invalid email format").toLowerCase(),

  password: z.string().min(8, "Password must be at least 8 characters"),

});





export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Invalid email format").toLowerCase(),
}); 



export const resetPasswordSchema = z
  .object({
    token: z
      .string()
      .trim()
      .min(1, "Reset token is required"),

    password: z
      .string()
      .min(8, "Password must contain at least 8 characters")
      .max(72, "Password must not exceed 72 characters"),

    confirmPassword: z
      .string()
      .min(1, "Please confirm your new password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });





  // Instead of manually writing:  typescript type. for validation


export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;