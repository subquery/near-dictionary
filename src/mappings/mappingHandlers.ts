import {
  NearTransaction,
  NearAction,
  ActionType,
  DeployContract,
  FunctionCall,
  Transfer,
  Stake,
  AddKey,
  DeleteKey,
  DeleteAccount,
  NearBlock,
} from "@subql/types-near";
import { Action, Transaction } from "../types";

export function stripObjectUnicode(t: object): object {
  // Warning negative lookbehind `(?<!\\)` in regex might not work in all JS versions
  return JSON.parse(JSON.stringify(t).replace(/(?<!\\)\\u[0-9A-Fa-f]{4}/g, ""));
}

export async function handleBlock(block: NearBlock) {
  const txs = block.transactions.map((tx) => handleTransaction(tx));
  const actions = block.actions.map((action) => handleAction(action, block.header.height));
  await store.bulkCreate("Transaction", txs);
  await store.bulkCreate("Action", actions);
}

export function handleTransaction(tx: NearTransaction) {
  return Transaction.create({
    id: `${tx.block_hash}-${tx.result.id}`,
    blockHeight: BigInt(tx.block_height),
    sender: tx.signer_id,
    receiver: tx.receiver_id,
  });
}

export function handleAction(action: NearAction, blockHeight: number) {
  logger.warn(`XXXXX ${JSON.stringify(action)}`)
  const actionStore = new Action(`${action.receipt.id}-${action.id}`);
  actionStore.blockHeight = BigInt(blockHeight);
  actionStore.type = action.type;
  actionStore.sender = action.receipt.predecessor_id;
  actionStore.receiver = action.receipt.receiver_id;

  switch (action.type) {
    case ActionType.DeployContract:
      action = action as NearAction<DeployContract>;
      break;
    case ActionType.FunctionCall:
      action = action as NearAction<FunctionCall>;
      actionStore.methodName = action.action.args;
      break;
    case ActionType.Transfer:
      action = action as NearAction<Transfer>;
      break;
    case ActionType.Stake:
      action = action as NearAction<Stake>;
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
