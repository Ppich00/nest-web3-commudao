import { Injectable } from '@nestjs/common';
import { Contract, Numbers, Web3 } from 'web3';
import { abiDungeonCU, addressCU } from '../abi/abiDungeonCU';
import { abiAmmyBBQ, addressAmmyBBQ } from '../abi/ammyBBQ';
import {
  concatMap,
  delay,
  EMPTY,
  expand,
  finalize,
  from,
  map,
  of,
  Subject,
  switchMap,
  tap,
  zip,
} from 'rxjs';
import { ethers } from 'ethers';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import * as process from 'process';
import { sendSignedTransaction } from '../util/sendSignedTransaction';

@Injectable()
export class EtherjsService {
  web3: Web3;
  sendSignedTransaction$ = new Subject();

  constructor(private readonly schedulerRegistry: SchedulerRegistry) {
    this.web3 = new Web3('https://rpc-l1.jibchain.net/');
    // this.sendSignedTransaction$.pipe(sendSignedTransaction());
  }

  getBalance() {
    return this.web3.eth.getBalance(
      '0x666f19299A0b7E1EF6cd1B42a25B0a22449872e7',
    );
  }

  sign() {
    const contact = new this.web3.eth.Contract(
      abiDungeonCU,
      '0x42F5213C7b6281FC6fb2d6F10576F70DB0a4C841',
    );
    return this.mine(contact, null);
  }

  refuelGas() {
    const contact = new this.web3.eth.Contract(
      abiDungeonCU,
      '0x42F5213C7b6281FC6fb2d6F10576F70DB0a4C841',
    );

    const id = 1;
    return zip(
      of(contact.methods.refuel(id)),
      from(this.web3.eth.getGasPrice()),
    ).pipe(
      switchMap((contactMethod) => {
        return from(
          this.web3.eth.accounts.signTransaction(
            {
              data: contactMethod[0].encodeABI(),
              from: process.env.ADDRESS,
              gasPrice: ethers.parseUnits('1.500000007', 'gwei'),
              gas: this.web3.utils.toHex(100000),
              to: contact.options.address,
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
          tap((v) => {
            console.log(v);
          }),
        );
      }),
    );
  }

  mine(contact: Contract<any>, characterId) {
    const id = '0';
    return zip(
      of(contact.methods.unstake(id)),
      from(this.web3.eth.getGasPrice()),
      of(contact.methods.unstake(id).estimateGas()),
    ).pipe(
      switchMap((encodeABI) => {
        return from(
          this.web3.eth.accounts.signTransaction(
            {
              data: encodeABI[0].encodeABI(),
              from: '0x666f19299a0b7e1ef6cd1b42a25b0a22449872e7',
              gasPrice: this.web3.utils.toHex(encodeABI[1]),
              gas: 75000,
              to: contact.options.address,
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

  @Cron('*/2 * * * *')
  readContact() {
    const contact = new this.web3.eth.Contract(
      abiDungeonCU,
      '0x42F5213C7b6281FC6fb2d6F10576F70DB0a4C841',
    );
    console.log('start cron job mine :', new Date());
    from(contact.methods.nftEquip(addressCU).call())
      .pipe(
        map((v: any) => ({
          characterId: v.characterId,
          refuelAt: Number(v.refuelAt),
          isStaked: v.isStaked,
          gasOut: new Date(Number(v.refuelAt) * 1000 + 3600 * 1000),
        })),
        switchMap((value) => {
          console.log('calculating...');
          if (value.isStaked) {
            if (value.gasOut <= new Date()) {
              console.log('ready for mine');
              return this.mine(contact, value.characterId);
            } else {
              if (this.schedulerRegistry.doesExist('timeout', 'mine')) {
                const timeout = this.schedulerRegistry.getTimeout('mine');
                if (timeout) {
                  this.schedulerRegistry.deleteTimeout('mine');
                }
              }
              // register schedule
              this.schedulerRegistry.addTimeout(
                'mine',
                setTimeout(() => {
                  this.mine(contact, value.characterId);
                }, value.gasOut.getTime() - new Date().getTime()),
              );
              console.log(
                `wait ${
                  (value.gasOut.getTime() - new Date().getTime()) / 1000 / 60
                } minute for mine`,
              );
              console.log(this.schedulerRegistry.getTimeouts());
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
        finalize(() => {
          console.log('end processed');
        }),
      )
      .subscribe();
    return ';';
  }

  buyResource() {
    const contact = new this.web3.eth.Contract(abiAmmyBBQ, addressAmmyBBQ);
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
          map((price) => 500 * Number(ethers.formatEther(price))),
          concatMap((price) => {
            return of(price).pipe(
              expand((token) => {
                console.log('token ', token);
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
                    if (Number(ethers.formatEther(bbq)) < 500) {
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

      // concatMap((arr) => {
      //   this.web3.utils.fromWei(arr[2], 'ether');
      //   return from(contact.methods.getAmountOfTokens().call());
      // }),
    );
    // return from(contact.methods.getReserveCMJ().call())
  }
}
