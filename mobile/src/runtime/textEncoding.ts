import { TextDecoder as CompatibleTextDecoder } from '@kayahr/text-encoding/no-encodings';
import '@kayahr/text-encoding/encodings/windows-1252';

try {
  new globalThis.TextDecoder('latin1');
} catch {
  globalThis.TextDecoder = CompatibleTextDecoder;
}
