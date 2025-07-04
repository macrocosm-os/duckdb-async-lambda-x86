"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Statement = exports.Database = exports.Connection = exports.OPEN_SHAREDCACHE = exports.OPEN_READWRITE = exports.OPEN_READONLY = exports.OPEN_PRIVATECACHE = exports.OPEN_FULLMUTEX = exports.OPEN_CREATE = exports.QueryResult = void 0;
/**
 * A wrapper around DuckDb node.js API that mirrors that
 * API but uses Promises instead of callbacks.
 *
 */
const os_1 = __importDefault(require("os"));
const util_1 = __importDefault(require("util"));
const isAmazonLinux2 = process.env.VERCEL || (os_1.default.release().includes("amzn2") && os_1.default.platform() === "linux" && os_1.default.arch() === "x64");
const duckdb = require(isAmazonLinux2 ? "duckdb-lambda-x86" : "duckdb");
exports.QueryResult = duckdb.QueryResult, exports.OPEN_CREATE = duckdb.OPEN_CREATE, exports.OPEN_FULLMUTEX = duckdb.OPEN_FULLMUTEX, exports.OPEN_PRIVATECACHE = duckdb.OPEN_PRIVATECACHE, exports.OPEN_READONLY = duckdb.OPEN_READONLY, exports.OPEN_READWRITE = duckdb.OPEN_READWRITE, exports.OPEN_SHAREDCACHE = duckdb.OPEN_SHAREDCACHE;
/*
 * Implmentation note:
 *   Although the method types exposed to users of this library
 *   are reasonably precise, the unfortunate excessive use of
 *   `any` in this utility function is because writing a precise
 *   type for a generic higher order function like
 *   `util.promisify` is beyond the current capabilities of the
 *   TypeScript type system.
 *   See https://github.com/Microsoft/TypeScript/issues/5453
 *   for detailed discussion.
 */
