import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { publicRegistrationRole } from '@/lib/roles';
import { newPasswordError } from '@/lib/passwords';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const { success } = rateLimit(`register:${ip}`, 3, 15 * 60 * 1000); // 3 registrations per 15 min
    if (!success) {
      return NextResponse.json({ error: 'Too many registration attempts' }, { status: 429 });
    }

    const { name, email, password, purpose } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const passwordError = newPasswordError(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Public sign-up is always a reader. Admins assign WRITER / EDITOR / ADMIN.
    const role = publicRegistrationRole(purpose);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      }
    });

    return NextResponse.json({ success: true, userId: user.id }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}
