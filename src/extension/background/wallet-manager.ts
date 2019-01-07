import { IGasFeeOptions } from './../../app/utils/blockchain/types';
import { Blockchain } from 'moonlet-core/src/core/blockchain';
import { browser } from 'webextension-polyfill-ts';
import Wallet from 'moonlet-core/src/core/wallet';

import aes from 'crypto-js/aes';
import encUtf8 from 'crypto-js/enc-utf8';
import { NonceManager } from '../../app/utils/nonce-manager';
import { Response } from '../../app/utils/response';
import { WalletErrorCodes } from '../../app/iwallet-provider';

const WALLET_STORAGE_KEY = 'serializedWallet';

// set testnets
import networksEth from 'moonlet-core/src/blockchain/ethereum/networks';
networksEth[0] = networksEth[2];
import networksZil from 'moonlet-core/src/blockchain/zilliqa/networks';
networksZil[0] = networksZil[1];
networksZil[0].network_id = 0;
networksZil[0].url = 'https://api.zilliqa.com';
// networksZil[0].url = 'http://localhost:4200';
// createWallet("kid patch sample either echo supreme hungry ketchup hero away ice alcohol");

export class WalletManager {
    private wallet: Wallet;
    private password: string;

    public async create(mnemonics: string, password: string) {
        this.wallet = new Wallet(mnemonics);
        this.wallet.loadBlockchain(await this.loadBlockchain('zilliqa'));
        this.wallet.loadBlockchain(await this.loadBlockchain('ethereum'));

        this.wallet.createAccount(Blockchain.ZILLIQA);

        this.password = password;
        await this.saveToStorage();
        return this.get();
    }

    public async get() {
        const check = await this.checkWallet();
        if (check.error) {
            return check;
        }

        return Response.resolve(JSON.parse(this.wallet.toJSON())); // TODO: return a serialized version of wallet
    }

    public async changePassword(oldPassword, newPassword) {
        let json = aes.decrypt(await this.getFromStorage(), oldPassword);
        if (json) {
            json = json.toString(encUtf8);
            this.password = newPassword;
            await this.saveToStorage();
            return Response.resolve();
        }

        return Response.reject(WalletErrorCodes.INVALID_PASSWORD);
    }

    public async lock() {
        await this.saveToStorage();
        this.wallet = null;
        this.password = undefined;
        return Response.resolve();
    }

    public async unlock(password: string) {
        const check = await this.checkWallet();
        if (check.error && check.code !== WalletErrorCodes.WALLET_LOCKED) {
            return check;
        }

        // TODO: remove lazy loading
        const blockchains = await Promise.all([
            this.loadBlockchain('ethereum'),
            this.loadBlockchain('zilliqa')
        ]);

        try {
            const json = aes.decrypt(await this.getFromStorage(), password).toString(encUtf8);
            if (json) {
                const wallet = Wallet.fromJson(json, blockchains);
                this.wallet = wallet;
                this.password = password;
                return this.get();
            }
        } catch {
            /* */
        }

        return Response.reject(WalletErrorCodes.INVALID_PASSWORD);
    }

    public async saveToStorage() {
        const check = await this.checkWallet();
        if (check.error) {
            return check;
        }

        const encryptedWallet = aes.encrypt(this.wallet.toJSON(), this.password).toString();
        browser.storage.local.set({
            [WALLET_STORAGE_KEY]: {
                json: encryptedWallet
            }
        });
        return Response.resolve();
    }

    public async createAccount(blockchain: Blockchain) {
        const account = this.wallet.getBlockchain(blockchain).createAccount();
        return Response.resolve(account);
    }

    public async getBalance(blockchain: Blockchain, address: string) {
        const b = this.wallet.getBlockchain(blockchain);
        const account = b.getAccounts().find(acc => acc.address === address);

        if (account) {
            try {
                const balance = await account.getBalance();
                return Response.resolve(account.utils.balanceToStd(balance));
            } catch (e) {
                return Response.reject(WalletErrorCodes.GENERIC_ERROR, e.message, e);
            }
        }
        return Response.reject(
            WalletErrorCodes.ACCOUNT_NOT_FOUND,
            `Account with address: ${address} was not found.`
        );
    }

    public async getNonce(blockchain: Blockchain, address: string) {
        const b = this.wallet.getBlockchain(blockchain);
        const account = b.getAccounts().find(acc => acc.address === address);

        if (account) {
            try {
                const nonce = await account.getNonce();
                return Response.resolve(nonce);
            } catch (e) {
                return Response.reject(WalletErrorCodes.GENERIC_ERROR, e.message, e);
            }
        }
        return Response.reject(
            WalletErrorCodes.ACCOUNT_NOT_FOUND,
            `Account with address: ${address} was not found.`
        );
    }

    public async transfer(
        blockchain: Blockchain,
        fromAddress: string,
        toAddress: string,
        amount: number,
        feeOptions
    ) {
        const b = this.wallet.getBlockchain(blockchain);
        const account = b.getAccounts().find(acc => acc.address === fromAddress);

        if (account) {
            try {
                const nonce = await NonceManager.next(account);
                const tx = account.buildTransferTransaction(
                    toAddress,
                    amount,
                    nonce,
                    (feeOptions as IGasFeeOptions).gasLimit,
                    (feeOptions as IGasFeeOptions).gasPrice
                );
                account.signTransaction(tx);
                const response = await account.send(tx);
                (tx as any).data = new Date().toLocaleString();
                return Response.resolve(response);
            } catch (e) {
                if (e.code) {
                    return Response.reject(e);
                }
                return Response.reject(WalletErrorCodes.GENERIC_ERROR, e.message, e);
            }
        }
        return Response.reject(
            WalletErrorCodes.ACCOUNT_NOT_FOUND,
            `Account with address: ${fromAddress} was not found.`
        );
    }

    private async loadBlockchain(name: string) {
        const blockchain = require(`moonlet-core/src/blockchain/${name}/class.index`);
        if (this.wallet) {
            this.wallet.loadBlockchain(blockchain.default);
        }

        return blockchain.default;
    }

    private async getFromStorage() {
        const storage = await browser.storage.local.get();
        return storage[WALLET_STORAGE_KEY] && storage[WALLET_STORAGE_KEY].json;
    }

    private async checkWallet(): Promise<{ error; code?; message?; data? }> {
        if (this.wallet && this.password) {
            return Response.resolve();
        }

        const encryptedWallet = await this.getFromStorage();
        if (encryptedWallet) {
            return Response.reject(WalletErrorCodes.WALLET_LOCKED);
        } else {
            return Response.reject(WalletErrorCodes.WALLET_NOT_FOUND);
        }
    }
}