function methodPromisify(methodFn) {
    return util_1.default.promisify((target, ...args) => methodFn.bind(target)(...args));
}
const connAllAsync = methodPromisify(duckdb.Connection.prototype.all);
const connArrowIPCAll = methodPromisify(duckdb.Connection.prototype.arrowIPCAll);
const connExecAsync = methodPromisify(duckdb.Connection.prototype.exec);
const connPrepareAsync = methodPromisify(duckdb.Connection.prototype.prepare);
const connRunAsync = methodPromisify(duckdb.Connection.prototype.run);
const connUnregisterUdfAsync = methodPromisify(duckdb.Connection.prototype.unregister_udf);
const connRegisterBufferAsync = methodPromisify(duckdb.Connection.prototype.register_buffer);
const connUnregisterBufferAsync = methodPromisify(duckdb.Connection.prototype.unregister_buffer);
const connCloseAsync = methodPromisify(duckdb.Connection.prototype.close);
class Connection {
    constructor(ddb, resolve, reject) {
        this.conn = null;
        this.conn = new duckdb.Connection(ddb, (err, res) => {
            if (err) {
                this.conn = null;
                reject(err);
            }
            resolve(this);
        });
    }
    /**
     * Static method to create a new Connection object. Provided because constructors can not return Promises,
     * and the DuckDb Node.JS API uses a callback in the Database constructor
     */
    static create(db) {
        return new Promise((resolve, reject) => {
            new Connection(db.get_ddb_internal(), resolve, reject);
        });
    }
    async all(sql, ...args) {
        if (!this.conn) {
            throw new Error("Connection.all: uninitialized connection");
        }
        return connAllAsync(this.conn, sql, ...args);
    }
    async arrowIPCAll(sql, ...args) {
        if (!this.conn) {
            throw new Error("Connection.arrowIPCAll: uninitialized connection");
        }
        return connArrowIPCAll(this.conn, sql, ...args);
    }
    /**
     * Executes the sql query and invokes the callback for each row of result data.
     * Since promises can only resolve once, this method uses the same callback
     * based API of the underlying DuckDb NodeJS API
     * @param sql query to execute
     * @param args parameters for template query
     * @returns
     */
    each(sql, ...args) {
        if (!this.conn) {
            throw new Error("Connection.each: uninitialized connection");
        }
        this.conn.each(sql, ...args);
    }
    /**
     * Execute one or more SQL statements, without returning results.
     * @param sql queries or statements to executes (semicolon separated)
     * @param args parameters if `sql` is a parameterized template
     * @returns `Promise<void>` that resolves when all statements have been executed.
     */
    async exec(sql, ...args) {
        if (!this.conn) {
            throw new Error("Connection.exec: uninitialized connection");
        }
        return connExecAsync(this.conn, sql, ...args);
    }
    prepareSync(sql, ...args) {
        if (!this.conn) {
            throw new Error("Connection.prepareSync: uninitialized connection");
        }
        const ddbStmt = this.conn.prepare(sql, ...args);
        return Statement.create_internal(ddbStmt);
    }
    async prepare(sql, ...args) {
        if (!this.conn) {
            throw new Error("Connection.prepare: uninitialized connection");
        }
        const stmt = await connPrepareAsync(this.conn, sql, ...args);
        return Statement.create_internal(stmt);
    }
    runSync(sql, ...args) {
        if (!this.conn) {
            throw new Error("Connection.runSync: uninitialized connection");
        }
        // We need the 'as any' cast here, because run dynamically checks
        // types of args to determine if a callback function was passed in
        const ddbStmt = this.conn.run(sql, ...args);
        return Statement.create_internal(ddbStmt);
    }
    async run(sql, ...args) {
        if (!this.conn) {
            throw new Error("Connection.runSync: uninitialized connection");
        }
        const stmt = await connRunAsync(this.conn, sql, ...args);
        return Statement.create_internal(stmt);
    }
    register_udf(name, return_type, fun) {
        if (!this.conn) {
            throw new Error("Connection.register_udf: uninitialized connection");
        }
        this.conn.register_udf(name, return_type, fun);
    }
    async unregister_udf(name) {
        if (!this.conn) {
            throw new Error("Connection.unregister_udf: uninitialized connection");
        }
        return connUnregisterUdfAsync(this.conn, name);
    }
    register_bulk(name, return_type, fun) {
        if (!this.conn) {
            throw new Error("Connection.register_bulk: uninitialized connection");
        }
        this.conn.register_bulk(name, return_type, fun);
    }
    stream(sql, ...args) {
        if (!this.conn) {
            throw new Error("Connection.stream: uninitialized connection");
        }
        return this.conn.stream(sql, ...args);
    }
    arrowIPCStream(sql, ...args) {
        if (!this.conn) {
            throw new Error("Connection.arrowIPCStream: uninitialized connection");
        }
        return this.conn.arrowIPCStream(sql, ...args);
    }
    register_buffer(name, array, force) {
        if (!this.conn) {
            throw new Error("Connection.register_buffer: uninitialized connection");
        }
        return connRegisterBufferAsync(this.conn, name, array, force);
    }
    unregister_buffer(name) {
        if (!this.conn) {
            throw new Error("Connection.unregister_buffer: uninitialized connection");
        }
        return connUnregisterBufferAsync(this.conn, name);
    }
    async close() {
        if (!this.conn) {
            throw new Error("Connection.close: uninitialized connection");
        }
        await connCloseAsync(this.conn);
        this.conn = null;
        return;
    }
}
exports.Connection = Connection;
const dbCloseAsync = methodPromisify(duckdb.Database.prototype.close);
const dbAllAsync = methodPromisify(duckdb.Database.prototype.all);
const dbArrowIPCAll = methodPromisify(duckdb.Database.prototype.arrowIPCAll);
const dbExecAsync = methodPromisify(duckdb.Database.prototype.exec);
const dbPrepareAsync = methodPromisify(duckdb.Database.prototype.prepare);
const dbRunAsync = methodPromisify(duckdb.Database.prototype.run);
const dbUnregisterUdfAsync = methodPromisify(duckdb.Database.prototype.unregister_udf);
const dbSerializeAsync = methodPromisify(duckdb.Database.prototype.serialize);
const dbParallelizeAsync = methodPromisify(duckdb.Database.prototype.parallelize);
const dbWaitAsync = methodPromisify(duckdb.Database.prototype.wait);
const dbRegisterBufferAsync = methodPromisify(duckdb.Database.prototype.register_buffer);
const dbUnregisterBufferAsync = methodPromisify(duckdb.Database.prototype.unregister_buffer);
class Database {
    constructor(path, accessMode, resolve, reject) {
        this.db = null;
        if (typeof accessMode === "number") {
            accessMode = {
                access_mode: accessMode == duckdb.OPEN_READONLY ? "read_only" : "read_write"
            };
        }
        accessMode["duckdb_api"] = "nodejs-async";
        this.db = new duckdb.Database(path, accessMode, (err, res) => {
            if (err) {
                reject(err);
            }
            resolve(this);
        });
    }
    /**
     * Static method to create a new Database object. Provided because constructors can not return Promises,
     * and the DuckDb Node.JS API uses a callback in the Database constructor
     */
    /**
     * Static method to create a new Database object from the specified file. Provided as a static
     * method because some initialization may happen asynchronously.
     * @param path path to database file to open, or ":memory:"
     * @returns a promise that resolves to newly created Database object
     */
    static create(path, accessMode) {
        const trueAccessMode = accessMode ?? duckdb.OPEN_READWRITE; // defaults to OPEN_READWRITE
        return new Promise((resolve, reject) => {
            new Database(path, trueAccessMode, resolve, reject);
        });
    }
    async close() {
        if (!this.db) {
            throw new Error("Database.close: uninitialized database");
        }
        await dbCloseAsync(this.db);
        this.db = null;
        return;
    }
    // accessor to get internal duckdb Database object -- internal use only
    get_ddb_internal() {
        if (!this.db) {
            throw new Error("Database.get_ddb_internal: uninitialized database");
        }
        return this.db;
    }
    connect() {
        return Connection.create(this);
    }
    async all(sql, ...args) {
        if (!this.db) {
            throw new Error("Database.all: uninitialized database");
        }
        return dbAllAsync(this.db, sql, ...args);
    }
    async arrowIPCAll(sql, ...args) {
        if (!this.db) {
            throw new Error("Database.arrowIPCAll: uninitialized connection");
        }
        return dbArrowIPCAll(this.db, sql, ...args);
    }
    /**
     * Executes the sql query and invokes the callback for each row of result data.
     * Since promises can only resolve once, this method uses the same callback
     * based API of the underlying DuckDb NodeJS API
     * @param sql query to execute
     * @param args parameters for template query
     * @returns
     */
    each(sql, ...args) {
        if (!this.db) {
            throw new Error("Database.each: uninitialized database");
        }
        this.db.each(sql, ...args);
    }
    /**
     * Execute one or more SQL statements, without returning results.
     * @param sql queries or statements to executes (semicolon separated)
     * @param args parameters if `sql` is a parameterized template
     * @returns `Promise<void>` that resolves when all statements have been executed.
     */
    async exec(sql, ...args) {
        if (!this.db) {
            throw new Error("Database.exec: uninitialized database");
        }
        return dbExecAsync(this.db, sql, ...args);
    }
    prepareSync(sql, ...args) {
        if (!this.db) {
            throw new Error("Database.prepareSync: uninitialized database");
        }
        const ddbStmt = this.db.prepare(sql, ...args);
        return Statement.create_internal(ddbStmt);
    }
    async prepare(sql, ...args) {
        if (!this.db) {
            throw new Error("Database.prepare: uninitialized database");
        }
        const stmt = await dbPrepareAsync(this.db, sql, ...args);
        return Statement.create_internal(stmt);
    }
    runSync(sql, ...args) {
        if (!this.db) {
            throw new Error("Database.runSync: uninitialized database");
        }
        // We need the 'as any' cast here, because run dynamically checks
        // types of args to determine if a callback function was passed in
        const ddbStmt = this.db.run(sql, ...args);
        return Statement.create_internal(ddbStmt);
    }
    async run(sql, ...args) {
        if (!this.db) {
            throw new Error("Database.runSync: uninitialized database");
        }
        const stmt = await dbRunAsync(this.db, sql, ...args);
        return Statement.create_internal(stmt);
    }
    register_udf(name, return_type, fun) {
        if (!this.db) {
            throw new Error("Database.register: uninitialized database");
        }
        this.db.register_udf(name, return_type, fun);
    }
    async unregister_udf(name) {
        if (!this.db) {
            throw new Error("Database.unregister: uninitialized database");
        }
        return dbUnregisterUdfAsync(this.db, name);
    }
    stream(sql, ...args) {
        if (!this.db) {
            throw new Error("Database.stream: uninitialized database");
        }
        return this.db.stream(sql, ...args);
    }
    arrowIPCStream(sql, ...args) {
        if (!this.db) {
            throw new Error("Database.arrowIPCStream: uninitialized database");
        }
        return this.db.arrowIPCStream(sql, ...args);
    }
    serialize() {
        if (!this.db) {
            throw new Error("Database.serialize: uninitialized database");
        }
        return dbSerializeAsync(this.db);
    }
    parallelize() {
        if (!this.db) {
            throw new Error("Database.parallelize: uninitialized database");
        }
        return dbParallelizeAsync(this.db);
    }
    wait() {
        if (!this.db) {
            throw new Error("Database.wait: uninitialized database");
        }
        return dbWaitAsync(this.db);
    }
    interrupt() {
        if (!this.db) {
            throw new Error("Database.interrupt: uninitialized database");
        }
        return this.db.interrupt();
    }
    register_buffer(name, array, force) {
        if (!this.db) {
            throw new Error("Database.register_buffer: uninitialized database");
        }
        return dbRegisterBufferAsync(this.db, name, array, force);
    }
    unregister_buffer(name) {
        if (!this.db) {
            throw new Error("Database.unregister_buffer: uninitialized database");
        }
        return dbUnregisterBufferAsync(this.db, name);
    }
    registerReplacementScan(replacementScan) {
        if (!this.db) {
            throw new Error("Database.registerReplacementScan: uninitialized database");
        }
        return this.db.registerReplacementScan(replacementScan);
    }
}
exports.Database = Database;
const stmtRunAsync = methodPromisify(duckdb.Statement.prototype.run);
const stmtFinalizeAsync = methodPromisify(duckdb.Statement.prototype.finalize);
const stmtAllAsync = methodPromisify(duckdb.Statement.prototype.all);
const stmtArrowIPCAllAsync = methodPromisify(duckdb.Statement.prototype.arrowIPCAll);
class Statement {
    /**
     * Construct an async wrapper from a statement
     */
    constructor(stmt) {
        this.stmt = stmt;
    }
    /**
     * create a Statement object that wraps a duckdb.Statement.
     * This is intended for internal use only, and should not be called directly.
     * Use `Database.prepare()` or `Database.run()` to create Statement objects.
     */
    static create_internal(stmt) {
        return new Statement(stmt);
    }
    async all(...args) {
        return stmtAllAsync(this.stmt, ...args);
    }
    async arrowIPCAll(...args) {
        return stmtArrowIPCAllAsync(this.stmt, ...args);
    }
    /**
     * Executes the sql query and invokes the callback for each row of result data.
     * Since promises can only resolve once, this method uses the same callback
     * based API of the underlying DuckDb NodeJS API
     * @param args parameters for template query, followed by a NodeJS style
     *             callback function invoked for each result row.
     *
     * @returns
     */
    each(...args) {
        this.stmt.each(...args);
    }
    /**
     * Call `duckdb.Statement.run` directly without awaiting completion.
     * @param args arguments passed to duckdb.Statement.run()
     * @returns this
     */
    runSync(...args) {
        this.stmt.run(...args);
        return this;
    }
    async run(...args) {
        await stmtRunAsync(this.stmt, ...args);
        return this;
    }
    async finalize() {
        return stmtFinalizeAsync(this.stmt);
    }
    columns() {
        return this.stmt.columns();
    }
}
exports.Statement = Statement;
