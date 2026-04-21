declare module "better-sqlite3-session-store" {
  import { Store } from "express-session";
  interface Options {
    client: unknown;
    expired?: { clear?: boolean; intervalMs?: number };
  }
  type SessionFactory = (session: typeof import("express-session")) => {
    new (options: Options): Store;
  };
  const factory: SessionFactory;
  export default factory;
}
