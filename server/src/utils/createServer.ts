import express, { Request, Response } from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import cors from "cors";
import cookieParser from "cookie-parser";
import jwt, { JwtPayload } from "jsonwebtoken";
import { bearerAuthChecker } from "./bearerAuthChecker";
import UserResolver from "../modules/user/user.resolver";
import MessageResolver from "../modules/message/message.resolver";
import { SubscriptionServer } from "subscriptions-transport-ws";
import { execute, subscribe } from "graphql";
import { createServer as createHttpServer } from "http";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/lib/use/ws";
import { User } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user: User | null;
    }
  }
}

type CtxUser = Omit<User, "password">;

export interface Context {
  req: Request;
  res: Response;
  user: CtxUser | null;
}

const secretKey = "change-me"; // Define secretKey here

export async function createServer() {
  const app = express();

  app.use(
    cors({
      credentials: true,
      origin: ["http://localhost:3000", "https://studio.apollographql.com"],
    })
  );
  app.use(cookieParser());

  app.use((req: Request, res: Response, next) => {
    try {
      const decoded = jwt.verify(req.cookies.token, secretKey) as JwtPayload;
      req.user = decoded as User;
    } catch (err) {
      req.user = null;
    }
    next();
  });

  const schema = await buildSchema({
    resolvers: [UserResolver, MessageResolver],
    authChecker: bearerAuthChecker,
  });

  const apolloServer = new ApolloServer({
    schema,
    context: ({ req, res }): Context => {
      console.log("Incoming request:", req.method, req.originalUrl);
      console.log("Cookies:", req.cookies);
      console.log("Authorization header:", req.headers.authorization);

      // Additional logging for request properties
      console.log("Original URL:", req.originalUrl);
      console.log("Base URL:", req.baseUrl);
      console.log("Path:", req.path);

      return {
        req,
        res,
        user: req.user,
      };
    },
  });

  await apolloServer.start();
  apolloServer.applyMiddleware({ app, path: "/graphql" });

  const httpServer = createHttpServer(app);
  const websocketServer = new WebSocketServer({ server: httpServer });

  useServer({ schema, execute, subscribe }, websocketServer);

  SubscriptionServer.create(
    {
      schema,
      execute,
      subscribe,
      onConnect: async (connectionParams: { Authorization?: string }) => {
        console.log("WebSocket connection established.");
        if (!connectionParams.Authorization) {
          throw new Error("Missing auth token!");
        }

        // Extract JWT from Authorization Header (Assuming Bearer token)
        const authToken = connectionParams.Authorization.split(" ")[1]; // Adjust if format is different

        const user = getUserFromJWT(authToken); // Modify to use authToken
        if (!user) {
          throw new Error("Unauthorized");
        }
        return { user };
      },
    },
    { server: httpServer, path: "/graphql" }
  );

  return { app, httpServer }; // Returning httpServer along with app
}

function getUserFromJWT(token: string): User | null {
  try {
    const decoded = jwt.verify(token, secretKey) as JwtPayload;
    return decoded as User;
  } catch (error) {
    console.error("Error decoding JWT:", error);
    return null;
  }
}
