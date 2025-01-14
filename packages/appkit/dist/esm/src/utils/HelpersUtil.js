export const WcHelpersUtil = {
    getMethodsByChainNamespace(chainNamespace) {
        switch (chainNamespace) {
            case 'solana':
                return [
                    'solana_signMessage',
                    'solana_signTransaction',
                    'solana_requestAccounts',
                    'solana_getAccounts',
                    'solana_signAllTransactions',
                    'solana_signAndSendTransaction'
                ];
            case 'eip155':
                return [
                    'personal_sign',
                    'eth_sign',
                    'eth_signTransaction',
                    'eth_signTypedData',
                    'eth_signTypedData_v3',
                    'eth_signTypedData_v4',
                    'eth_sendRawTransaction',
                    'eth_sendTransaction',
                    'wallet_getCapabilities',
                    'wallet_sendCalls',
                    'wallet_showCallsStatus',
                    'wallet_getCallsStatus',
                    'wallet_grantPermissions',
                    'wallet_revokePermissions',
                    'wallet_switchEthereumChain'
                ];
            default:
                return [];
        }
    },
    createNamespaces(caipNetworks) {
        return caipNetworks.reduce((acc, chain) => {
            const { id, chainNamespace, rpcUrls } = chain;
            const rpcUrl = rpcUrls.default.http[0];
            const methods = this.getMethodsByChainNamespace(chainNamespace);
            if (!acc[chainNamespace]) {
                acc[chainNamespace] = {
                    methods,
                    events: ['accountsChanged', 'chainChanged'],
                    chains: [],
                    rpcMap: {}
                };
            }
            const caipNetworkId = `${chainNamespace}:${id}`;
            // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
            const namespace = acc[chainNamespace];
            namespace.chains.push(caipNetworkId);
            if (namespace?.rpcMap && rpcUrl) {
                namespace.rpcMap[id] = rpcUrl;
            }
            return acc;
        }, {});
    },
    getChainsFromNamespaces(namespaces = {}) {
        return Object.values(namespaces).flatMap(namespace => {
            const chains = (namespace.chains || []);
            const accountsChains = namespace.accounts.map(account => {
                const [chainNamespace, chainId] = account.split(':');
                return `${chainNamespace}:${chainId}`;
            });
            return Array.from(new Set([...chains, ...accountsChains]));
        });
    }
};
//# sourceMappingURL=HelpersUtil.js.map