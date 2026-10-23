import { supabase } from './supabaseClient';
import type { ProductSnapshot } from '../types/production';
import { getProductLanguage, productText, productErrorText } from './productI18nService';

export class ProductRequestError extends Error {
  constructor(message: string, public status: number, public requestId?: string) { super(message); }
}
export async function productRequest<T = any>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new ProductRequestError(productText('signIn'), 401);
  let response: Response;
  try {
    response = await fetch('/api/product', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ ...payload, action, language: getProductLanguage() }), signal: AbortSignal.timeout(65000) });
  } catch { throw new ProductRequestError(productText('unknownOutcome'), 0, payload.requestId as string); }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = action === 'judge' && typeof result.error === 'string' ? result.error.slice(0,1000) : '';
    throw new ProductRequestError(detail ? `${productErrorText(response.status)} ${detail}` : productErrorText(response.status), response.status, payload.requestId as string);
  }
  return result as T;
}
export const loadProduct = async (classId?: string) => {
  if(localStorage.getItem('promptify-basic-enrollment')==='requested'){
    try {
      const enrollment=await productRequest<{classId:string}>('enrollBasic');
      localStorage.removeItem('promptify-basic-enrollment');
      classId=enrollment.classId;
    } catch(error) {
      // Existing staff keep their assigned workspace; only a definitive role denial
      // cancels the Basic request. Transient errors remain retryable.
      if(!(error instanceof ProductRequestError)||error.status!==403)throw error;
      localStorage.removeItem('promptify-basic-enrollment');
    }
  }
  return productRequest<ProductSnapshot>('snapshot',{classId});
};
