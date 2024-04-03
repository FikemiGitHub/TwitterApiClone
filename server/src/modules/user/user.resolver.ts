import {
  Arg,
  Authorized,
  Ctx,
  FieldResolver,
  Mutation,
  Query,
  Resolver,
  Root,
} from "type-graphql";
import {
  FollowUserInput,
  LoginInput,
  RegisterUserInput,
  User,
  UserFollowers,
} from "./user.dto";
import {
  createUser,
  findUserByEmailOrUsername,
  findUserFollowedBy,
  findUserFollowing,
  findUsers,
  followUser,
  unFollowUser,
  verifyPassword,
} from "./user.service";
import { Context } from "../../utils/createServer";
import { ApolloError } from "apollo-server-core";
import jwt from "jsonwebtoken";

@Resolver(() => User)
class UserResolver {
  //Register User
  @Mutation(() => User)
  async register(@Arg("input") input: RegisterUserInput) {
    try {
      const user = await createUser(input);
      return user;
    } catch (e) {
      // check if violates unique constraint
      throw e;
    }
  }

  @Authorized()
  @Mutation(() => User)
  async followUser(
    @Arg("input") input: FollowUserInput,
    @Ctx() context: Context
  ) {
    try {
      // Ensure userId is always a string or throw an error if it's undefined
      const userId = context.user?.id ?? "";
      if (!userId) {
        throw new Error("User ID not found in context");
      }

      // Call the modified followUser function with input and userId
      const result = await followUser(input.username.toLowerCase(), userId);

      return result;
    } catch (e: any) {
      console.error("Error in followUser resolver:", e);
      throw new ApolloError(e);
    }
  }

  @Authorized()
  @Mutation(() => User)
  async unFollowUser(
    @Arg("input") input: FollowUserInput,
    @Ctx() context: Context
  ) {
    try {
      // Ensure userId is always a string or throw an error if it's undefined
      const userId = context.user?.id ?? "";
      if (!userId) {
        throw new Error("User ID not found in context");
      }

      // Call the modified followUser function with input and userId
      const result = await unFollowUser(input.username.toLowerCase(), userId);

      return result;
    } catch (e: any) {
      console.error("Error in followUser resolver:", e);
      throw new ApolloError(e);
    }
  }

  @Authorized()
  @Query(() => User)
  me(@Ctx() context: Context) {
    return context.user;
  }

  @Mutation(() => String)
  async login(@Arg("input") input: LoginInput, @Ctx() context: Context) {
    const user = await findUserByEmailOrUsername(
      input.usernameOrEmail.toLowerCase()
    );

    if (!user) {
      throw new ApolloError("Invalid credentials");
    }

    const isValid = await verifyPassword({
      password: user.password,
      candidatePassword: input.password,
    });

    if (!isValid) {
      throw new ApolloError("Invalid credentials");
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
      },
      "change-me" // Secret key
    );

    if (!token) {
      throw new ApolloError("Error signing token");
    }

    context.res.cookie("token", token, {
      domain: "localhost",
      path: "/",
      secure: false,
      httpOnly: true,
      sameSite: false,
    });

    // console.log("Generated token:", token); // Added this line to log the generated token

    return token;
  }

  @Authorized()
  @Query(() => [User])
  async users() {
    return findUsers();
  }

  @FieldResolver(() => UserFollowers)
  async following(@Root() user: User) {
    // ... userId handling
    const data = await findUserFollowing(user.id);

    return {
      count: data?.following.length,
      items: data?.following,
    };
  }

  @FieldResolver(() => UserFollowers)
  async followers(@Root() user: User) {
    // ... userId handling
    const data = await findUserFollowedBy(user.id);

    return {
      count: data?.followedBy.length,
      items: data?.followedBy,
    };
  }
}

export default UserResolver;
