import assert from 'node:assert/strict';
import {describeSignInError} from '../src/services/authErrorService';
assert.match(describeSignInError({code:'invalid_credentials',status:400}),/mật khẩu/);
assert.match(describeSignInError({message:'Invalid API key',status:401}),/Khóa Supabase/);
assert.match(describeSignInError({name:'AuthRetryableFetchError',message:'Failed to fetch'}),/không kết nối/);
assert.match(describeSignInError({status:503}),/máy chủ/);
assert.ok(!describeSignInError({message:'secret-password',code:'secret-password'}).includes('secret-password'));
console.log('Auth errors distinguish credentials/config/network without exposing arbitrary messages.');
