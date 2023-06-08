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
  NearTransactionReceipt,
} from "@subql/types-near";
import { Action, Receipt, Transaction } from "../types";

(BigInt as any).prototype.toJSON = function () {
  return `${this.toString()}n`;
};

export function stripObjectUnicode(t: object): object {
  // Warning negative lookbehind `(?<!\\)` in regex might not work in all JS versions
  return JSON.parse(JSON.stringify(t).replace(/(?<!\\)\\u[0-9A-Fa-f]{4}/g, ""));
}

export async function handleBlock(block: NearBlock) {
  const txs = block.transactions.map((tx) => handleTransaction(tx));
  const actions = block.actions.map((action) => handleAction(action));
  const receipts = block.receipts.map((receipt) => handleReceipt(receipt));

  await store.bulkCreate("Transaction", txs);
  await store.bulkCreate("Action", actions);
  await store.bulkCreate("Receipt", receipts);
}

export function handleTransaction(tx: NearTransaction) {
  return Transaction.create({
    id: `${tx.block_hash}-${tx.result.id}`,
    blockHeight: BigInt(tx.block_height),
    sender: tx.signer_id,
    receiver: tx.receiver_id,
  });
}

export function handleReceipt(receipt: NearTransactionReceipt) {
  const receiptStore = Receipt.create({
    id: `${receipt.block_height}-${receipt.receipt_id}`,
    blockHeight: BigInt(receipt.block_height),
    sender: receipt.predecessor_id,
    receiver: receipt.receiver_id,
  });

  if(receipt.Action) {
    receiptStore.singer = receipt.Action.signer_id;
  }

  return receiptStore;
}

export function handleAction(action: NearAction) {
  let actionStore: Action;

  if (action.transaction) {
    actionStore = Action.create({
      id: `${action.transaction.block_height}-${action.transaction.result.id}-${action.id}`,
      type: action.type,
      blockHeight: BigInt(action.transaction.block_height),
      sender: action.transaction.signer_id,
      receiver: action.transaction.receiver_id,
    });
  } else if (action.receipt) {
    actionStore = Action.create({
      id: `${action.receipt.block_height}-${action.receipt.receipt_id}-${action.id}`,
      type: action.type,
      blockHeight: BigInt(action.receipt.block_height),
      sender: action.receipt.predecessor_id,
      receiver: action.receipt.receiver_id,
    });
  } else {
    throw new Error('No transaction or receipt');
  }

  if(action.transaction) {
    actionStore.txHash = action.transaction.result.id;
  }

  if(action.receipt && action.receipt.Action) {
    actionStore.signer = action.receipt.Action.signer_id;
  }

  switch (action.type) {
    case ActionType.DeployContract:
      action = action as NearAction<DeployContract>;
      break;
    case ActionType.FunctionCall:
      actionStore.methodName = (action as NearAction<FunctionCall>).action.method_name;
      break;
    case ActionType.Transfer:
      action = action as NearAction<Transfer>;
      break;
    case ActionType.Stake:
      action = action as NearAction<Stake>;
      break;
    case ActionType.AddKey:
      actionStore.publicKey = (action as NearAction<AddKey>).action.public_key;
      // actionStore.accessKey = (action as NearAction<AddKey>).action.access_key;
      break;
    case ActionType.DeleteKey:
      actionStore.publicKey = (action as NearAction<DeleteKey>).action.public_key;
      break;
    case ActionType.DeleteAccount:
      actionStore.beneficiaryId = (action as NearAction<DeleteAccount>).action.beneficiary_id;
      break;
    case ActionType.CreateAccount:
      //nothing to store
      break;
    default:
      throw new Error(`Unknown Action Type: ${action.type}`);
  }

  return actionStore;
}
