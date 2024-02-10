import { Injectable, Logger } from '@nestjs/common';
import { Contract, Numbers, Web3 } from 'web3';
import { abiDungeonCU, addressCU } from '../abi/abiDungeonCU';
import { abiAmmyBBQ, addressAmmyBBQ } from '../abi/ammyBBQ';
import {
  catchError,
  concatMap,
  delay,
  EMPTY,
  expand,
  finalize,
  from,
  iif,
  map,
  mergeMap,
  Observable,
  of,
  switchMap,
  tap,
  zip,
} from 'rxjs';
import { ethers } from 'ethers';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import * as process from 'process';
import { abiBbqTokenAddress, bbqTokenAddress } from '../abi/bbqToken';
import { jazziCUAbi, jazziCUAddress } from '../abi/jazziCU';

interface ntfEquip {
  characterId: string;
  refuelAt: number;
  isStaked: boolean;
  gasOut: Date;
  allPow: number;
}

@Injectable()
export class EtherjsService {
  logger = Logger;
  web3: Web3;
  dungeonCUContract: Contract<typeof abiDungeonCU>;
  bbqTokenContract: Contract<typeof abiBbqTokenAddress>;
  ammyBBQContract: Contract<typeof abiAmmyBBQ>;
  jazziCUContract: Contract<typeof jazziCUAbi>;
  nftEquip$ = new Observable<ntfEquip>();

  constructor(private readonly schedulerRegistry: SchedulerRegistry) {
    this.web3 = new Web3('https://rpc-l1.jibchain.net/');
    this.dungeonCUContract = new this.web3.eth.Contract(
      abiDungeonCU,
      '0x42F5213C7b6281FC6fb2d6F10576F70DB0a4C841',
    );
    this.bbqTokenContract = new this.web3.eth.Contract(
      abiBbqTokenAddress,
      bbqTokenAddress,
    );
    this.ammyBBQContract = new this.web3.eth.Contract(
      abiAmmyBBQ,
      addressAmmyBBQ,
    );
    this.jazziCUContract = new this.web3.eth.Contract(
      jazziCUAbi,
      jazziCUAddress,
    );

    this.nftEquip$ = from(
      this.dungeonCUContract.methods.nftEquip(addressCU).call(),
    ).pipe(
      map((v: any) => ({
        characterId: v.characterId,
        refuelAt: Number(v.refuelAt),
        isStaked: v.isStaked,
        gasOut: new Date(Number(v.refuelAt) * 1000 + 3600 * 1000),
        allPow: v.allPow,
      })),
    );
  }

  getBalance() {
    return this.web3.eth.getBalance(
      '0x666f19299A0b7E1EF6cd1B42a25B0a22449872e7',
    );
  }

  sign() {
    return this.mine();
  }

  refuelGas() {
    const id = 1;

    return this.nftEquip$.pipe(
      // tap(console.log),
      mergeMap((value) => {
        return iif(
          () =>
            value.isStaked || (value.gasOut <= new Date() && !!value.allPow),
          // ()=>true,
          this.getResource().pipe(
            switchMap((resourceToken) => {
              if (resourceToken < 500) {
                // TODO buy resource
                console.log('resource not enough');
                return of('resource not enough');
              }
              return zip([
                of(this.dungeonCUContract.methods.refuel(id)),
                from(this.web3.eth.getGasPrice()),
              ]).pipe(
                tap(console.log),
                switchMap((contactMethod) => {
                  return from(
                    this.web3.eth.accounts.signTransaction(
                      {
                        data: contactMethod[0].encodeABI(),
                        from: process.env.ADDRESS,
                        gasPrice: ethers.parseUnits('1.500000007', 'gwei'),
                        gas: this.web3.utils.toHex(100000),
                        to: this.dungeonCUContract.options.address,
                        value: '0x0',
                      },
                      process.env.PRIVATE_KEY,
                    ),
                  ).pipe(
                    switchMap((sign) => {
                      console.log('send sign refuel');
                      return from(
                        this.web3.eth.sendSignedTransaction(
                          sign.rawTransaction,
                        ),
                      );
                    }),
                    tap(() => {
                      console.log('refuel success');
                    }),
                    map(() => of('refuel success')),
                  );
                }),
              );
            }),
          ),
          of('nft is staking').pipe(tap(() => console.log('nft is staking'))),
        );
      }),
    );
  }

