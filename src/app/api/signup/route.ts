import prisma from "@/lib/prisma";
import { signupSchema } from "@/lib/validations/auth";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";

export async function POST(request: Request) {

  try {

    // 1. Read request body
    const body = await request.json();


    // 2. Validate request data
    const result = signupSchema.safeParse(body);


    if (!result.success) {

      return NextResponse.json(
        {
          success: false,
          errors: result.error.issues,
        },
        {
          status: 400,
        }
      );

    }


    // After validation, data is safe to use
    const data = result.data;


    // 3. Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        email: data.email,
      },
    });


    if (existingUser) {

      return NextResponse.json(
        {
          success: false,
          message: "Email already exists",
        },
        {
          status: 409,
        }
      );

    }


    // 4. Hash password
    const hashedPassword = await bcrypt.hash(
      data.password,
      10
    );


    // 5. Create user in database
    const user = await prisma.user.create({

      data: {

        fullName: data.fullName,

        email: data.email,

        password: hashedPassword,

        mobile: data.mobile,

      },
      select: {
        id: true,
        fullName: true,
        email: true,
        mobile: true,
        role: true,
      }

    });


    // 6. Success response
    return NextResponse.json(
      {
        success: true,
        message: "User created successfully",
        data: user,
      },
      {
        status: 201,
      }
    );


  } catch (error) {


    console.error("Signup Error:", error);


    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      {
        status: 500,
      }
    );


  }

}   