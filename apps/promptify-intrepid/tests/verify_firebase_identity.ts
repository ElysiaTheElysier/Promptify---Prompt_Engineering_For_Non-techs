import fs from 'node:fs';import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';
import {configureSqlPoolForTests} from '../src/services/cloudPostgresService';import {verifyFirebaseIdentity} from '../src/services/firebaseServerIdentityService';
if(!process.env.FIREBASE_AUTH_EMULATOR_HOST?.startsWith('127.0.0.1:'))throw Error('Auth tests must use local emulator only');
process.env.NODE_ENV='test';process.env.GOOGLE_CLOUD_PROJECT='demo-intrepid';
const db=new PGlite();await db.exec(fs.readFileSync('gcp/sql/001_baseline.sql','utf8'));
let tail=Promise.resolve();configureSqlPoolForTests({async connect(){const before=tail;let unlock!:()=>void;tail=new Promise<void>(r=>{unlock=r;});await before;return {async query(text:string,values:any[]=[]){return db.query<any>(text,values);},release:unlock};}});
const user='10000000-0000-4000-8000-000000000001',subject='20000000-0000-4000-8000-000000000001';await db.query('INSERT INTO users(id,email,full_name,auth_provider_id) VALUES($1,$2,$3,$4)',[user,'learner@example.test','Offline Identity Learner',subject]);
async function googleToken(sub:string,email:string,verified:boolean){const idToken=JSON.stringify({sub,email,email_verified:verified,name:'Offline Learner'});const response=await fetch('http://'+process.env.FIREBASE_AUTH_EMULATOR_HOST+'/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=fake-key',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestUri:'http://localhost',postBody:new URLSearchParams({id_token:idToken,providerId:'google.com'}).toString(),returnSecureToken:true})});const result=await response.json();assert.ok(response.ok,JSON.stringify(result));return result.idToken as string;}
const token=await googleToken('google-learner','learner@example.test',true),identity=await verifyFirebaseIdentity(token);assert.equal(identity.subject,subject);assert.equal(identity.userId,user);assert.notEqual(identity.firebaseUid,subject);
assert.equal((await verifyFirebaseIdentity(token)).subject,subject);assert.equal((await db.query<any>('SELECT count(*)::int n FROM gcp_identity_bindings')).rows[0].n,1);
const unverified=await googleToken('unverified','unverified@example.test',false);await assert.rejects(()=>verifyFirebaseIdentity(unverified),/Verified Google/);
await assert.rejects(()=>verifyFirebaseIdentity('not-a-token'));
const profile=(await db.query<any>('SELECT role,auth_provider_id FROM users WHERE id=$1',[user])).rows[0];assert.equal(profile.role,'learner');assert.equal(profile.auth_provider_id,subject);
await db.close();console.log('Firebase identity PASS: official Admin SDK + Auth Emulator + PostgreSQL binding; legacy UUID preserved, new Firebase UID mapped, no role change, invalid/unverified tokens denied.');
