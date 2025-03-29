import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import prisma from "../lib/prisma";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

// Register User
export const registerUser = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, password, name, address, phone } = req.body;

    if (!email || !password || !name || !address || !phone) {
      res
        .status(400)
        .json({ message: "Please provide an email and a password" });
      return;
    }

    const userExists = await prisma.user.findUnique({
      where: { email },
    });

    if (userExists) {
      res.status(400).json({ message: "User already exists" });
      return;
    }

    const user = await prisma.user.create({
      data: {
        email,
        password: await bcrypt.hash(password, 10),
        name,
        address,
        phone,
      },
    });

    const exp = Date.now() + 1000 * 60 * 60 * 5;
    const token = jwt.sign({ sub: user.id, exp }, process.env.SECRET!);

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user.id,
        email: user.email,
      },
    });
  }
);

// Login User
export const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: "Please provide an email and a password" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  const match = await bcrypt.compare(password, user.password);

  if (!match) {
    res.status(400).json({ message: "Wrong password" });
    return;
  }

  const exp = Date.now() + 1000 + 60 * 60 * 24 * 30; // Token valid for 30 days

  const token = jwt.sign({ sub: user.id, exp }, process.env.SECRET!);

  res.cookie("token", token, {
    httpOnly: true, // Prevents access to the cookie from JavaScript
    sameSite: "lax",
    secure: true,
  });

  res.status(201).json({
    message: "User registered successfully",
    user: {
      id: user.id,
      email: user.email,
    },
  });
});

export const updateUserProfile = asyncHandler(async (req: Request, res: Response) => {
  const { name, address, phone } = req.body;

  if (!name || !address || !phone) {
    res.status(400).json({ message: "Please provide all the required fields" });
    return;
  }

  // @ts-ignore
  const user = await prisma.user.update({
    //@ts-ignore
    where: { id: req.user.id },
    data: { name, address, phone },
  });

  res.status(201).json(user);
});

export const googleLogin = asyncHandler(async (req: Request, res: Response) => {
  const { name, email } = req.body;

  if (!email || !name) {
    res.status(400).json({ message: "Please provide an email" });
    return;
  }

  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        name,
        email,
        password: "",
      },
    });
  }

  const exp = Math.floor(Date.now() / 1000) + 60 * 60; // Token valid for 1 hour
  const token = jwt.sign({ sub: user.id, exp }, process.env.SECRET!);
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
  });

  res.status(201).json({
    message: "User registered successfully",
    user: {
      id: user.id,
      email: user.email,
    },
  });
});
// Update User Wallet
export const updateUserWallet = asyncHandler(
  async (req: Request, res: Response) => {
    // @ts-ignore
    const { wallet_address } = req.body;
    try {
      const wallet = await prisma.wallet.upsert({
        where: {
          address: wallet_address,
        },
        update: {
          // @ts-ignore
          userId: req.user.id,
        },
        create: {
          address: wallet_address,
          // @ts-ignore
          userId: req.user.id,
        },
      });

      res.json(wallet);
    } catch (error) {
      console.error("Error updating or creating wallet:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

export const getUserWallet = asyncHandler(
  async (req: Request, res: Response) => {
    const wallet = await prisma.wallet.findMany({
      where: {
        // @ts-ignore
        userId: req.user.id,
      },
    });
    res.json(wallet);
  }
);

export const getUserDetails = asyncHandler(
  async (req: Request, res: Response) => {
    // @ts-ignore
    res.json(req.user);
  }
);

export const signOut = asyncHandler(async (req: Request, res: Response) => {
  res.clearCookie("token", { path: "/", httpOnly: true, secure: true });

  res.json({ message: "Signed out successfully" });
});

export const getUserAchievements = asyncHandler(
  async (req: Request, res: Response) => {
    // @ts-ignore
    const achievements = await prisma.achievement.findMany({
      where: {
        // @ts-ignore
        userId: req.user.id,
      },
    });

    res.status(200).json(achievements);
  }
);