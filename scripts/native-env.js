"use strict";
/* Some restricted Windows environments cannot query the account database.
 * Ionic only uses userInfo to determine the login shell; environment fallbacks
 * allow its CLI to work there without changing the installed dependency. */
const os = require("node:os");
const original = os.userInfo;
os.userInfo = function (...args) {
  try { return original.apply(this, args); }
  catch (error) {
    if (process.platform !== "win32" || !process.env.USERPROFILE) throw error;
    return { username: process.env.USERNAME || "builder", homedir: process.env.USERPROFILE, shell: process.env.COMSPEC || "cmd.exe", uid: -1, gid: -1 };
  }
};
