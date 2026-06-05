/**
 * HUNA7-OS :: L4 VOXSCRIPT VM
 * Lexer → Parser → AST → Bytecode → Sandboxed Executor
 */

const VoxScriptVM = (() => {

  // ─── LEXER ───────────────────────────────────────────────
  const TOKEN = {
    PRINT: 'PRINT', LOG: 'LOG', SET: 'SET', IF: 'IF', ELSE: 'ELSE',
    WHILE: 'WHILE', END: 'END', CALL: 'CALL',
    STRING: 'STRING', NUMBER: 'NUMBER', IDENT: 'IDENT',
    EQUALS: 'EQUALS', SEMI: 'SEMI', COMPARE: 'COMPARE',
    PLUS: 'PLUS', MINUS: 'MINUS', LPAREN: 'LPAREN', RPAREN: 'RPAREN',
    EMIT: 'EMIT', READ: 'READ', WRITE: 'WRITE', EOF: 'EOF'
  };

  function lex(src) {
    const tokens = [];
    let i = 0;
    const kw = { print: TOKEN.PRINT, log: TOKEN.LOG, set: TOKEN.SET, if: TOKEN.IF,
                  else: TOKEN.ELSE, while: TOKEN.WHILE, end: TOKEN.END,
                  call: TOKEN.CALL, emit: TOKEN.EMIT, read: TOKEN.READ, write: TOKEN.WRITE };
    while (i < src.length) {
      const ch = src[i];
      if (/\s/.test(ch)) { i++; continue; }
      if (ch === '#') { while (i < src.length && src[i] !== '\n') i++; continue; }
      if (ch === '"') {
        let s = ''; i++;
        while (i < src.length && src[i] !== '"') s += src[i++];
        i++; tokens.push({ type: TOKEN.STRING, value: s }); continue;
      }
      if (/\d/.test(ch)) {
        let n = '';
        while (i < src.length && /[\d.]/.test(src[i])) n += src[i++];
        tokens.push({ type: TOKEN.NUMBER, value: parseFloat(n) }); continue;
      }
      if (/[a-zA-Z_]/.test(ch)) {
        let id = '';
        while (i < src.length && /[a-zA-Z0-9_.]/.test(src[i])) id += src[i++];
        tokens.push({ type: kw[id.toLowerCase()] || TOKEN.IDENT, value: id }); continue;
      }
      if (ch === '=' && src[i+1] === '=') { tokens.push({ type: TOKEN.COMPARE, value: '==' }); i += 2; continue; }
      if (ch === '=') { tokens.push({ type: TOKEN.EQUALS, value: '=' }); i++; continue; }
      if (ch === ';') { tokens.push({ type: TOKEN.SEMI, value: ';' }); i++; continue; }
      if (ch === '+') { tokens.push({ type: TOKEN.PLUS, value: '+' }); i++; continue; }
      if (ch === '-') { tokens.push({ type: TOKEN.MINUS, value: '-' }); i++; continue; }
      if (ch === '(') { tokens.push({ type: TOKEN.LPAREN, value: '(' }); i++; continue; }
      if (ch === ')') { tokens.push({ type: TOKEN.RPAREN, value: ')' }); i++; continue; }
      i++;
    }
    tokens.push({ type: TOKEN.EOF });
    return tokens;
  }

  // ─── PARSER → AST ─────────────────────────────────────────
  function parse(tokens) {
    let pos = 0;
    const peek = () => tokens[pos];
    const consume = () => tokens[pos++];
    const expect = (type) => {
      const t = consume();
      if (t.type !== type) throw new Error(`Expected ${type}, got ${t.type}`);
      return t;
    };

    function parseExpr() {
      const t = consume();
      if (t.type === TOKEN.STRING) return { nodeType: 'Literal', kind: 'string', value: t.value };
      if (t.type === TOKEN.NUMBER) return { nodeType: 'Literal', kind: 'number', value: t.value };
      if (t.type === TOKEN.IDENT) return { nodeType: 'Identifier', name: t.value };
      throw new Error('Unexpected token in expression: ' + t.type);
    }

    function parseStmt() {
      const t = peek();
      if (t.type === TOKEN.PRINT) {
        consume();
        const expr = parseExpr();
        if (peek().type === TOKEN.SEMI) consume();
        return { nodeType: 'Print', expr };
      }
      if (t.type === TOKEN.LOG) {
        consume();
        const expr = parseExpr();
        if (peek().type === TOKEN.SEMI) consume();
        return { nodeType: 'Log', expr };
      }
      if (t.type === TOKEN.EMIT) {
        consume();
        const name = parseExpr();
        if (peek().type === TOKEN.SEMI) consume();
        return { nodeType: 'Emit', name };
      }
      if (t.type === TOKEN.WRITE) {
        consume();
        const path = parseExpr();
        const content = parseExpr();
        if (peek().type === TOKEN.SEMI) consume();
        return { nodeType: 'Write', path, content };
      }
      if (t.type === TOKEN.READ) {
        consume();
        const path = parseExpr();
        if (peek().type === TOKEN.SEMI) consume();
        return { nodeType: 'Read', path };
      }
      if (t.type === TOKEN.SET) {
        consume();
        const name = expect(TOKEN.IDENT).value;
        expect(TOKEN.EQUALS);
        const expr = parseExpr();
        if (peek().type === TOKEN.SEMI) consume();
        return { nodeType: 'Set', name, expr };
      }
      if (t.type === TOKEN.IF) {
        consume();
        const cond = parseExpr();
        const body = [];
        while (peek().type !== TOKEN.END && peek().type !== TOKEN.ELSE && peek().type !== TOKEN.EOF) {
          body.push(parseStmt());
        }
        let elseBody = [];
        if (peek().type === TOKEN.ELSE) { consume(); while (peek().type !== TOKEN.END && peek().type !== TOKEN.EOF) elseBody.push(parseStmt()); }
        if (peek().type === TOKEN.END) consume();
        return { nodeType: 'If', cond, body, elseBody };
      }
      if (t.type === TOKEN.WHILE) {
        consume();
        const cond = parseExpr();
        const body = [];
        while (peek().type !== TOKEN.END && peek().type !== TOKEN.EOF) body.push(parseStmt());
        if (peek().type === TOKEN.END) consume();
        return { nodeType: 'While', cond, body };
      }
      consume();
      return { nodeType: 'Noop' };
    }

    const stmts = [];
    while (peek().type !== TOKEN.EOF) stmts.push(parseStmt());
    return { nodeType: 'Program', body: stmts };
  }

  // ─── BYTECODE COMPILER ────────────────────────────────────
  function compile(ast) {
    const ops = [];
    function emitOp(op, arg) { ops.push({ op, arg }); }

    function compileExpr(node) {
      if (node.nodeType === 'Literal') emitOp('PUSH', node.value);
      else if (node.nodeType === 'Identifier') emitOp('LOAD', node.name);
      else emitOp('PUSH', null);
    }

    function compileStmt(node) {
      if (!node) return;
      if (node.nodeType === 'Print') { compileExpr(node.expr); emitOp('PRINT', null); }
      else if (node.nodeType === 'Log') { compileExpr(node.expr); emitOp('SYSLOG', null); }
      else if (node.nodeType === 'Emit') { compileExpr(node.name); emitOp('EMIT', null); }
      else if (node.nodeType === 'Write') { compileExpr(node.path); compileExpr(node.content); emitOp('WRITE', null); }
      else if (node.nodeType === 'Read') { compileExpr(node.path); emitOp('READ', null); }
      else if (node.nodeType === 'Set') { compileExpr(node.expr); emitOp('STORE', node.name); }
      else if (node.nodeType === 'If') {
        compileExpr(node.cond);
        const jmpIdx = ops.length; emitOp('JMPF', null);
        node.body.forEach(compileStmt);
        const elseJmp = ops.length; emitOp('JMP', null);
        ops[jmpIdx].arg = ops.length;
        node.elseBody.forEach(compileStmt);
        ops[elseJmp].arg = ops.length;
      }
      else if (node.nodeType === 'While') {
        const loopStart = ops.length;
        compileExpr(node.cond);
        const jmpIdx = ops.length; emitOp('JMPF', null);
        node.body.forEach(compileStmt);
        emitOp('JMP', loopStart);
        ops[jmpIdx].arg = ops.length;
      }
    }

    ast.body.forEach(compileStmt);
    emitOp('HALT', null);
    return ops;
  }

  // ─── VM EXECUTOR ──────────────────────────────────────────
  function execute(bytecode, outputCallback) {
    const stack = [];
    const memory = {};
    let ip = 0;
    const output = [];
    const MAX_CYCLES = 10000;
    let cycles = 0;

    const push = v => stack.push(v);
    const pop = () => stack.pop();

    while (ip < bytecode.length) {
      if (++cycles > MAX_CYCLES) { output.push('[VM] Execution limit reached'); break; }
      const { op, arg } = bytecode[ip++];
      switch (op) {
        case 'PUSH': push(arg); break;
        case 'LOAD': push(memory[arg] !== undefined ? memory[arg] : null); break;
        case 'STORE': memory[arg] = pop(); break;
        case 'PRINT': {
          const v = pop();
          const msg = String(v !== null && v !== undefined ? v : '');
          output.push(msg);
          if (outputCallback) outputCallback({ type: 'print', value: msg });
          break;
        }
        case 'SYSLOG': {
          const v = pop();
          const msg = String(v !== null ? v : '');
          window.__HUNA7_VFS__.appendLog('[VoxScript] ' + msg);
          output.push('[log] ' + msg);
          if (outputCallback) outputCallback({ type: 'log', value: msg });
          break;
        }
        case 'EMIT': {
          const evtName = String(pop());
          window.__HUNA7_BUS__.emit({ type: evtName, payload: {}, source: 'voxscript' });
          output.push('[emit] ' + evtName);
          break;
        }
        case 'WRITE': {
          const content = String(pop());
          const path = String(pop());
          const res = window.__HUNA7_VFS__.write(path, content);
          output.push('[write] ' + path + (res.ok ? ' OK' : ' ERR: ' + res.error));
          break;
        }
        case 'READ': {
          const path = String(pop());
          const res = window.__HUNA7_VFS__.read(path);
          push(res.ok ? res.data.content : null);
          output.push('[read] ' + path + (res.ok ? ' OK' : ' ERR'));
          break;
        }
        case 'JMPF': { const v = pop(); if (!v) ip = arg; break; }
        case 'JMP': ip = arg; break;
        case 'HALT': ip = bytecode.length; break;
      }
    }
    return { ok: true, output };
  }

  function run(source, outputCallback) {
    try {
      const tokens = lex(source);
      const ast = parse(tokens);
      const bytecode = compile(ast);
      return execute(bytecode, outputCallback);
    } catch (e) {
      return { ok: false, error: e.message, output: ['[VoxScript Error] ' + e.message] };
    }
  }

  return Object.freeze({ run, lex, parse, compile });
})();

window.__HUNA7_VOX__ = VoxScriptVM;
