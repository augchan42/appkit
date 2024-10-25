import { AppKit } from '../src/client.js';
import { getAppKit } from '../src/library/vue/index.js';
import { CoreHelperUtil } from '@reown/appkit-core';
import { PACKAGE_VERSION } from './constants.js';
// -- Views ------------------------------------------------------------
export * from '@reown/appkit-scaffold-ui';
// -- Hooks ------------------------------------------------------------
export * from '../src/library/vue/index.js';
// -- Utils & Other -----------------------------------------------------
export * from '../src/utils/index.js';
export { CoreHelperUtil, AccountController } from '@reown/appkit-core';
let modal = undefined;
export function createAppKit(options) {
    if (!modal) {
        modal = new AppKit({
            ...options,
            sdkVersion: CoreHelperUtil.generateSdkVersion(options.adapters ?? [], 'html', PACKAGE_VERSION)
        });
        getAppKit(modal);
    }
    return modal;
}
export { AppKit };
// -- Hooks ------------------------------------------------------------
export * from '../src/library/vue/index.js';
//# sourceMappingURL=vue.js.map