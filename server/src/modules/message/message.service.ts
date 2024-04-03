import prisma from "../../utils/prisma";
import { CreateMessageInput } from "./message.dto";

export function createMessage(body: string, userId: string) {
  return prisma.message.create({
    data: {
      body,
      user: {
        connect: {
          id: userId,
        },
      },
    },
  });
}

export function findMessages() {
  return prisma.message.findMany();
}
