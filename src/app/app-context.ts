import { IWalletProvider } from './iwallet-provider';

const context = {};

export const appContext = (key, value?) => {
    if (key) {
        if (value) {
            context[key] = value;
            return true;
        } else {
            return context[key];
        }
    }

    return undefined;
};

export const getWalletProvider = (): IWalletProvider => {
    return appContext('walletProvider');
};
