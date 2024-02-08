import { Observable } from 'rxjs';
import { SignTransactionResult } from 'web3-eth-accounts';
import { Web3EthInterface } from 'web3/src/types';

export function sendSignedTransaction(eth: Web3EthInterface) {
  return (source: Observable<SignTransactionResult>) => {
    return new Observable((subscriber) => {
      source.subscribe({
        next(value) {
          console.log('send signed transaction');

          subscriber.next(eth.sendSignedTransaction(value.rawTransaction));
        },
        error(error) {
          subscriber.error(error);
        },
        complete() {
          subscriber.complete();
        },
      });
    });
  };
}
