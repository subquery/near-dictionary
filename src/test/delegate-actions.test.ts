import { subqlTest } from '@subql/testing';
import {Action} from "../types";
import {ActionType} from "@subql/types-near";

subqlTest(
    'Correct nested actions in SignedDelegate',
    89972378,
    [],
    [
        Action.create({
            id: '89972378-7FuopjYbcQpwpoj616SmcTf5ZctSPyQS5FjefVqADbAk-0',
            txHash: '7FuopjYbcQpwpoj616SmcTf5ZctSPyQS5FjefVqADbAk',
            receiptId: undefined,
            type: ActionType.SignedDelegate,
            blockHeight: BigInt(89972378),
            sender: 'mintbus.near',
            receiver: 'mintbus.near',
            signer: undefined,
            methodName: undefined,
            args: undefined,
            publicKey: undefined,
            beneficiaryId: undefined
        }),
        Action.create({
            id: '89972378-7FuopjYbcQpwpoj616SmcTf5ZctSPyQS5FjefVqADbAk-0-0',
            txHash: '7FuopjYbcQpwpoj616SmcTf5ZctSPyQS5FjefVqADbAk',
            receiptId: undefined,
            type: ActionType.FunctionCall,
            blockHeight: BigInt(89972378),
            sender: 'mintbus.near',
            receiver: 'mintbus.near',
            signer: undefined,
            methodName: 'nft_batch_mint',
            args: undefined,
            publicKey: undefined,
            beneficiaryId: undefined
        }),
    ],
    'handleBlock'
)