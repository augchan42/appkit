import type { W3mFrameTypes } from './W3mFrameTypes.js';
import { W3mFrameLogger } from './W3mFrameLogger.js';
interface W3mFrameProviderConfig {
    projectId: string;
    chainId?: W3mFrameTypes.Network['chainId'];
    onTimeout?: () => void;
}
export declare class W3mFrameProvider {
    w3mLogger: W3mFrameLogger;
    private w3mFrame;
    private openRpcRequests;
    private rpcRequestHandler?;
    private rpcSuccessHandler?;
    private rpcErrorHandler?;
    onTimeout?: () => void;
    constructor({ projectId, chainId, onTimeout }: W3mFrameProviderConfig);
    getLoginEmailUsed(): boolean;
    getEmail(): string | null;
    connectEmail(payload: W3mFrameTypes.Requests['AppConnectEmailRequest']): Promise<{
        action: "VERIFY_DEVICE" | "VERIFY_OTP";
    }>;
    connectDevice(): Promise<undefined>;
    connectOtp(payload: W3mFrameTypes.Requests['AppConnectOtpRequest']): Promise<undefined>;
    isConnected(): Promise<{
        isConnected: boolean;
    }>;
    getChainId(): Promise<{
        chainId: string | number;
    }>;
    getSocialRedirectUri(payload: W3mFrameTypes.Requests['AppGetSocialRedirectUriRequest']): Promise<{
        uri: string;
    }>;
    updateEmail(payload: W3mFrameTypes.Requests['AppUpdateEmailRequest']): Promise<{
        action: "VERIFY_PRIMARY_OTP" | "VERIFY_SECONDARY_OTP";
    }>;
    updateEmailPrimaryOtp(payload: W3mFrameTypes.Requests['AppUpdateEmailPrimaryOtpRequest']): Promise<undefined>;
    updateEmailSecondaryOtp(payload: W3mFrameTypes.Requests['AppUpdateEmailSecondaryOtpRequest']): Promise<{
        newEmail: string;
    }>;
    syncTheme(payload: W3mFrameTypes.Requests['AppSyncThemeRequest']): Promise<undefined>;
    syncDappData(payload: W3mFrameTypes.Requests['AppSyncDappDataRequest']): Promise<W3mFrameTypes.Responses['FrameSyncDappDataResponse']>;
    getSmartAccountEnabledNetworks(): Promise<{
        smartAccountEnabledNetworks: number[];
    }>;
    setPreferredAccount(type: W3mFrameTypes.AccountType): Promise<{
        type: string;
        address: string;
    }>;
    connect(payload?: W3mFrameTypes.Requests['AppGetUserRequest']): Promise<{
        chainId: string | number;
        address: string;
        email?: string | null | undefined;
        smartAccountDeployed?: boolean | undefined;
        accounts?: {
            type: "eoa" | "smartAccount";
            address: string;
        }[] | undefined;
        preferredAccountType?: string | undefined;
    }>;
    getUser(payload: W3mFrameTypes.Requests['AppGetUserRequest']): Promise<{
        chainId: string | number;
        address: string;
        email?: string | null | undefined;
        smartAccountDeployed?: boolean | undefined;
        accounts?: {
            type: "eoa" | "smartAccount";
            address: string;
        }[] | undefined;
        preferredAccountType?: string | undefined;
    }>;
    connectSocial(uri: string): Promise<{
        chainId: string | number;
        email: string;
        address: string;
        accounts?: {
            type: "eoa" | "smartAccount";
            address: string;
        }[] | undefined;
        userName?: string | undefined;
    }>;
    getFarcasterUri(): Promise<{
        url: string;
    }>;
    connectFarcaster(): Promise<{
        userName: string;
    }>;
    switchNetwork(chainId: number | string): Promise<{
        chainId: string | number;
    }>;
    disconnect(): Promise<undefined>;
    request(req: W3mFrameTypes.RPCRequest): Promise<W3mFrameTypes.RPCResponse>;
    onRpcRequest(callback: (request: W3mFrameTypes.RPCRequest) => void): void;
    onRpcSuccess(callback: (response: W3mFrameTypes.FrameEvent, request: W3mFrameTypes.RPCRequest) => void): void;
    onRpcError(callback: (error: Error, request: W3mFrameTypes.RPCRequest) => void): void;
    onIsConnected(callback: () => void): void;
    onNotConnected(callback: () => void): void;
    onConnect(callback: (user: W3mFrameTypes.Responses['FrameGetUserResponse']) => void): void;
    getCapabilities(): Promise<Record<`0x${string}`, W3mFrameTypes.WalletCapabilities>>;
    onSetPreferredAccount(callback: ({ type, address }: {
        type: string;
        address?: string;
    }) => void): void;
    onGetSmartAccountEnabledNetworks(callback: (networks: number[]) => void): void;
    getAvailableChainIds(): string[];
    rejectRpcRequests(): void;
    private appEvent;
    private setNewLastEmailLoginTime;
    private setSocialLoginSuccess;
    private setLoginSuccess;
    private deleteAuthLoginCache;
    private setLastUsedChainId;
    getLastUsedChainId(): number;
    private persistSmartAccountEnabledNetworks;
}
export interface W3mFrameProviderMethods {
    connectEmail: W3mFrameProvider['connectEmail'];
    connectOtp: W3mFrameProvider['connectOtp'];
    updateEmail: W3mFrameProvider['updateEmail'];
    updateEmailPrimaryOtp: W3mFrameProvider['updateEmailPrimaryOtp'];
    updateEmailSecondaryOtp: W3mFrameProvider['updateEmailSecondaryOtp'];
    getEmail: W3mFrameProvider['getEmail'];
    connectDevice: W3mFrameProvider['connectDevice'];
    connectSocial: W3mFrameProvider['connectSocial'];
    getSocialRedirectUri: W3mFrameProvider['getSocialRedirectUri'];
    connectFarcaster: W3mFrameProvider['connectFarcaster'];
    getFarcasterUri: W3mFrameProvider['getFarcasterUri'];
    syncTheme: W3mFrameProvider['syncTheme'];
    syncDappData: W3mFrameProvider['syncDappData'];
    switchNetwork: W3mFrameProvider['switchNetwork'];
}
export {};
