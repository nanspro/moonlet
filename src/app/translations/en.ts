import { ITranslations } from './types';

export const translation: ITranslations = {
    texts: {
        App: {
            labels: {
                dashboard: 'Dashboard',
                send: 'Send',
                receive: 'Receive',
                settings: 'Settings',
                signOut: 'Sign out'
            }
        },
        DrawerMenu: {
            title: 'Moonlet',
            subtitle: 'Web wallet'
        },
        LandingPage: {
            title: 'Moonlet',
            createNewWallet: 'Create new wallet',
            restoreExistingWallet: 'Restore existing wallet'
        }
    },
    plural: (n: number, ord: boolean) => {
        const s = String(n).split('.');
        const v0 = !s[1];
        const t0 = Number(s[0]) === n;
        const n10 = t0 && s[0].slice(-1);
        const n100 = t0 && s[0].slice(-2);

        if (ord) {
            return n10 === '1' && n100 !== '11'
                ? 'one'
                : n10 === '2' && n100 !== '12'
                    ? 'two'
                    : n10 === '3' && n100 !== '13'
                        ? 'few'
                        : 'other';
        }
        return n === 1 && v0 ? 'one' : 'other';
    }
};