import {NearTransaction, NearAction, ActionType, DeployContract, FunctionCall, Transfer, Stake, AddKey, DeleteKey, DeleteAccount, NearBlock} from "@subql/types-near"
import { Action, Transaction } from "../types";

export function stripObjectUnicode(t: object): object {
    // Warning negative lookbehind `(?<!\\)` in regex might not work in all JS versions
    return JSON.parse(
        JSON.stringify(t)
            .replace(/(?<!\\)\\u[0-9A-Fa-f]{4}/g, '')
    );
}

export async function handleBlock(block: NearBlock) {
    const txs = block.transactions.map(tx => handleTransaction(tx));
    const actions = block.actions.map(action => handleAction(action));
    await store.bulkCreate('Transaction', txs);
    await store.bulkCreate('Action', actions);
}

export function handleTransaction(tx: NearTransaction) {
    const blockHeight = BigInt(tx.block_height);
    const txStore = Transaction.create({
        id: `${tx.block_hash}-${tx.result.id}`,
        blockHeight,
        sender: tx.signer_id,
        receiver: tx.receiver_id,
    });

    return txStore;
}

export function handleAction(action: NearAction) {
    const blockHeight = BigInt(action.transaction.block_height);
    const actionStore = new Action(`${action.transaction.block_hash}-${action.transaction.result.id}-${action.id}`)
    actionStore.blockHeight = blockHeight;
    actionStore.txHash = action.transaction.result.id;
    actionStore.type = action.type;
    
    switch(action.type) {
        case ActionType.DeployContract:
            action = action as NearAction<DeployContract>;
            actionStore.code = action.action.code;
            break;
        case ActionType.FunctionCall:
            action = action as NearAction<FunctionCall>;
            actionStore.methodName = action.action.args;
            actionStore.gas = action.action.gas;
            actionStore.deposit = action.action.deposit;
            break;
        case ActionType.Transfer:
            action = action as NearAction<Transfer>;
            actionStore.deposit = action.action.deposit;
            break;
        case ActionType.Stake:
            action = action as NearAction<Stake>;
            actionStore.stake = action.action.stake;
            break;
        case ActionType.AddKey:
            action = action as NearAction<AddKey>;
            actionStore.publicKey = action.action.publicKey;
            actionStore.accessKey = action.action.accessKey;
            break;
        case ActionType.DeleteKey:
            action = action as NearAction<DeleteKey>;
            actionStore.publicKey = action.action.publicKey;
            break;
        case ActionType.DeleteAccount:
            action = action as NearAction<DeleteAccount>;
            actionStore.beneficiaryId = action.action.beneficiaryId;
            break;
        case ActionType.CreateAccount:
            //nothing to store
            break;
        default:
            throw new Error(`Unknown Action Type: ${action.type}`);
    }

    return actionStore;
}
