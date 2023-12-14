import {
  NearTransaction,
  NearAction,
  NearBlock,
  NearTransactionReceipt, DelegateAction, SignedDelegate, ActionType,
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

  for (const tx of txs) {
    await tx.save()
  }
  for (const actionList of actions.flat()) {
    await actionList.save()
  }
  for (const receipt of receipts) {
    await receipt.save()
  }
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

export function handleAction(action: NearAction): Action[]{
  const actionStoreList: Action[] = []
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

  actionStore.methodName = action.action?.method_name;
  actionStore.publicKey = action.action?.public_key;
  actionStore.beneficiaryId = action.action?.beneficiary_id;


  if (action.action?.delegate_action?.actions) {
    const nestedActions: Action[] = action.action?.delegate_action?.actions.map((nestedNearAction: NearAction, index: number) => {
        const [reconstructedNestedAction] = Object.entries(nestedNearAction).map(([key, value]) => {
          return {
            id: action.id,
            receipt: action.receipt,
            type: ActionType[key as keyof typeof ActionType],
            action: {
              ...value,
              ...action.action?.delegate_action
            },
            transaction: action.transaction,
          } as NearAction;
        });
      const [nestedActionStore] =  handleAction(
          reconstructedNestedAction
      )
      nestedActionStore.id = `${nestedActionStore.id}-${index}`
      return nestedActionStore
    })
    actionStoreList.push(...nestedActions)
  }

  actionStoreList.push(actionStore)
  return actionStoreList
}