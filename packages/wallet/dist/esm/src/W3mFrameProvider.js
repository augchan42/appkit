import { W3mFrame } from './W3mFrame.js';
import { W3mFrameConstants, W3mFrameRpcConstants } from './W3mFrameConstants.js';
import { W3mFrameStorage } from './W3mFrameStorage.js';
import { W3mFrameHelpers } from './W3mFrameHelpers.js';
import { W3mFrameLogger } from './W3mFrameLogger.js';
export class W3mFrameProvider {
    constructor({ projectId, chainId, onTimeout }) {
        this.openRpcRequests = [];
        this.w3mLogger = new W3mFrameLogger(projectId);
        this.w3mFrame = new W3mFrame(projectId, true, chainId);
        this.onTimeout = onTimeout;
    }
    getLoginEmailUsed() {
        return Boolean(W3mFrameStorage.get(W3mFrameConstants.EMAIL_LOGIN_USED_KEY));
    }
    getEmail() {
        return W3mFrameStorage.get(W3mFrameConstants.EMAIL);
    }
    async connectEmail(payload) {
        try {
            W3mFrameHelpers.checkIfAllowedToTriggerEmail();
            const response = await this.appEvent({
                type: W3mFrameConstants.APP_CONNECT_EMAIL,
                payload
            });
            this.setNewLastEmailLoginTime();
            return response;
        }
        catch (error) {
            this.w3mLogger.logger.error({ error }, 'Error connecting email');
            throw error;
        }
    }
    async connectDevice() {
        try {
            return this.appEvent({
                type: W3mFrameConstants.APP_CONNECT_DEVICE
            });
        }
        catch (error) {
            this.w3mLogger.logger.error({ error }, 'Error connecting device');
            throw error;
        }
    }
    async connectOtp(payload) {
        try {
            return this.appEvent({
                type: W3mFrameConstants.APP_CONNECT_OTP,
                payload
            });
        }
        catch (error) {
            this.w3mLogger.logger.error({ error }, 'Error connecting otp');
            throw error;
        }
    }
    async isConnected() {
        try {
            const response = await this.appEvent({
                type: W3mFrameConstants.APP_IS_CONNECTED
            });
            if (!response.isConnected) {
                this.deleteAuthLoginCache();
            }
            return response;
        }
        catch (error) {
            this.deleteAuthLoginCache();
            this.w3mLogger.logger.error({ error }, 'Error checking connection');
            throw error;
        }
    }
    async getChainId() {
        try {
            const response = await this.appEvent({
                type: W3mFrameConstants.APP_GET_CHAIN_ID
            });
            this.setLastUsedChainId(response.chainId);
            return response;
        }
        catch (error) {
            this.w3mLogger.logger.error({ error }, 'Error getting chain id');
            throw error;
        }
    }
    async getSocialRedirectUri(payload) {
        try {
            return this.appEvent({
                type: W3mFrameConstants.APP_GET_SOCIAL_REDIRECT_URI,
                payload
            });
        }
        catch (error) {
            this.w3mLogger.logger.error({ error }, 'Error getting social redirect uri');
            throw error;
        }
    }
    async updateEmail(payload) {
        try {
            const response = await this.appEvent({
                type: W3mFrameConstants.APP_UPDATE_EMAIL,
                payload
            });
            this.setNewLastEmailLoginTime();
            return response;
        }
        catch (error) {
            this.w3mLogger.logger.error({ error }, 'Error updating email');
            throw error;
        }
    }
    async updateEmailPrimaryOtp(payload) {
        try {
            return this.appEvent({
                type: W3mFrameConstants.APP_UPDATE_EMAIL_PRIMARY_OTP,
                payload
            });
        }
        catch (error) {
            this.w3mLogger.logger.error({ error }, 'Error updating email primary otp');
            throw error;
        }
    }
    async updateEmailSecondaryOtp(payload) {
        try {
            const response = await this.appEvent({
                type: W3mFrameConstants.APP_UPDATE_EMAIL_SECONDARY_OTP,
                payload
            });
            this.setLoginSuccess(response.newEmail);
            return response;
        }
        catch (error) {
            this.w3mLogger.logger.error({ error }, 'Error updating email secondary otp');
            throw error;
        }
    }
    async syncTheme(payload) {
        try {
            return this.appEvent({
                type: W3mFrameConstants.APP_SYNC_THEME,
                payload
            });
        }
        catch (error) {
            this.w3mLogger.logger.error({ error }, 'Error syncing theme');
            throw error;
        }
    }
    async syncDappData(payload) {
        try {
            return this.appEvent({
                type: W3mFrameConstants.APP_SYNC_DAPP_DATA,
                payload
            });
        }
        catch (error) {
            this.w3mLogger.logger.error({ error }, 'Error syncing dapp data');
            throw error;
        }
    }
    async getSmartAccountEnabledNetworks() {
        try {
            const response = await this.appEvent({
                type: W3mFrameConstants.APP_GET_SMART_ACCOUNT_ENABLED_NETWORKS
            });
            this.persistSmartAccountEnabledNetworks(response.smartAccountEnabledNetworks);
            return response;
        }
        catch (error) {
            this.persistSmartAccountEnabledNetworks([]);
            this.w3mLogger.logger.error({ error }, 'Error getting smart account enabled networks');
            throw error;
        }
    }
    async setPreferredAccount(type) {
        try {
            return this.appEvent({
                type: W3mFrameConstants.APP_SET_PREFERRED_ACCOUNT,
                payload: { type }
            });
        }
        catch (error) {
            this.w3mLogger.logger.error({ error }, 'Error setting preferred account');
            throw error;
        }
    }
    async connect(payload) {
        try {
            const chainId = payload?.chainId || this.getLastUsedChainId() || 1;
            const response = await this.appEvent({
                type: W3mFrameConstants.APP_GET_USER,
                payload: { ...payload, chainId }
            });
            this.setLoginSuccess(response.email);
            this.setLastUsedChainId(response.chainId);
            return response;
        }
        catch (error) {
            this.w3mLogger.logger.error({ error }, 'Error connecting');
            throw error;
        }
    }
    async getUser(payload) {
        try {
            const chainId = payload?.chainId || this.getLastUsedChainId() || 1;
            const response = await this.appEvent({
                type: W3mFrameConstants.APP_GET_USER,
                payload: { ...payload, chainId }
            });
            return response;
        }
        catch (error) {
            this.w3mLogger.logger.error({ error }, 'Error connecting');
            throw error;
        }
    }
    async connectSocial(uri) {
        try {
            const response = await this.appEvent({
                type: W3mFrameConstants.APP_CONNECT_SOCIAL,
                payload: { uri }
            });
            if (response.userName) {
                this.setSocialLoginSuccess(response.userName);
            }
            return response;
        }
        catch (error) {
            this.w3mLogger.logger.error({ error }, 'Error connecting social');
            throw error;
        }
    }
    async getFarcasterUri() {
        try {
            const response = await this.appEvent({
                type: W3mFrameConstants.APP_GET_FARCASTER_URI
            });
            return response;
        }
        catch (error) {
            this.w3mLogger.logger.error({ error }, 'Error getting farcaster uri');
            throw error;
        }
    }
    async connectFarcaster() {
        try {
            const response = await this.appEvent({
                type: W3mFrameConstants.APP_CONNECT_FARCASTER
            });
            if (response.userName) {
                this.setSocialLoginSuccess(response.userName);
            }
            return response;
        }
        catch (error) {
            this.w3mLogger.logger.error({ error }, 'Error connecting farcaster');
            throw error;
        }
    }
    async switchNetwork(chainId) {
        try {
            const response = await this.appEvent({
                type: W3mFrameConstants.APP_SWITCH_NETWORK,
                payload: { chainId }
            });
            this.setLastUsedChainId(response.chainId);
            return response;
        }
        catch (error) {
            this.w3mLogger.logger.error({ error }, 'Error switching network');
            throw error;
        }
    }
    async disconnect() {
        try {
            const response = await this.appEvent({
                type: W3mFrameConstants.APP_SIGN_OUT
            });
            this.deleteAuthLoginCache();
            return response;
        }
        catch (error) {
            this.w3mLogger.logger.error({ error }, 'Error disconnecting');
            throw error;
        }
    }
    async request(req) {
        try {
            if (W3mFrameRpcConstants.GET_CHAIN_ID === req.method) {
                return this.getLastUsedChainId();
            }
            this.rpcRequestHandler?.(req);
            const response = await this.appEvent({
                type: W3mFrameConstants.APP_RPC_REQUEST,
                payload: req
            });
            this.rpcSuccessHandler?.(response, req);
            return response;
        }
        catch (error) {
            this.rpcErrorHandler?.(error, req);
            this.w3mLogger.logger.error({ error }, 'Error requesting');
            throw error;
        }
    }
    onRpcRequest(callback) {
        this.rpcRequestHandler = callback;
    }
    onRpcSuccess(callback) {
        this.rpcSuccessHandler = callback;
    }
    onRpcError(callback) {
        this.rpcErrorHandler = callback;
    }
    onIsConnected(callback) {
        this.w3mFrame.events.onFrameEvent(event => {
            if (event.type === W3mFrameConstants.FRAME_IS_CONNECTED_SUCCESS &&
                event.payload.isConnected) {
                callback();
            }
        });
    }
    onNotConnected(callback) {
        this.w3mFrame.events.onFrameEvent(event => {
            if (event.type === W3mFrameConstants.FRAME_IS_CONNECTED_ERROR) {
                callback();
            }
            if (event.type === W3mFrameConstants.FRAME_IS_CONNECTED_SUCCESS &&
                !event.payload.isConnected) {
                callback();
            }
        });
    }
    onConnect(callback) {
        this.w3mFrame.events.onFrameEvent(event => {
            if (event.type === W3mFrameConstants.FRAME_GET_USER_SUCCESS) {
                callback(event.payload);
            }
        });
    }
    async getCapabilities() {
        try {
            const capabilities = await this.request({
                method: 'wallet_getCapabilities'
            });
            return capabilities || {};
        }
        catch {
            return {};
        }
    }
    onSetPreferredAccount(callback) {
        this.w3mFrame.events.onFrameEvent(event => {
            if (event.type === W3mFrameConstants.FRAME_SET_PREFERRED_ACCOUNT_SUCCESS) {
                callback(event.payload);
            }
            else if (event.type === W3mFrameConstants.FRAME_SET_PREFERRED_ACCOUNT_ERROR) {
                callback({ type: W3mFrameRpcConstants.ACCOUNT_TYPES.EOA });
            }
        });
    }
    onGetSmartAccountEnabledNetworks(callback) {
        this.w3mFrame.events.onFrameEvent(event => {
            if (event.type === W3mFrameConstants.FRAME_GET_SMART_ACCOUNT_ENABLED_NETWORKS_SUCCESS) {
                callback(event.payload.smartAccountEnabledNetworks);
            }
            else if (event.type === W3mFrameConstants.FRAME_GET_SMART_ACCOUNT_ENABLED_NETWORKS_ERROR) {
                callback([]);
            }
        });
    }
    getAvailableChainIds() {
        return Object.keys(this.w3mFrame.networks);
    }
    rejectRpcRequests() {
        try {
            this.openRpcRequests.forEach(({ abortController, method }) => {
                if (!W3mFrameRpcConstants.SAFE_RPC_METHODS.includes(method)) {
                    abortController.abort();
                }
            });
            this.openRpcRequests = [];
        }
        catch (e) {
            this.w3mLogger.logger.error({ error: e }, 'Error aborting RPC request');
        }
    }
    async appEvent(event) {
        let retries = 3;
        while (retries > 0) {
            try {
                await Promise.race([
                    this.w3mFrame.frameLoadPromise,
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Frame load timeout')), 1000))
                ]);
                break;
            }
            catch (e) {
                retries--;
                if (retries === 0) {
                    console.warn('W3mFrame: Frame load attempts exhausted');
                    return undefined;
                }
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        let timer = undefined;
        function replaceEventType(type) {
            return type.replace('@w3m-app/', '');
        }
        const abortController = new AbortController();
        const type = replaceEventType(event.type);
        const frameExists = () => {
            try {
                return (Boolean(this.w3mFrame) && Boolean(document.querySelector('iframe[class*="w3m-frame"]')));
            }
            catch {
                return false;
            }
        };
        const shouldCheckForTimeout = [
            W3mFrameConstants.APP_CONNECT_EMAIL,
            W3mFrameConstants.APP_CONNECT_DEVICE,
            W3mFrameConstants.APP_CONNECT_OTP,
            W3mFrameConstants.APP_CONNECT_SOCIAL,
            W3mFrameConstants.APP_GET_SOCIAL_REDIRECT_URI,
            W3mFrameConstants.APP_GET_FARCASTER_URI
        ]
            .map(replaceEventType)
            .includes(type);
        if (shouldCheckForTimeout) {
            timer = setTimeout(() => {
                this.onTimeout?.();
                abortController.abort();
            }, 30000);
        }
        return new Promise((resolve, reject) => {
            const id = Math.random().toString(36).substring(7);
            try {
                this.w3mLogger?.logger?.info?.({ event, id }, 'Sending app event');
            }
            catch (e) {
                console.warn('W3mFrame: Logger error', e);
            }
            try {
                if (!frameExists()) {
                    if (timer) {
                        clearTimeout(timer);
                    }
                    return resolve(undefined);
                }
                this.w3mFrame.events.postAppEvent({ ...event, id });
            }
            catch (e) {
                console.warn('W3mFrame: Error posting event', e);
                if (timer) {
                    clearTimeout(timer);
                }
                return resolve(undefined);
            }
            if (type === 'RPC_REQUEST') {
                const rpcEvent = event;
                this.openRpcRequests = [...this.openRpcRequests, { ...rpcEvent.payload, abortController }];
            }
            abortController.signal.addEventListener('abort', () => {
                if (type === 'RPC_REQUEST') {
                    reject(new Error('Request was aborted'));
                }
                else {
                    resolve(undefined);
                }
            });
            function handler(framEvent, logger) {
                if (framEvent.id !== id) {
                    return;
                }
                try {
                    logger?.logger?.info?.({ framEvent, id }, 'Received frame response');
                }
                catch (e) {
                    console.warn('W3mFrame: Logger error in handler', e);
                }
                if (framEvent.type === `@w3m-frame/${type}_SUCCESS`) {
                    if (timer) {
                        clearTimeout(timer);
                    }
                    if ('payload' in framEvent) {
                        resolve(framEvent.payload);
                    }
                    resolve(undefined);
                }
                else if (framEvent.type === `@w3m-frame/${type}_ERROR`) {
                    if (timer) {
                        clearTimeout(timer);
                    }
                    resolve(undefined);
                }
            }
            this.w3mFrame.events.registerFrameEventHandler(id, frameEvent => handler(frameEvent, this.w3mLogger), abortController.signal);
        });
    }
    setNewLastEmailLoginTime() {
        W3mFrameStorage.set(W3mFrameConstants.LAST_EMAIL_LOGIN_TIME, Date.now().toString());
    }
    setSocialLoginSuccess(username) {
        W3mFrameStorage.set(W3mFrameConstants.SOCIAL_USERNAME, username);
    }
    setLoginSuccess(email) {
        if (email) {
            W3mFrameStorage.set(W3mFrameConstants.EMAIL, email);
        }
        W3mFrameStorage.set(W3mFrameConstants.EMAIL_LOGIN_USED_KEY, 'true');
        W3mFrameStorage.delete(W3mFrameConstants.LAST_EMAIL_LOGIN_TIME);
    }
    deleteAuthLoginCache() {
        W3mFrameStorage.delete(W3mFrameConstants.EMAIL_LOGIN_USED_KEY);
        W3mFrameStorage.delete(W3mFrameConstants.EMAIL);
        W3mFrameStorage.delete(W3mFrameConstants.LAST_USED_CHAIN_KEY);
        W3mFrameStorage.delete(W3mFrameConstants.SOCIAL_USERNAME);
    }
    setLastUsedChainId(chainId) {
        if (chainId) {
            W3mFrameStorage.set(W3mFrameConstants.LAST_USED_CHAIN_KEY, String(chainId));
        }
    }
    getLastUsedChainId() {
        return Number(W3mFrameStorage.get(W3mFrameConstants.LAST_USED_CHAIN_KEY));
    }
    persistSmartAccountEnabledNetworks(networks) {
        W3mFrameStorage.set(W3mFrameConstants.SMART_ACCOUNT_ENABLED_NETWORKS, networks.join(','));
    }
}
//# sourceMappingURL=W3mFrameProvider.js.map