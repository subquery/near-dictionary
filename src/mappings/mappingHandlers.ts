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
  const receiptStore = new Receipt(
    `${receipt.block_height}-${receipt.receipt_id}`
  );

  receiptStore.blockHeight = BigInt(receipt.block_height);
  receiptStore.sender = receipt.predecessor_id;
  receiptStore.receiver = receipt.receiver_id;
  if(receipt.Action) {
    receiptStore.singer = receipt.Action.signer_id;
  }

  return receiptStore;
}

export function handleAction(action: NearAction) {
  const hash = action.transaction ?
  `${action.transaction.block_height}-${action.transaction.result.id}-${action.id}`:
  `${action.receipt.block_height}-${action.receipt.receipt_id}-${action.id}`;

  const actionStore = new Action(hash);

  const height = action.transaction ? BigInt(action.transaction.block_height) : BigInt(action.receipt.block_height);
  actionStore.blockHeight = height;
  
  if(action.transaction) {
    actionStore.txHash = action.transaction.result.id;
  }

  actionStore.type = action.type;
  actionStore.sender = action.transaction ? action.transaction.signer_id : action.receipt.predecessor_id;
  actionStore.receiver = action.transaction ? action.transaction.receiver_id : action.receipt.receiver_id;

  if(action.receipt && action.receipt.Action) {
    actionStore.signer = action.receipt.Action.signer_id;
  }

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
