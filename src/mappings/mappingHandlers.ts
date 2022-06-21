import { CosmosEvent, CosmosMessage } from "@subql/types-cosmos";
import { Event, Message } from "../types";

export async function handleEvent(event: CosmosEvent) {
    const blockHeight = BigInt(event.block.block.header.height);
    const eventStore = Event.create({
        id: `${event.block.block.id}-${event.tx.hash}-${event.idx}`,
        blockHeight,
        txHash: event.tx.hash,
        type: event.event.type,
        msgType: event.msg.msg.typeUrl,
        data: event.msg.msg,
    });
    await eventStore.save();
}

export async function handleMessage(message: CosmosMessage) {
    const blockHeight = BigInt(message.block.block.header.height);
    const messageStore = Message.create({
        id: `${message.block.block.id}-${message.tx.hash}-${message.idx}`,
        blockHeight,
        txHash: message.tx.hash,
        type: message.msg.typeUrl,
        data: message.msg,
    });
    await messageStore.save();
}

