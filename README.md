# HUNA7-OS (Not Updating) ~ could be old

A fully modular browser-based operating system simulation with kernel architecture, sandboxed processes, virtual filesystem, and VoxScript VM.

---

## Deploy to Vercel

1. Push this entire repo to GitHub
2. Import into [vercel.com](https://vercel.com)
3. Set **Framework Preset** to `Other`
4. Set **Output Directory** to `public`
5. Deploy — no build step required, fully static

---

## Architecture Overview

```
HUNA7-OS
├── L1  UI Shell         (shell/windowmanager.js)
├── L2  Kernel Core      (kernel/eventbus.js, kernel/process.js, kernel/api.js)
├── L3  Process Runtime  (kernel/process.js — scheduler + lifecycle)
├── L4  VoxScript VM     (vox/vm.js — Lexer→Parser→AST→Bytecode→Executor)
├── L5  Virtual FS       (vfs/vfs.js — localStorage-backed persistent VFS)
└── L6  App Runtime      (apps/registry.js — sandboxed app instances)
```

---

## File Tree

```
huna7-os/
├── vercel.json
├── README.md
└── public/
    ├── index.html              ← OS shell, boot sequence, CSS theme engine
    ├── kernel/
    │   ├── eventbus.js         ← L2: Event bus (sole communication backbone)
    │   ├── process.js          ← L2: Permission system + process scheduler
    │   └── api.js              ← L2: OS.* kernel API gateway
    ├── vfs/
    │   └── vfs.js              ← L5: Virtual filesystem (localStorage)
    ├── vox/
    │   └── vm.js               ← L4: VoxScript lexer/parser/AST/bytecode/VM
    ├── security/
    │   └── auth.js             ← Admin auth (salted SHA-256)
    ├── shell/
    │   └── windowmanager.js    ← L1: Window manager + drag/minimize/close
    └── apps/
        └── themes.js         Working Public Theme Library and code/preset theme editors
        └── registry.js         ← L6: Built-in app registry + launchers
```

---

## VoxScript Language

VoxScript is a sandboxed scripting language compiled to custom bytecode. It has no access to JavaScript, the DOM, or any external system except via approved kernel APIs.

### Syntax

```vox
# This is a comment
print "Hello, World!";
set x = 42;
log x;

write "/user/data.txt" "some content";
read "/user/data.txt";

emit "my.custom.event";

if x
  print "x is truthy";
else
  print "x is falsy";
end

while x
  set x = 0;
end
```

### Allowed API calls (kernel-enforced)

| API | Description |
|-----|-------------|
| `OS.file.read(path)` | Read a VFS file |
| `OS.file.write(path, content)` | Write a VFS file |
| `OS.window.create(opts)` | Open a new window |
| `OS.window.close(winId)` | Close a window |
| `OS.process.spawn(name, type)` | Spawn a process |
| `OS.system.log(msg)` | Append to kernel log |
| `OS.event.emit(type, payload)` | Emit kernel event |
| `OS.event.listen(type, fn)` | Listen to kernel events |

## Event Bus Schema

All inter-module communication goes through the kernel event bus:

```js
Event {
  type:      string   // e.g. "file.created", "app.launch"
  payload:   object
  source:    string   // originating module
  target:    string?  // optional target module
  timestamp: number
}
```

### System Events

| Event | Description |
|-------|-------------|
| `file.created` | File written/created |
| `file.updated` | File content updated |
| `file.deleted` | File removed |
| `file.read` | File accessed |
| `process.spawn` | New process started |
| `process.kill` | Process terminated |
| `app.launch` | Application opened |
| `window.create` | Window created |
| `window.opened` | Window appeared on desktop |
| `window.close` | Window closed |
| `vox.execute` | VoxScript execution requested |
| `auth.success` | Admin authenticated |
| `auth.revoked` | Admin session ended |

---

## Built-in Applications (Starter apps/registry.js)

| App | ID | Description |
|-----|----|-------------|
| Terminal | `terminal` | Full shell with kernel API access |
| Text Editor | `editor` | Edit .txt and .vox files |
| File Manager | `files` | Browse the virtual filesystem |
| VoxPad | `voxpad` | VoxScript IDE with live output |
| Navigator | `navigator` | Sandboxed iframe browser |
| System Monitor | `sysmon` | Process list + event log |
| Library | `library` | Placeholder for future extensions |

---

## Terminal Commands

```
help                    Show all commands
ls [path]               List files in directory
cat [path]              Read and display a file
write [path] [text]     Write text to file
ps                      List running processes
vox [path]              Execute a .vox file
run [code]              Run inline VoxScript
clear                   Clear terminal output
log                     Show kernel log (last 30 lines)
uptime                  Show system uptime
sysinfo                 System version + process count
admin                   Authenticate as administrator
```

---

## Extending the OS

To add a new app:

```js
AppRegistry.register('myapp', {
  name: 'My App',
  width: 600,
  height: 400,
  render(body, pid) {
    body.innerHTML = '<div>Hello from My App</div>';
  }
});
```

Then launch it from anywhere:

```js
AppRegistry.launch('myapp');
// or via kernel API:
OS.event.emit('app.launch', { id: 'myapp' });
```
