"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendExpoPush = sendExpoPush;
const node_fetch_1 = __importDefault(require("node-fetch"));
async function sendExpoPush(to, title, body) {
    if (!to.startsWith('ExponentPushToken['))
        return;
    await (0, node_fetch_1.default)('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify({ to, title, body, sound: 'default' }),
    });
}
//# sourceMappingURL=push.js.map