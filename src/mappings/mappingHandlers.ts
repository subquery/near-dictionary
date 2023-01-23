import {NearTransaction, NearAction} from "@subql/types-near"
import { Action, Transaction } from "../types";

export function stripObjectUnicode(t: object): object {
    // Warning negative lookbehind `(?<!\\)` in regex might not work in all JS versions
    return JSON.parse(
        JSON.stringify(t)
            .replace(/(?<!\\)\\u[0-9A-Fa-f]{4}/g, '')
    );
}

export async function handleTransaction(tx: NearTransaction) {
    const blockHeight = BigInt(tx.block_height);
    const txStore = Transaction.create({
        id: `${tx.block_hash}-${tx.result.id}`,
        blockHeight,
        sender: tx.signer_id,
        receiver: tx.receiver_id,
    });

    await txStore.save();
}

export async function handleAction(action: NearAction) {
    const blockHeight = BigInt(action.transaction.block_height);
    const actionStore = Action.create({
        id: `${action.transaction.block_hash}-${action.transaction.result.id}-${action.id}`,
        blockHeight,
        txHash: action.transaction.result.id,
        type: action.type,
        data: stripObjectUnicode(action.action),
    });

    await actionStore.save();
}