  getResource() {
    return from(
      this.bbqTokenContract.methods
        .balanceOf(process.env.ADDRESS)
        .call<Numbers>(),
    ).pipe(map((v) => Number(this.web3.utils.fromWei(v, 'ether'))));
  }

  mine() {
    const id = '0';
    return zip(
      of(this.dungeonCUContract.methods.unstake(id)),
      from(this.web3.eth.getGasPrice()),
      of(this.dungeonCUContract.methods.unstake(id).estimateGas()),
    ).pipe(
      switchMap((encodeABI) => {
        return from(
          this.web3.eth.accounts.signTransaction(
            {
              data: encodeABI[0].encodeABI(),
              from: '0x666f19299a0b7e1ef6cd1b42a25b0a22449872e7',
              gasPrice: this.web3.utils.toHex(encodeABI[1]),
              gas: 75000,
              to: this.dungeonCUContract.options.address,
              value: '0x0',
            },
            process.env.PRIVATE_KEY,
          ),
        ).pipe(
          switchMap((sign) => {
            return from(
              this.web3.eth.sendSignedTransaction(sign.rawTransaction),
            );
          }),
          tap(console.log),
          map(() => of('mine success')),
          switchMap(() => {
            return this.refuelGas();
          }),
        );
      }),
    );
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  readContact() {
    console.log('start cron job mine :', new Date());
    this.nftEquip$
      .pipe(
        switchMap((value) => {
          console.log('calculating...');
          if (value.isStaked) {
            if (value.gasOut <= new Date()) {
              console.log('ready for mine');
              if (this.schedulerRegistry.doesExist('timeout', 'refuelGas')) {
                const timeout = this.schedulerRegistry.getTimeout('refuelGas');
                if (timeout) {
                  this.schedulerRegistry.deleteTimeout('refuelGas');
                }
              }
              this.refuelGas().subscribe();
              return of('ready for mine');
            } else {
              if (this.schedulerRegistry.doesExist('timeout', 'refuelGas')) {
                const timeout = this.schedulerRegistry.getTimeout('refuelGas');
                if (timeout) {
                  this.schedulerRegistry.deleteTimeout('refuelGas');
                }
              }
              // register schedule
              const timeOut = setTimeout(() => {
                console.log('time for mine');
                this.refuelGas().subscribe();
              }, value.gasOut.getTime() - new Date().getTime());
              this.schedulerRegistry.addTimeout('refuelGas', timeOut);
              console.log(
                `wait ${
                  (value.gasOut.getTime() - new Date().getTime()) / 1000 / 60
                } minute for mine`,
              );
              return of(
                `wait ${
                  (value.gasOut.getTime() - new Date().getTime()) / 1000 / 60
                } minute for mine`,
              );
            }
          } else {
            console.log('not stake');
            return of('not stake');
          }
        }),
        catchError((e) => {
          console.error(e);
          return EMPTY;
        }),
        finalize(() => {
          console.log('end processed');
        }),
      )
      .subscribe();
    return ';';
  }

  estimateResource(
    resource: number = 500,
    contact: Contract<any> = this.ammyBBQContract,
  ) {
    return zip(
      from(contact.methods.getReserveCMJ().call<Numbers>()),
      from(contact.methods.getReserveToken().call<Numbers>()),
    ).pipe(
      concatMap((value) => {
        return from(
          contact.methods
            .getAmountOfTokens(10 ** 18, value[1], value[0])
            .call<Numbers>(),
        ).pipe(
          map((price) => resource * Number(ethers.formatEther(price))),
          concatMap((price) => {
            return of(price).pipe(
              expand((token) => {
                this.logger.log('token %s', token);
                return from(
                  contact.methods
                    .getAmountOfTokens(
                      ethers.parseEther(String(token)),
                      value[0],
                      value[1],
                    )
                    .call<Numbers>(),
                ).pipe(
                  switchMap((bbq) => {
                    if (Number(ethers.formatEther(bbq)) < resource) {
                      token = Number((token * (0.5 / 100 + 1)).toFixed(7));
                      console.log(token, ethers.formatEther(bbq));
                      return of(token);
                    }
                    console.log(ethers.formatEther(bbq));
                    return EMPTY;
                  }),
                  delay(200),
                );
              }),
            );
          }),
        );
      }),
      map((value) => `${resource} token = ${value} CMJ`),
    );
  }
}
