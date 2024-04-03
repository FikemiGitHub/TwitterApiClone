import {
  Arg,
  Authorized,
  Ctx,
  FieldResolver,
  Mutation,
  PubSub,
  PubSubEngine,
  Query,
  Resolver,
  Root,
  Subscription,
} from "type-graphql";
import { Context } from "../../utils/createServer";
import { findUserById } from "../user/user.service";
import { CreateMessageInput, Message } from "./message.dto";
import { createMessage, findMessages } from "./message.service";
import { ApolloError } from "apollo-server-core";

@Resolver(Message)
class MessageResolver {
  @Authorized()
  @Mutation(() => Message)
  async createMessage(
    @Arg("input") input: CreateMessageInput,
    @Ctx() context: Context,
    @PubSub() pubSub: PubSubEngine
  ) {
    if (!context.user) {
      throw new ApolloError("Unauthorized", "401");
    }

    try {
      const result = await createMessage(input.body, context.user.id);
      await pubSub.publish("NEW_MESSAGE", result);
      return result;
    } catch (e: any) {
      console.error("Error in createMessage resolver:", e);
      throw new ApolloError(e);
    }
  }

  @FieldResolver()
  async user(@Root() message: Message) {
    return findUserById(message.userId);
  }

  @Query(() => [Message])
  async messages() {
    return findMessages();
  }

  @Subscription(() => Message, {
    topics: "NEW_MESSAGE",
  })
  newMessage(@Root() message: Message): Message {
    return message;
  }
}

export default MessageResolver;
