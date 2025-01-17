import type { CaipNetworkId } from '@reown/appkit-common';
import { W3mFrameProvider } from '@reown/appkit-wallet';
interface W3mFrameProviderConfig {
    projectId: string;
    chainId?: number | CaipNetworkId;
    onTimeout?: () => void;
}
export declare class W3mFrameProviderSingleton {
    private static instance;
    private constructor();
    static getInstance({ projectId, chainId, onTimeout }: W3mFrameProviderConfig): W3mFrameProvider;
}
export {};
