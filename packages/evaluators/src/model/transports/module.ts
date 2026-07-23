import { pathToFileURL } from "node:url";
import type { ProviderTransport } from "../transport.js";

// テスト・拡張用: default export が ProviderTransport を返すモジュールを読み込む。
// 信頼境界は capture プロファイルと同じ「利用者が明示指定したローカルコード」。
export async function createModuleTransport(
  modulePath: string,
): Promise<ProviderTransport> {
  const mod = (await import(pathToFileURL(modulePath).href)) as {
    default: () => ProviderTransport;
  };
  if (typeof mod.default !== "function") {
    throw new Error(
      `transport module must default-export a factory: ${modulePath}`,
    );
  }
  return mod.default();
}
