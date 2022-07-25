import { CosmosEvent, CosmosMessage } from "@subql/types-cosmos";
import { Event, EvmLog, EvmTransaction, Message } from "../types";
import { inputToFunctionSighash, isSuccess, isZero } from "../utils";

export async function handleEvent(event: CosmosEvent) {
    const blockHeight = BigInt(event.block.block.header.height);
    const eventStore = Event.create({
        id: `${event.block.block.id}-${event.tx.hash}-${event.idx}`,
        blockHeight,
        txHash: event.tx.hash,
        type: event.event.type,
        msgType: event.msg.msg.typeUrl,
        data: event.msg.msg.decodedMsg,
    });
    await eventStore.save();

    if(event.event.type === 'ethereumTx') {
       await handleEvmLog(event);
    }
}

export async function handleMessage(message: CosmosMessage) {
    const blockHeight = BigInt(message.block.block.header.height);
    const messageStore = Message.create({
        id: `${message.block.block.id}-${message.tx.hash}-${message.idx}`,
        blockHeight,
        txHash: message.tx.hash,
        type: message.msg.typeUrl,
        data: message.msg.decodedMsg,
    });
    await messageStore.save();

    if(message.msg.typeUrl === "/ethermint.evm.v1.MsgEthereumTx") {
        await handleEvmTransaction(message);
    }
}

export async function handleEvmTransaction(message: CosmosMessage) {
    const blockHeight = BigInt(message.block.block.header.height);
    const tx = message.msg.decodedMsg as any;
    const decodedTx = (global as any).registry.decodedMsg(tx.data);

    const func = isZero(decodedTx.data) ? undefined : inputToFunctionSighash(decodedTx.data);

    const txStore = EvmTransaction.create({
        id: `${message.block.block.id}-${message.tx.hash}-${message.idx}`,
        txHash: tx.hash,
        blockHeight,
        from: tx.from,
        to: decodedTx.to,
        func: func,
        success: isSuccess(message.tx.tx.log, message.idx),
    });
    await txStore.save();
}

export async function handleEvmLog(event: CosmosEvent) {
    const log = event.log;
    const blockHeight = BigInt(event.block.block.header.height);
    for(const attr of log.events.find(evt => evt.type === 'ethereumTx').attributes) {
        if(attr.key !== 'txLog') {
            continue;
        }
        const tx = JSON.parse(attr.value);
        const evmLog = EvmLog.create({
            id: `${event.block.block.id}-${event.tx.hash}-${event.idx}`,
            blockHeight,
            address: tx.address,
            topics0: tx.topics[0],
            topics1: tx.topics[1],
            topics2: tx.topics[2],
            topics3: tx.topics[3],
        })

        await evmLog.save();
    }
}