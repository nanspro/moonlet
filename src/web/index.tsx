import { h } from 'preact';
import { Provider } from 'preact-redux';
import App from '../app/app.container';
import { getStore } from '../app/data';
import { DeviceScreenSize, Platform } from '../app/types';
import { getScreenSizeMatchMedia } from '../app/utils/screen-size-match-media';
import { Blockchain } from 'moonlet-core/src/core/blockchain';
import { WebWalletProvider } from './wallet-provider';

const store = getStore({
    pageConfig: {
        device: {
            screenSize: getScreenSizeMatchMedia().matches
                ? DeviceScreenSize.SMALL
                : DeviceScreenSize.BIG,
            platform: Platform.WEB
        },
        layout: {}
    },
    wallet: {
        invalidPassword: false,
        loadingInProgress: false,
        loaded: false,
        locked: false,
        selectedBlockchain: Blockchain.ZILLIQA,
        selectedNetwork: 0,
        selectedAccount: 0,
        data: {
            accounts: []
        }
    }
});
const walletProvider = new WebWalletProvider();

export default props => (
    <Provider store={store}>
        <App {...props} walletProvider={walletProvider} />
    </Provider>
);
