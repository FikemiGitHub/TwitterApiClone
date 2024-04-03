import argon2 from "argon2";
import prisma from "../../utils/prisma";
import { FollowUserInput, LoginInput, RegisterUserInput } from "./user.dto";
import { JwtPayload, sign } from "jsonwebtoken";

export async function createUser(input: RegisterUserInput) {
  //hash the password
  const password = await argon2.hash(input.password);

  //insert the user
  return prisma.user.create({
    data: {
      ...input,
      email: input.email.toLocaleLowerCase(),
      username: input.username.toLocaleLowerCase(),
      password,
    },
  });
}

export async function findUserByEmailOrUsername(
  input: LoginInput["usernameOrEmail"]
) {
  return prisma.user.findFirst({
    where: {
      OR: [{ username: input }, { email: input }],
    },
  });
}

export async function verifyPassword({
  password,
  candidatePassword,
}: {
  password: string;
  candidatePassword: string;
}) {
  return argon2.verify(password, candidatePassword);
}

// Type for the decoded JWT payload (adjust as needed)
interface CtxUser extends JwtPayload {
  id: number; // Assuming you have an 'id' in your user data
  // ... other user properties
}

// export async function generateJwtToken(user: CtxUser, secret: string): Promise<string> {
//   return sign(user, secret);
// }

export async function followUser(
  username: FollowUserInput["username"],
  userId: string
) {
  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      following: {
        connect: {
          username,
        },
      },
    },
  });
}

export async function unFollowUser(
  username: FollowUserInput["username"],
  userId: string
) {
  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      following: {
        disconnect: {
          username,
        },
      },
    },
  });
}

export async function findUsers() {
  return prisma.user.findMany();
}

export async function findUserFollowing(userId: string) {
  return prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      following: true,
    },
  });
}

export async function findUserFollowedBy(userId: string) {
  return prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      followedBy: true,
    },
  });
}

export async function findUserById(userId: string) {
  return prisma.user.findFirst({
    where: {
      id: userId,
    },
  });
}
