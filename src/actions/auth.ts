// "use server";

// import bcrypt from "bcryptjs";
// import { prisma } from "@/lib/prisma";
// import { RegisterSchema, RegisterInput } from "@/schemas/auth";

// export type ActionResponse = {
//   success: boolean;
//   message: string;
//   errors?: Record<string, string[]>;
// };

// export async function registerUser(input: RegisterInput): Promise<ActionResponse> {
//   // 1. Validate incoming data server-side
//   const validated = RegisterSchema.safeParse(input);
//   if (!validated.success) {
//     return {
//       success: false,
//       message: "Validation error.",
//       errors: validated.error.flatten().fieldErrors,
//     };
//   }

//   const { fullName, email, mobileNumber, password } = validated.data;

//   try {
//     // 2. Check for duplicate email
//     const existingEmail = await prisma.user.findUnique({
//       where: { email },
//     });
//     if (existingEmail) {
//       return {
//         success: false,
//         message: "An account with this email address already exists.",
//       };
//     }

//     // 3. Check for duplicate mobile number
//     const existingMobile = await prisma.user.findUnique({
//       where: { mobileNumber },
//     });
//     if (existingMobile) {
//       return {
//         success: false,
//         message: "An account with this mobile number already exists.",
//       };
//     }

//     // 4. Hash password
//     const hashedPassword = await bcrypt.hash(password, 12);

//     // 5. Store user in PostgreSQL
//     await prisma.user.create({
//       data: {
//         fullName,
//         email,
//         mobileNumber,
//         password: hashedPassword,
//         role: "USER",
//       },
//     });

//     return {
//       success: true,
//       message: "Account created successfully.",
//     };
//   } catch (error) {
//     return {
//       success: false,
//       message: "An unexpected error occurred during registration.",
//     };
//   }
// }