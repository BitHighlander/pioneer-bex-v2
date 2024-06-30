import { AssetValue } from '@pioneer-platform/helpers';
import { Chain, ChainToNetworkId, getChainEnumValue } from '@coinmasters/types';
import { getPaths } from "@pioneer-platform/pioneer-coins";

interface KeepKeyWallet {
    type: string;
    icon: string;
    chains: string[];
    wallet: any;
    status: string;
    isConnected: boolean;
}

const getWalletByChain = async (keepkey: any, chain: any) => {
    if (!keepkey[chain]) return null;

    const walletMethods = keepkey[chain].walletMethods;
    const address = await walletMethods.getAddress();
    if (!address) return null;

    let balance = [];
    if (walletMethods.getPubkeys) {
        const pubkey = await walletMethods.getPubkeys();
        console.log('** pubkey: ', pubkey)
        const pubkeyBalance = await walletMethods.getBalance([pubkey]);
        console.log('pubkeyBalance: ', pubkeyBalance)
        // balance.push(Number(pubkeyBalance[0].toFixed(pubkeyBalance[0].decimal)) || 0);
        // console.log('balance: ', balance)
        // for (const pubkey of pubkeys) {
        //     const pubkeyBalance = await walletMethods.getBalance([{ pubkey }]);
        //     balance.push(Number(pubkeyBalance[0].toFixed(pubkeyBalance[0].decimal)) || 0);
        // }
        // const assetValue = AssetValue.fromChainOrSignature(
        //     Chain.Bitcoin,
        //     balance.reduce((a, b) => a + b, 0),
        // );
        let assetValue = AssetValue.fromChainOrSignature(
          chain,
          "0.001",
        );
        balance = [assetValue];
    } else {
        balance = await walletMethods.getBalance([{ address }]);
    }

    return { address, balance };
};

export const onStartKeepkey = async function () {
    try {
        const chains = ['ETH'];
        // @ts-ignore
        const { keepkeyWallet } = await import('@coinmasters/wallet-keepkey');

        const walletKeepKey: KeepKeyWallet = {
            type: 'KEEPKEY',
            icon: '',
            chains,
            wallet: keepkeyWallet,
            status: 'offline',
            isConnected: false,
        };

        const allByCaip = chains.map((chainStr) => {
            const chain = getChainEnumValue(chainStr);
            if (chain) {
                return ChainToNetworkId[chain];
            }
            return undefined;
        });

        const paths = getPaths(allByCaip);
        let keepkey: any = {};

        function addChain({ info, keepkeySdk, chain, walletMethods, wallet }) {
            keepkey[chain] = {
                info,
                keepkeySdk,
                walletMethods,
                wallet,
            };
        }

        let keepkeyConfig = {
            apiKey: localStorage.getItem('keepkeyApiKey') || '123',
            pairingInfo: {
                name: "Wallet Connect",
                imageUrl: "https://assets-global.website-files.com/61e4755aed304a1902077c92/6580b382048a90097562ccf5_6580b21b381a5d791651cd35_WalletConnect-Homepage-p-800.png",
                basePath: 'http://localhost:1646/spec/swagger.json',
                url: 'http://localhost:1646',
            }
        };

        let covalentApiKey = 'cqt_rQ6333MVWCVJFVX3DbCCGMVqRH4q';
        let ethplorerApiKey = 'EK-xs8Hj-qG4HbLY-LoAu7';
        let utxoApiKey = 'B_s9XK926uwmQSGTDEcZB3vSAmt5t2';
        let input = {
            apis: {},
            rpcUrls: {},
            addChain,
            config: { keepkeyConfig, covalentApiKey, ethplorerApiKey, utxoApiKey },
        };

        // Step 1: Invoke the outer function with the input object
        const connectFunction = walletKeepKey.wallet.connect(input);

        // Step 2: Invoke the inner function with chains and paths
        let kkApikey = await connectFunction(chains, paths);
        console.log("kkApikey: ", kkApikey);
        localStorage.setItem('keepkeyApiKey', kkApikey.keepkeyApiKey);

        // got balances
        for (let i = 0; i < chains.length; i++) {
            let chain = chains[i];
            let walletData: any = await getWalletByChain(keepkey, chain);
            console.log("chain: ", chain);
            keepkey[chain].wallet.balance = walletData.balance;
        }

        return keepkey;
    } catch (e) {
        console.error(e);
        throw e;
    }
};
