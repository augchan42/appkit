/* eslint-disable max-depth */
import { AccountController, ChainController, ConnectionController, CoreHelperUtil, StorageUtil, AlertController } from '@reown/appkit-core';
import { ConstantsUtil, ErrorUtil, LoggerUtil, PresetsUtil } from '@reown/appkit-utils';
import UniversalProvider from '@walletconnect/universal-provider';
import { WcHelpersUtil } from '../utils/HelpersUtil.js';
import { SafeLocalStorage, SafeLocalStorageKeys, ConstantsUtil as CommonConstantsUtil } from '@reown/appkit-common';
import { ProviderUtil } from '../store/index.js';
const OPTIONAL_METHODS = [
    'eth_accounts',
    'eth_requestAccounts',
    'eth_sendRawTransaction',
    'eth_sign',
    'eth_signTransaction',
    'eth_signTypedData',
    'eth_signTypedData_v3',
    'eth_signTypedData_v4',
    'eth_sendTransaction',
    'personal_sign',
    'wallet_switchEthereumChain',
    'wallet_addEthereumChain',
    'wallet_getPermissions',
    'wallet_requestPermissions',
    'wallet_registerOnboarding',
    'wallet_watchAsset',
    'wallet_scanQRCode',
    // EIP-5792
    'wallet_getCallsStatus',
    'wallet_sendCalls',
    'wallet_getCapabilities',
    // EIP-7715
    'wallet_grantPermissions',
    'wallet_revokePermissions'
];
// -- Client --------------------------------------------------------------------
export class UniversalAdapterClient {
    constructor(options) {
        this.appKit = undefined;
        this.isUniversalAdapterClient = true;
        this.options = undefined;
        this.adapterType = 'universal';
        this.reportErrors = true;
        const { siweConfig, metadata } = options;
        this.caipNetworks = options.networks;
        this.chainNamespace = CommonConstantsUtil.CHAIN.EVM;
        this.metadata = metadata;
        this.networkControllerClient = {
            // @ts-expect-error switchCaipNetwork is async for some adapter but not for this adapter
            switchCaipNetwork: caipNetwork => {
                if (caipNetwork) {
                    this.switchNetwork(caipNetwork);
                }
            },
            getApprovedCaipNetworksData: async () => {
                const provider = await this.getWalletConnectProvider();
                if (!provider) {
                    return Promise.resolve({
                        supportsAllNetworks: false,
                        approvedCaipNetworkIds: []
                    });
                }
                const approvedCaipNetworkIds = WcHelpersUtil.getChainsFromNamespaces(provider.session?.namespaces);
                return Promise.resolve({
                    supportsAllNetworks: false,
                    approvedCaipNetworkIds
                });
            }
        };
        this.connectionControllerClient = {
            connectWalletConnect: async (onUri) => {
                const WalletConnectProvider = await this.getWalletConnectProvider();
                if (!WalletConnectProvider) {
                    throw new Error('connectionControllerClient:getWalletConnectUri - provider is undefined');
                }
                WalletConnectProvider.on('display_uri', (uri) => {
                    onUri(uri);
                });
                if (ChainController.state.activeChain &&
                    ChainController.state?.chains?.get(ChainController.state.activeChain)?.adapterType ===
                        'wagmi') {
                    const adapter = ChainController.state.chains.get(ChainController.state.activeChain);
                    await adapter?.connectionControllerClient?.connectWalletConnect?.(onUri);
                    this.setWalletConnectProvider();
                }
                else {
                    const siweParams = await siweConfig?.getMessageParams?.();
                    const isSiweEnabled = siweConfig?.options?.enabled;
                    const isProviderSupported = typeof WalletConnectProvider?.authenticate === 'function';
                    const isSiweParamsValid = siweParams && Object.keys(siweParams || {}).length > 0;
                    if (siweConfig &&
                        isSiweEnabled &&
                        siweParams &&
                        isProviderSupported &&
                        isSiweParamsValid &&
                        ChainController.state.activeChain === CommonConstantsUtil.CHAIN.EVM) {
                        const { SIWEController, getDidChainId, getDidAddress } = await import('@reown/appkit-siwe');
                        const chains = this.caipNetworks
                            ?.filter(network => network.chainNamespace === CommonConstantsUtil.CHAIN.EVM)
                            .map(chain => chain.caipNetworkId);
                        siweParams.chains = this.caipNetworks
                            ?.filter(network => network.chainNamespace === CommonConstantsUtil.CHAIN.EVM)
                            .map(chain => chain.id);
                        const result = await WalletConnectProvider.authenticate({
                            nonce: await siweConfig?.getNonce?.(),
                            methods: [...OPTIONAL_METHODS],
                            ...siweParams,
                            chains
                        });
                        // Auths is an array of signed CACAO objects https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-74.md
                        const signedCacao = result?.auths?.[0];
                        if (signedCacao) {
                            const { p, s } = signedCacao;
                            const cacaoChainId = getDidChainId(p.iss);
                            const address = getDidAddress(p.iss);
                            if (address && cacaoChainId) {
                                SIWEController.setSession({
                                    address,
                                    chainId: parseInt(cacaoChainId, 10)
                                });
                            }
                            try {
                                // Kicks off verifyMessage and populates external states
                                const message = WalletConnectProvider.client.formatAuthMessage({
                                    request: p,
                                    iss: p.iss
                                });
                                await SIWEController.verifyMessage({
                                    message,
                                    signature: s.s,
                                    cacao: signedCacao
                                });
                            }
                            catch (error) {
                                // eslint-disable-next-line no-console
                                console.error('Error verifying message', error);
                                // eslint-disable-next-line no-console
                                await WalletConnectProvider.disconnect().catch(console.error);
                                // eslint-disable-next-line no-console
                                await SIWEController.signOut().catch(console.error);
                                throw error;
                            }
                        }
                    }
                    else {
                        const optionalNamespaces = WcHelpersUtil.createNamespaces(this.caipNetworks);
                        await WalletConnectProvider.connect({ optionalNamespaces });
                    }
                    this.setWalletConnectProvider();
                }
            },
            disconnect: async () => {
                SafeLocalStorage.removeItem(SafeLocalStorageKeys.WALLET_ID);
                if (siweConfig?.options?.signOutOnDisconnect) {
                    const { SIWEController } = await import('@reown/appkit-siwe');
                    await SIWEController.signOut();
                }
                await this.walletConnectProvider?.disconnect();
                this.appKit?.resetAccount(CommonConstantsUtil.CHAIN.EVM);
                this.appKit?.resetAccount(CommonConstantsUtil.CHAIN.SOLANA);
            },
            signMessage: async (message) => {
                const provider = await this.getWalletConnectProvider();
                const caipAddress = ChainController.state.activeCaipAddress;
                const address = CoreHelperUtil.getPlainAddress(caipAddress);
                if (!provider) {
                    throw new Error('connectionControllerClient:signMessage - provider is undefined');
                }
                const signature = await provider.request({
                    method: 'personal_sign',
                    params: [message, address]
                });
                return signature;
            },
            estimateGas: async () => await Promise.resolve(BigInt(0)),
            // -- Transaction methods ---------------------------------------------------
            /**
             *
             * These methods are supported only on `wagmi` and `ethers` since the Solana SDK does not support them in the same way.
             * These function definition is to have a type parity between the clients. Currently not in use.
             */
            getEnsAvatar: async (value) => await Promise.resolve(value),
            getEnsAddress: async (value) => await Promise.resolve(value),
            writeContract: async () => await Promise.resolve('0x'),
            getCapabilities: async (params) => {
                const provider = await this.getWalletConnectProvider();
                if (!provider) {
                    throw new Error('connectionControllerClient:getCapabilities - provider is undefined');
                }
                const walletCapabilitiesString = provider.session?.sessionProperties?.['capabilities'];
                if (walletCapabilitiesString) {
                    const walletCapabilities = this.parseWalletCapabilities(walletCapabilitiesString);
                    const accountCapabilities = walletCapabilities[params];
                    if (accountCapabilities) {
                        return accountCapabilities;
                    }
                }
                return await provider.request({ method: 'wallet_getCapabilities', params: [params] });
            },
            grantPermissions: async (params) => {
                const provider = await this.getWalletConnectProvider();
                if (!provider) {
                    throw new Error('connectionControllerClient:grantPermissions - provider is undefined');
                }
                return provider.request({ method: 'wallet_grantPermissions', params });
            },
            revokePermissions: async (session) => {
                const provider = await this.getWalletConnectProvider();
                if (!provider) {
                    throw new Error('connectionControllerClient:grantPermissions - provider is undefined');
                }
                return provider.request({ method: 'wallet_revokePermissions', params: [session] });
            },
            sendTransaction: async () => await Promise.resolve('0x'),
            parseUnits: () => BigInt(0),
            formatUnits: () => ''
        };
    }
    // -- Public ------------------------------------------------------------------
    construct(appkit, options) {
        this.appKit = appkit;
        this.options = options;
        this.createProvider();
        this.syncRequestedNetworks(this.caipNetworks);
        this.syncConnectors();
    }
    switchNetwork(caipNetwork) {
        if (caipNetwork) {
            if (this.walletConnectProvider) {
                this.walletConnectProvider.setDefaultChain(caipNetwork.caipNetworkId);
            }
        }
    }
    async disconnect() {
        if (this.walletConnectProvider) {
            await this.walletConnectProvider.disconnect();
            this.appKit?.resetAccount(CommonConstantsUtil.CHAIN.EVM);
            this.appKit?.resetAccount(CommonConstantsUtil.CHAIN.SOLANA);
        }
    }
    async getWalletConnectProvider() {
        if (!this.walletConnectProvider) {
            try {
                await this.createProvider();
            }
            catch (error) {
                throw new Error('EthereumAdapter:getWalletConnectProvider - Cannot create provider');
            }
        }
        return this.walletConnectProvider;
    }
    // -- Private -----------------------------------------------------------------
    createProvider() {
        if (!this.walletConnectProviderInitPromise &&
            typeof window !== 'undefined' &&
            this.options?.projectId) {
            this.walletConnectProviderInitPromise = this.initWalletConnectProvider(this.options?.projectId);
        }
        return this.walletConnectProviderInitPromise;
    }
    async initWalletConnectProvider(projectId) {
        const logger = LoggerUtil.createLogger((err, ...args) => {
            if (err.message.includes(ErrorUtil.UniversalProviderErrors.UNAUTHORIZED_DOMAIN_NOT_ALLOWED)) {
                if (this.reportErrors) {
                    AlertController.open(ErrorUtil.ALERT_ERRORS.INVALID_APP_CONFIGURATION, 'error');
                    this.reportErrors = false;
                }
                return;
            }
            // eslint-disable-next-line no-console
            console.error(...args);
        });
        const walletConnectProviderOptions = {
            projectId,
            metadata: {
                name: this.metadata ? this.metadata.name : '',
                description: this.metadata ? this.metadata.description : '',
                url: this.metadata ? this.metadata.url : '',
                icons: this.metadata ? this.metadata.icons : ['']
            },
            logger
        };
        this.walletConnectProvider = await UniversalProvider.init(walletConnectProviderOptions);
        await this.checkActiveWalletConnectProvider();
    }
    syncRequestedNetworks(caipNetworks) {
        const uniqueChainNamespaces = [
            ...new Set(caipNetworks.map(caipNetwork => caipNetwork.chainNamespace))
        ];
        uniqueChainNamespaces
            .filter(c => Boolean(c))
            .forEach(chainNamespace => {
            this.appKit?.setRequestedCaipNetworks(caipNetworks.filter(caipNetwork => caipNetwork.chainNamespace === chainNamespace), chainNamespace);
        });
    }
    async checkActiveWalletConnectProvider() {
        const WalletConnectProvider = await this.getWalletConnectProvider();
        const walletId = SafeLocalStorage.getItem(SafeLocalStorageKeys.WALLET_ID);
        if (WalletConnectProvider) {
            if (walletId === ConstantsUtil.WALLET_CONNECT_CONNECTOR_ID) {
                this.setWalletConnectProvider();
            }
        }
    }
    setWalletConnectProvider() {
        SafeLocalStorage.setItem(SafeLocalStorageKeys.WALLET_ID, ConstantsUtil.WALLET_CONNECT_CONNECTOR_ID);
        const nameSpaces = this.walletConnectProvider?.session?.namespaces;
        if (nameSpaces) {
            const reversedChainNamespaces = Object.keys(nameSpaces).reverse();
            reversedChainNamespaces.forEach(chainNamespace => {
                const caipAddress = nameSpaces?.[chainNamespace]?.accounts[0];
                ProviderUtil.setProvider(chainNamespace, this.walletConnectProvider);
                ProviderUtil.setProviderId(chainNamespace, 'walletConnect');
                this.appKit?.setApprovedCaipNetworksData(chainNamespace);
                if (caipAddress) {
                    this.appKit?.setCaipAddress(caipAddress, chainNamespace);
                }
            });
            const storedCaipNetwork = StorageUtil.getStoredActiveCaipNetwork();
            const activeCaipNetwork = ChainController.state.activeCaipNetwork;
            try {
                if (storedCaipNetwork) {
                    ChainController.setActiveCaipNetwork(storedCaipNetwork);
                }
                else if (!activeCaipNetwork ||
                    !ChainController.getAllApprovedCaipNetworkIds().includes(activeCaipNetwork.caipNetworkId)) {
                    this.setDefaultNetwork(nameSpaces);
                }
            }
            catch (error) {
                console.warn('>>> Error setting active caip network', error);
            }
        }
        this.syncAccount();
        this.watchWalletConnect();
    }
    setDefaultNetwork(nameSpaces) {
        const chainNamespace = this.caipNetworks[0]?.chainNamespace;
        if (chainNamespace) {
            const namespace = nameSpaces?.[chainNamespace];
            if (namespace?.chains) {
                const chainId = namespace.chains[0];
                if (chainId) {
                    const requestedCaipNetworks = ChainController.getRequestedCaipNetworks(chainNamespace);
                    if (requestedCaipNetworks) {
                        const network = requestedCaipNetworks.find(c => c.caipNetworkId === chainId);
                        if (network) {
                            ChainController.setActiveCaipNetwork(network);
                        }
                    }
                }
            }
        }
    }
    async watchWalletConnect() {
        const provider = await this.getWalletConnectProvider();
        const namespaces = provider?.session?.namespaces || {};
        function disconnectHandler() {
            Object.keys(namespaces).forEach(key => {
                AccountController.resetAccount(key);
            });
            ConnectionController.resetWcConnection();
            SafeLocalStorage.removeItem(SafeLocalStorageKeys.WALLET_ID);
            provider?.removeListener('disconnect', disconnectHandler);
            provider?.removeListener('accountsChanged', accountsChangedHandler);
        }
        const accountsChangedHandler = (accounts) => {
            if (accounts.length > 0) {
                this.syncAccount();
            }
        };
        const chainChanged = (chainId) => {
            // eslint-disable-next-line eqeqeq
            const caipNetwork = this.caipNetworks.find(c => c.id == chainId);
            const currentCaipNetwork = this.appKit?.getCaipNetwork();
            if (!caipNetwork) {
                const namespace = this.appKit?.getActiveChainNamespace() || CommonConstantsUtil.CHAIN.EVM;
                ChainController.setActiveCaipNetwork({
                    id: chainId,
                    caipNetworkId: `${namespace}:${chainId}`,
                    name: 'Unknown Network',
                    chainNamespace: namespace,
                    nativeCurrency: {
                        name: '',
                        decimals: 0,
                        symbol: ''
                    },
                    rpcUrls: {
                        default: {
                            http: []
                        }
                    }
                });
                return;
            }
            if (!currentCaipNetwork || currentCaipNetwork?.id !== caipNetwork?.id) {
                this.appKit?.setCaipNetwork(caipNetwork);
            }
        };
        if (provider) {
            provider.on('disconnect', disconnectHandler);
            provider.on('accountsChanged', accountsChangedHandler);
            provider.on('chainChanged', chainChanged);
        }
    }
    getProviderData() {
        const namespaces = this.walletConnectProvider?.session?.namespaces || {};
        const isConnected = this.appKit?.getIsConnectedState() || false;
        const preferredAccountType = this.appKit?.getPreferredAccountType() || '';
        return {
            provider: this.walletConnectProvider,
            namespaces,
            namespaceKeys: namespaces ? Object.keys(namespaces) : [],
            isConnected,
            preferredAccountType
        };
    }
    syncAccount() {
        const { namespaceKeys, namespaces } = this.getProviderData();
        const preferredAccountType = this.appKit?.getPreferredAccountType();
        const isConnected = this.appKit?.getIsConnectedState() || false;
        if (isConnected) {
            namespaceKeys.forEach(async (key) => {
                const chainNamespace = key;
                const address = namespaces?.[key]?.accounts[0];
                const isNamespaceConnected = this.appKit?.getCaipAddress(chainNamespace);
                if (!isNamespaceConnected) {
                    this.appKit?.setPreferredAccountType(preferredAccountType, chainNamespace);
                    this.appKit?.setCaipAddress(address, chainNamespace);
                    this.syncConnectedWalletInfo();
                    await Promise.all([this.appKit?.setApprovedCaipNetworksData(chainNamespace)]);
                }
                this.syncAccounts();
            });
        }
        else {
            this.appKit?.resetWcConnection();
            this.appKit?.resetNetwork(this.chainNamespace);
            this.syncAccounts(true);
        }
    }
    syncAccounts(reset = false) {
        const { namespaces } = this.getProviderData();
        const chainNamespaces = Object.keys(namespaces);
        chainNamespaces.forEach(chainNamespace => {
            const addresses = namespaces?.[chainNamespace]?.accounts
                ?.map(account => {
                const [, , address] = account.split(':');
                return address;
            })
                .filter((address, index, self) => self.indexOf(address) === index);
            if (reset) {
                this.appKit?.setAllAccounts([], chainNamespace);
            }
            if (addresses) {
                this.appKit?.setAllAccounts(addresses.map(address => ({ address, type: 'eoa' })), chainNamespace);
            }
        });
    }
    syncConnectedWalletInfo() {
        const currentActiveWallet = SafeLocalStorage.getItem(SafeLocalStorageKeys.WALLET_ID);
        const namespaces = this.walletConnectProvider?.session?.namespaces || {};
        const chainNamespaces = Object.keys(namespaces);
        chainNamespaces.forEach(chainNamespace => {
            if (this.walletConnectProvider?.session) {
                this.appKit?.setConnectedWalletInfo({
                    ...this.walletConnectProvider.session.peer.metadata,
                    name: this.walletConnectProvider.session.peer.metadata.name,
                    icon: this.walletConnectProvider.session.peer.metadata.icons?.[0]
                }, chainNamespace);
            }
            else if (currentActiveWallet) {
                this.appKit?.setConnectedWalletInfo({ name: currentActiveWallet }, CommonConstantsUtil.CHAIN.EVM);
                this.appKit?.setConnectedWalletInfo({ name: currentActiveWallet }, CommonConstantsUtil.CHAIN.SOLANA);
            }
        });
    }
    syncConnectors() {
        const w3mConnectors = [];
        w3mConnectors.push({
            id: ConstantsUtil.WALLET_CONNECT_CONNECTOR_ID,
            explorerId: PresetsUtil.ConnectorExplorerIds[ConstantsUtil.WALLET_CONNECT_CONNECTOR_ID],
            imageId: PresetsUtil.ConnectorImageIds[ConstantsUtil.WALLET_CONNECT_CONNECTOR_ID],
            name: PresetsUtil.ConnectorNamesMap[ConstantsUtil.WALLET_CONNECT_CONNECTOR_ID],
            type: 'WALLET_CONNECT',
            chain: this.chainNamespace
        });
        this.appKit?.setConnectors(w3mConnectors);
    }
    parseWalletCapabilities(walletCapabilitiesString) {
        try {
            const walletCapabilities = JSON.parse(walletCapabilitiesString);
            return walletCapabilities;
        }
        catch (error) {
            throw new Error('Error parsing wallet capabilities');
        }
    }
}
//# sourceMappingURL=client.js.map