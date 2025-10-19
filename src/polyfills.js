import 'react-native-url-polyfill/auto';
import { Buffer } from 'buffer';
import * as Crypto from 'expo-crypto';

global.Buffer = Buffer;

// Crypto polyfill using expo-crypto (more secure!)
if (typeof global.crypto === 'undefined') {
    global.crypto = {
        getRandomValues: (array) => {
            const randomBytes = Crypto.getRandomBytes(array.length);
            for (let i = 0; i < array.length; i++) {
                array[i] = randomBytes[i];
            }
            return array;
        }
    };
}