#!/usr/bin/env node
"use strict";
// Separate account entry. Never copies an offline teaser or modifies Coach.
const fs=require('node:fs'),path=require('node:path');
const {publicKey,authRedirect,pageUrls}=require('./cloud-build');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'dist/player-cloud');
function build({url,anonKey,redirectTo}={}){
  let project;try{project=new URL(url);}catch{throw Error('Player build needs the public Supabase project URL.');}
  if(project.protocol!=='https:'||project.username||project.password||project.pathname!=='/'||project.search||project.hash||/[\s\\]/.test(url))throw Error('Use an HTTPS project origin without credentials.');
  if(!publicKey(anonKey))throw Error('Player build accepts only a publishable or anon public key, never a secret.');
  const callback=authRedirect(redirectTo);
  if(!callback||!/^https?:/.test(callback)||!new URL(callback).pathname.endsWith('/'))throw Error('Set the exact Player HTTPS address, ending in / (localhost is allowed for tests).');
  const contact=JSON.parse(fs.readFileSync(path.join(ROOT,'site/contact.json'),'utf8'));
  const config={url:project.origin,anonKey,redirectTo:callback,...pageUrls(contact.domain),accountSecurity:true};
  const files=new Map();
  for(const name of ['index.html','account.js','account.css'])files.set(name,fs.readFileSync(path.join(ROOT,'apps/player',name)));
  files.set('logo-gridlock.png',fs.readFileSync(path.join(ROOT,'web/logo-gridlock.png')));
  files.set('gridlock-cloud.js',fs.readFileSync(path.join(ROOT,'native/gridlock-cloud.js')));
  files.set('gridlock-security.js',fs.readFileSync(path.join(ROOT,'native/gridlock-security.js')));
  files.set('gridlock-config.js',Buffer.from('window.GRIDLOCK_CLOUD = '+JSON.stringify(config).replace(/</g,'\\u003c')+';\n'));
  // Fail before touching output; dist/player-cloud is the only owned target.
  for(let item=OUT;item!==ROOT;item=path.dirname(item))if(fs.existsSync(item)&&fs.lstatSync(item).isSymbolicLink())throw Error('Player output cannot be a symbolic link.');
  fs.mkdirSync(OUT,{recursive:true});
  for(const entry of fs.readdirSync(OUT,{withFileTypes:true})){
    if(entry.isDirectory()||entry.isSymbolicLink()||!files.has(entry.name))throw Error('Player output has unexpected files; use a clean checkout.');
  }
  for(const [name,data]of files)fs.writeFileSync(path.join(OUT,name),data);
  return {outDir:OUT,redirectTo:callback};
}
function options(env=process.env){
  if(env.GRINDX_BETA_NAME||env.GRINDX_BETA_UNTIL)throw Error('Player accounts use server permissions, not a tester build.');
  const c=JSON.parse(fs.readFileSync(path.join(ROOT,'site/contact.json'),'utf8')).cloud||{};
  return {url:env.GRINDX_SUPABASE_URL||c.url,anonKey:env.GRINDX_SUPABASE_ANON_KEY||c.anonKey,
    redirectTo:env.GRINDX_PLAYER_URL};
}
module.exports={build,options};
if(require.main===module){try{const r=build(options());console.log('Player account build: dist/player-cloud/');console.log('Required Auth redirect: '+r.redirectTo);console.log('Prepared only. Do not activate until the staging account flow passes.');}catch(e){console.error(e.message);process.exitCode=1;}}
